import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import AWS from 'aws-sdk';

AWS.config.update({ region: 'us-east-1' });
const ec2 = new AWS.EC2();


export const runTerraform = async (req, res) => {
  const { user_id, instance_name, instance_type } = req.body;

  if (!user_id || !instance_name || !instance_type) {
    return res.status(400).send('Faltan datos: user_id o instance_name o instance_type');
  }

  const __dirname = path.resolve();
  const templatePath = path.join(__dirname, 'src/templates/main_template.tf');
  const userFolder = path.join(__dirname, 'src/terraform_users', user_id);
  const userTFFile = path.join(userFolder, `${user_id}.tf`);

  try {
    // Validate if infrastructure already exists
    if (fs.existsSync(userFolder)) {
      return res.status(409).json({
        message: `There is already an instance for the user.`
      });
    } else {
      fs.mkdirSync(userFolder, { recursive: true });
    }

    // Generate file .tf from template
    let template = fs.readFileSync(templatePath, 'utf-8');
    template = template.replace(/\${user_id}/g, user_id)
      .replace(/\${instance_name}/g, instance_name)
      .replace(/\${instance_type}/g, instance_type);

    fs.writeFileSync(userTFFile, template);
  } catch (err) {
    return res.status(500).send({message: "Error generating Terraform template"});
  }

  // Execute Terraform
  exec(`cd ${userFolder} && terraform init && terraform apply -auto-approve`, async (error, stdout, stderr) => {
    if (error) {
      return res.status(500).send({message: "Error generating Terraform"});
    }

    try {
      // Get instance Id from terraform output
      exec(`cd ${userFolder} && terraform output -json`, async (outputError, outputStdout, outputStderr) => {
        if (outputError) {
          return res.status(500).send({message: "Terraform generated but error to get Outputs"});
        }

        const outputJson = JSON.parse(outputStdout);
        const instanceId = outputJson.instance_id?.value;

        if (!instanceId) {
          return res.status(500).send({message: "Couldn't get the instance id"});
        }

        try {
          // Wait the running state of the instance
          await ec2.waitFor('instanceRunning', {
            InstanceIds: [instanceId],
            $waiter: { delay: 10, maxAttempts: 50 }
          }).promise();

          // Wait to have the checks
          await ec2.waitFor('instanceStatusOk', {
            InstanceIds: [instanceId],
            $waiter: { delay: 10, maxAttempts: 50 }
          }).promise();

          // Get information updated
          const result = await ec2.describeInstances({ InstanceIds: [instanceId] }).promise();
          const instance = result.Reservations[0]?.Instances[0];

          if (!instance) {
            return res.status(404).send({message: "Instance not found"});
          }

          // Get name from tag "Name"
          const nameTag = instance.Tags?.find(tag => tag.Key === 'Name');
          const instanceName = nameTag?.Value || 'N/A';

          return res.status(200).json({
            InstanceId: instance.InstanceId,
            Name: instanceName,
            PrivateIp: instance.PrivateIpAddress,
            State: instance.State?.Name,
            Platform: instance.Platform || 'linux',
            LaunchTime: instance.LaunchTime,
            hierarchy: "principal"
          });

        } catch (err) {
          return res.status(500).send({message: "Error to get the instance id"});
        }
      });

    } catch (err) {
      return res.status(500).send({message: "Error post Terraform application"});
    }
  });
};


export const destroyTerraform = async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).send({message: "User id is require"});
  }

  const __dirname = path.resolve();
  const userFolder = path.join(__dirname, 'src/terraform_users', user_id);

  if (!fs.existsSync(userFolder)) {
    return res.status(404).send({message: "Infrastructure not found for the user"});
  }

  exec(`cd ${userFolder} && terraform destroy -auto-approve`, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).send({message: "Error to destroy the infrastructure"});
    }

    console.log(`Infrastructure successfully destroyed: ${stdout}`);

    try {
      // Delete folder user
      fs.rmSync(userFolder, { recursive: true, force: true });
      console.log(`Folder deleted: ${userFolder}`);
    } catch (deleteErr) {
      console.error("Error al eliminar carpeta:", deleteErr);
      return res.status(500).send({message: "Infrastructure successfully destroyed, but error to delete folder"});
    }

    return res.status(200).json({
      message: "Infrastructure successfully destroyed"
    });
  });
};
