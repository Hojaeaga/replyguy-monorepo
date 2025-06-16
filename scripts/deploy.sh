#!/bin/bash
set -e

echo "🚀 ReplyGuy Simple AWS Deployment Script"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform is not installed. Please install it first."
    exit 1
fi

# Get user inputs
read -p "Enter your AWS Key Pair name (for EC2 SSH access): " KEY_NAME
read -p "Enter your AWS region [ap-south-1]: " AWS_REGION
AWS_REGION=${AWS_REGION:-ap-south-1}

echo "📋 Deployment Configuration:"
echo "   AWS Region: $AWS_REGION"
echo "   Key Pair: $KEY_NAME"
echo ""

# Navigate to terraform directory
cd infra/aws

# Initialize Terraform
echo "🔧 Initializing Terraform..."
terraform init

# Plan deployment
echo "📝 Planning deployment..."
terraform plan -var="key_name=$KEY_NAME" -var="aws_region=$AWS_REGION"

# Ask for confirmation
read -p "Do you want to proceed with deployment? (y/N): " CONFIRM
if [[ $CONFIRM != [yY] ]]; then
    echo "❌ Deployment cancelled."
    exit 0
fi

# Apply deployment
echo "🚀 Deploying infrastructure..."
terraform apply -var="key_name=$KEY_NAME" -var="aws_region=$AWS_REGION" -auto-approve

# Get outputs
INSTANCE_IP=$(terraform output -raw instance_ip)
SSH_COMMAND=$(terraform output -raw ssh_command)

echo ""
echo "✅ Deployment Complete!"
echo "🌐 Instance IP: $INSTANCE_IP"
echo "🔑 SSH Command: $SSH_COMMAND"
echo ""
echo "📝 Next Steps:"
echo "1. SSH into the instance: $SSH_COMMAND"
echo "2. Navigate to the project: cd replyguy-monorepo"
echo "3. Create .env file with your secrets"
echo "4. Build and run: docker-compose -f docker-compose.prod.yml up --build -d"
echo "5. Your API will be available at: http://$INSTANCE_IP"
echo ""
echo "🔗 API Endpoints:"
echo "   Health: http://$INSTANCE_IP/health"
echo "   AI Agent: http://$INSTANCE_IP/api/"
echo "   Webhooks: http://$INSTANCE_IP/webhook"
echo "   Docs: http://$INSTANCE_IP/docs"