provider "aws" {
  region = "us-east-1"
}

output "instance_id" {
  value = aws_instance.artist_vred.id
}

resource "aws_instance" "artist_vred" {
  ami                         = "ami-0ebe504548e3d2834"
  instance_type               = "${instance_type}"
  subnet_id                   = "subnet-0f62097bbc46912e4"
  vpc_security_group_ids      = ["sg-098a13f6d8e8a6247"]
  iam_instance_profile        = "Domain-VW-AWS-Join"
  associate_public_ip_address = false

  tags = {
  Name = "${instance_name}"
  User = "${user_id}"
}

}


# resource "aws_instance" "artist_vred" {
#   ami                         = "ami-0fad390eed3895e1d"
#   instance_type               = "g4dn.xlarge"
#   subnet_id                   = "subnet-07bd226856f0fcfa2"
#   vpc_security_group_ids      = ["sg-0470815ad29bf487c"]
#   iam_instance_profile        = "artist-vred-instance-role"
#   associate_public_ip_address = false

#   user_data = <<-EOF
#     <powershell>
#     # Esperar red
#     Start-Sleep -Seconds 60

#     # Parámetros del dominio
#     $domain = "yourdomain.local"
#     $username = "yourdomain\\admin"
#     $password = ConvertTo-SecureString "YourStrongPassword123" -AsPlainText -Force
#     $credential = New-Object System.Management.Automation.PSCredential($username, $password)

#     # Unir al dominio
#     Add-Computer -DomainName $domain -Credential $credential -Restart -Force
#     </powershell>
#   EOF

#   tags = {
#     Name = "POC-VRED-Artist"
#   }
# }


# resource "aws_instance" "artist_vred" {
#   ami                         = "ami-0fad390eed3895e1d"
#   instance_type               = "g4dn.xlarge"  
#   subnet_id                   = "subnet-07bd226856f0fcfa2"
#   vpc_security_group_ids      = ["sg-0470815ad29bf487c"]
#   iam_instance_profile        = "artist-vred-instance-role"
#   associate_public_ip_address = false

#   tags = {
#     Name = "POC-VRED-Artist"
#   }
# }
