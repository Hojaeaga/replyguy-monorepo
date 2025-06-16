# ReplyGuy AWS Deployment Guide

## Simple Single-Instance Deployment

This guide helps you deploy ReplyGuy to AWS using a single EC2 instance with minimal configuration.

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Terraform** installed
4. **EC2 Key Pair** created in your target region

## Quick Deployment

### Step 1: Deploy Infrastructure

```bash
# Run the deployment script
./scripts/deploy.sh
```

This will:
- Create an EC2 instance (t3.medium)
- Set up security groups
- Assign an Elastic IP
- Install Docker and Docker Compose

### Step 2: Configure the Server

SSH into your instance and run the setup script:

```bash
# SSH into the instance (command provided by deploy script)
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_INSTANCE_IP

# Run the setup script
./replyguy-monorepo/scripts/setup-server.sh
```

### Step 3: Configure Environment

Edit the `.env` file with your actual values:

```bash
nano .env
```

**Required environment variables:**
- `OPENAI_API_KEY` - Your OpenAI API key
- `NEYNAR_API_KEY` - Your Neynar API key
- `NEYNAR_SIGNER_UUID` - Your Neynar signer UUID
- `NEYNAR_WEBHOOK_ID` - Your Neynar webhook ID
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key

### Step 4: Start Services

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Service Architecture

```
Internet → Nginx (Port 80) → {
  /webhook → Ingestion Service (Port 3001)
  /api/    → AI Agent (Port 8000)
  /docs    → AI Agent (Port 8000)
  /health  → Health Check
}

Background:
- Worker Service (internal)
- Redis (Port 6379, internal)
```

## API Endpoints

Once deployed, your API will be available at:

- **Health Check**: `http://YOUR_IP/health`
- **AI Agent API**: `http://YOUR_IP/api/`
- **Webhook Ingestion**: `http://YOUR_IP/webhook`
- **API Documentation**: `http://YOUR_IP/docs`

## Monitoring & Logs

### View all service logs:
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### View specific service logs:
```bash
docker-compose -f docker-compose.prod.yml logs -f ingestion
docker-compose -f docker-compose.prod.yml logs -f worker
docker-compose -f docker-compose.prod.yml logs -f ai-agent
```

### Check service status:
```bash
docker-compose -f docker-compose.prod.yml ps
```

## Updating the Application

To update to the latest version:

```bash
# Pull latest code
git pull origin main

# Rebuild and restart services
docker-compose -f docker-compose.prod.yml up --build -d
```

## Cost Estimation

**Monthly AWS costs (ap-south-1 region):**
- EC2 t3.medium: ~$25/month
- Elastic IP: ~$3.6/month
- Data transfer: ~$5-10/month
- **Total: ~$35-40/month**

## Security Considerations

1. **SSH Access**: Only use key-based authentication
2. **Firewall**: Security groups restrict access to necessary ports only
3. **Environment Variables**: Never commit `.env` to version control
4. **Updates**: Regularly update the system and Docker images

## Troubleshooting

### Services not starting:
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

### Port conflicts:
```bash
# Check what's using ports
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :3001
```

### Out of memory:
```bash
# Check memory usage
free -h
docker stats
```

Consider upgrading to t3.large if needed.

## Cleanup

To destroy the infrastructure:

```bash
cd infra/aws
terraform destroy -var="key_name=YOUR_KEY_NAME" -var="aws_region=ap-south-1"
```

## Support

For issues and questions, check the logs first, then refer to the main repository documentation.