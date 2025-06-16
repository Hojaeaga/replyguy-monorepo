#!/bin/bash
# Run this script on the EC2 instance after deployment

set -e

echo "🔧 Setting up ReplyGuy on EC2 instance..."

# Update system
sudo apt-get update

# Install Docker and Docker Compose if not already installed
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    sudo apt-get install -y docker.io
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
fi

if ! command -v docker-compose &> /dev/null; then
    echo "📦 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Clone or update repository
if [ ! -d "replyguy-monorepo" ]; then
    echo "📥 Cloning repository..."
    git clone https://github.com/megabyte0x/replyguy-monorepo.git
else
    echo "🔄 Updating repository..."
    cd replyguy-monorepo
    git pull origin main
    cd ..
fi

cd replyguy-monorepo

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp env.template .env
    echo ""
    echo "⚠️  IMPORTANT: Edit the .env file with your actual values:"
    echo "   nano .env"
    echo ""
    echo "Required values to update:"
    echo "   - OPENAI_API_KEY"
    echo "   - NEYNAR_API_KEY"
    echo "   - NEYNAR_SIGNER_UUID"
    echo "   - NEYNAR_WEBHOOK_ID"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_ANON_KEY"
    echo ""
    read -p "Press Enter after updating .env file..."
fi

# Build and start services
echo "🚀 Building and starting services..."
docker-compose -f docker-compose.prod.yml up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check service status
echo "📊 Service Status:"
docker-compose -f docker-compose.prod.yml ps

# Get instance public IP
INSTANCE_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

echo ""
echo "✅ Setup Complete!"
echo "🌐 Your ReplyGuy API is running at:"
echo "   Health: http://$INSTANCE_IP/health"
echo "   AI Agent: http://$INSTANCE_IP/api/"
echo "   Webhooks: http://$INSTANCE_IP/webhook"
echo "   Docs: http://$INSTANCE_IP/docs"
echo ""
echo "📝 To check logs:"
echo "   docker-compose -f docker-compose.prod.yml logs -f"
echo "📝 To restart services:"
echo "   docker-compose -f docker-compose.prod.yml restart"