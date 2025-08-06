import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import AWS from 'aws-sdk';

AWS.config.update({ region: 'us-east-1' });
const ec2 = new AWS.EC2();

export const runTerraform = async (req, res) => {
  const { user_id, instance_name, instance_type } = req.body;

  if (!user_id || !instance_name || !instance_type) {
    return res.status(400).send('Faltan datos: user_id o instance_name');
  }

  const __dirname = path.resolve();
  const templatePath = path.join(__dirname, 'src/templates/main_template.tf');
  const userFolder = path.join(__dirname, 'src/terraform_users', user_id);
  const userTFFile = path.join(userFolder, `${user_id}.tf`);

  try {
    if (!fs.existsSync(userFolder)) {
      fs.mkdirSync(userFolder, { recursive: true });
    }

    let template = fs.readFileSync(templatePath, 'utf-8');
    template = template.replace(/\${user_id}/g, user_id)
                   .replace(/\${instance_name}/g, instance_name)
                   .replace(/\${instance_type}/g, instance_type);


    fs.writeFileSync(userTFFile, template);
  } catch (err) {
    console.error("Error preparando plantilla:", err);
    return res.status(500).send("Error generando Terraform para el usuario.");
  }
  
  exec(`cd ${userFolder} && terraform init && terraform apply -auto-approve`, async (error, stdout, stderr) => {
    console.log("Ejecutandose...");
    if (error) {
      console.error(`Error ejecutando Terraform: ${error.message}`);
      return res.status(500).send(`Error ejecutando Terraform: ${stderr}`);
    }

    console.log(`Terraform ejecutado correctamente: ${stdout}`);

    try {
      const data = await ec2.describeInstances({}).promise();
      const instanceDNS = [];

      data.Reservations.forEach(reservation => {
        reservation.Instances.forEach(instance => {
          if (instance.Platform === "windows" && instance.PublicDnsName) {
            instanceDNS.push(instance.PublicDnsName);
          }
        });
      });

      return res.status(200).json({
        instanceDNS
      });

    } catch (err) {
      console.error("Error al obtener estado de instancias:", err);
      return res.status(500).send("Infraestructura creada, pero error al consultar instancias.");
    }
  });
};


export const destroyTerraform = async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).send('Falta user_id');
  }

  const __dirname = path.resolve();
  const userFolder = path.join(__dirname, 'src/terraform_users', user_id);

  if (!fs.existsSync(userFolder)) {
    return res.status(404).send("No se encontró infraestructura para este usuario.");
  }

  exec(`cd ${userFolder} && terraform destroy -auto-approve`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error ejecutando Terraform destroy: ${error.message}`);
      return res.status(500).send(`Error ejecutando destroy: ${stderr}`);
    }

    console.log(`Terraform destroy ejecutado correctamente: ${stdout}`);

    try {
      // Delete folder user
      fs.rmSync(userFolder, { recursive: true, force: true });
      console.log(`Carpeta eliminada: ${userFolder}`);
    } catch (deleteErr) {
      console.error("Error al eliminar carpeta:", deleteErr);
      return res.status(500).send("Infraestructura destruida, pero error al eliminar carpeta.");
    }

    return res.status(200).json({
      message: "Infraestructura destruida y carpeta eliminada correctamente"
    });
  });
};
