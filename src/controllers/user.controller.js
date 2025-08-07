import AWS from 'aws-sdk';

AWS.config.update({ region: 'us-east-1' });
const ec2 = new AWS.EC2();

export const getUserResources = async (req, res) => {
  const { user_id } = req.params; 

  if (!user_id) {
    return res.status(400).json({ error: "Falta user_id" });
  }

  const params = {
    Filters: [
      {
        Name: "tag:User",
        Values: [user_id]
      },
      {
        Name: "instance-state-name",
        Values: ["running"]
      }
    ]
  };

  try {
    const data = await ec2.describeInstances(params).promise();

    if (!data.Reservations.length) {
      return res.status(404).json({ message: "No se encontraron instancias para el usuario." });
    }

    const instances = data.Reservations.flatMap(reservation =>
      reservation.Instances.map(instance => ({
        InstanceId: instance.InstanceId,
        Name: instance.Tags.find(tag => tag.Key === "Name")?.Value || "",
        PrivateIp: instance.PrivateIpAddress,
        PublicIp: instance.PublicIpAddress,
        State: instance.State.Name,
        Platform: instance.Platform || "windows",
        LaunchTime: instance.LaunchTime,
        "hierarchy": "principal"
      }))
    );

    return res.status(200).json({ user_id, instances });

  } catch (error) {
    console.error("Error al consultar recursos del usuario:", error);
    return res.status(500).json({ error: "Error consultando instancias EC2" });
  }
};
