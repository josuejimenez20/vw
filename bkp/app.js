const express = require('express');
const AWS = require('aws-sdk');
const cors = require('cors');
const { exec } = require('child_process');

AWS.config.update({ region: 'us-east-1' });
const ec2 = new AWS.EC2();

const app = express();

app.use(cors());

app.use(express.json());

app.post('/run-terraform', async (req, res) => {
    const { instances } = req.body;

    if (!instances) {
        return res.status(400).send('Número de instancias no proporcionado.');
    }

    console.log(instances);

    let terraformPath = "";

    switch (instances) {
        case 1:
            terraformPath = "/home/ec2-user/backend-manager-infrastructure/node1"
            break;
        case 2:
            terraformPath = "/home/ec2-user/backend-manager-infrastructure/node2"
            break;
        case 3:
            terraformPath = "/home/ec2-user/backend-manager-infrastructure/node3"
            break;
        default:
    }

    console.log(terraformPath);


    exec(`cd ${terraformPath} && terraform init && terraform plan && terraform apply -auto-approve`, async (error, stdout, stderr) => {
        if (error) {
            console.error(`Error ejecutando Terraform: ${error.message}`);
            return res.status(500).send(`Error ejecutando Terraform: ${stderr}`);
        }

        console.log(`Terraform ejecutado correctamente: ${stdout}`);

        let instanceDNS = [];
        const params = {};

        try {
            const data = await ec2.describeInstances(params).promise();
            const instanceIds = [];
            data.Reservations.forEach(reservation => {
                reservation.Instances.forEach(instance => {
                    if (instance.Platform === "windows" && instance.PublicDnsName) {
                        console.log("Public DNS (Windows):", instance.PublicDnsName);
                        instanceDNS.push(instance.PublicDnsName);
                    }
                    instanceIds.push(instance.InstanceId);
                });
            });

            let instancesReady = false;
            while (!instancesReady) {
                const statusData = await ec2.describeInstanceStatus({
                    InstanceIds: instanceIds,
                }).promise();

                const instanceStatuses = statusData.InstanceStatuses;

                instancesReady = instanceStatuses.every(status => {
                    return status.InstanceStatus.Status === 'ok' && status.SystemStatus.Status === 'ok';
                });

                if (!instancesReady) {
                    console.log('Esperando que todas las instancias estén listas...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }

            return res.status(200).json({
                message: "Infraestructura de terraform creada y todas las instancias están listas",
                user: "newuser",
                password: "J&D_9P40_MNJD",
                instanceDNS
            });

        } catch (err) {
            console.log("Error al obtener el estado de las instancias:", err);
            return res.status(500).send("Error al obtener el estado de las instancias.");
        }
    });
});

app.post('/destroy-terraform', async (req, res) => {
    const { instances } = req.body;

    if (!instances) {
        return res.status(400).send('Número de instancias no proporcionado.');
    }

    console.log(instances);

    let terraformPath = "";

    switch (instances) {
        case 1:
            terraformPath = "/home/ec2-user/backend-manager-infrastructure/node1"
            break;
        case 2:
            terraformPath = "/home/ec2-user/backend-manager-infrastructure/node2"
            break;
        case 3:
            terraformPath = "/home/ec2-user/backend-manager-infrastructure/node3"
            break;
        default:
    }

    console.log(terraformPath);


    exec(`cd ${terraformPath} && terraform destroy -auto-approve`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error ejecutando Terraform: ${error.message}`);
            return res.status(500).send(`Error ejecutando Terraform: ${stderr}`);
        }
        console.log(`Terraform ejecutado correctamente: ${stdout}`);
        return res.status(200).json({
            message: "Infraestructura de terraform destruida"
        })
    });
});

app.listen(3000, () => {
    console.log('Servidor escuchando en el puerto 3000');
});