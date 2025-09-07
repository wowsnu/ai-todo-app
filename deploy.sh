#!/bin/bash

# AI Todo App - AWS EC2 Deployment Script
# This script automates the deployment process to AWS EC2

set -e  # Exit on any error

echo "🚀 Starting AI Todo App deployment to AWS EC2..."

# Configuration
APP_NAME="ai-todo-app"
DOCKER_IMAGE="$APP_NAME:latest"
REGISTRY_URL="your-registry-url"  # Update with your Docker registry
EC2_HOST="${EC2_HOST:-your-ec2-instance-ip}"
EC2_USER="${EC2_USER:-ubuntu}"
EC2_KEY="${EC2_KEY:-~/.ssh/your-key.pem}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${GREEN}==>${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}WARNING:${NC} $1"
}

print_error() {
    echo -e "${RED}ERROR:${NC} $1"
}

# Step 1: Pre-deployment checks
print_step "Running pre-deployment checks..."

if [ ! -f "package.json" ]; then
    print_error "package.json not found. Are you in the right directory?"
    exit 1
fi

if [ ! -f "server/package.json" ]; then
    print_error "Backend package.json not found."
    exit 1
fi

if [ ! -f "server/.env" ]; then
    print_warning "Backend .env file not found. Make sure to set environment variables on EC2."
fi

# Step 2: Build the application
print_step "Building React frontend..."
npm run build

print_step "Installing backend dependencies..."
cd server && npm ci --only=production && cd ..

# Step 3: Build Docker image
print_step "Building Docker image..."
docker build -t $DOCKER_IMAGE .

# Step 4: Test the Docker image locally (optional)
if [ "$1" = "--test-local" ]; then
    print_step "Testing Docker image locally..."
    docker run -d --name ${APP_NAME}-test -p 3000:3000 -p 3001:3001 $DOCKER_IMAGE
    echo "Local test container started. Check http://localhost:3000"
    echo "Stop with: docker stop ${APP_NAME}-test && docker rm ${APP_NAME}-test"
    exit 0
fi

# Step 5: Push to registry (if configured)
if [ "$REGISTRY_URL" != "your-registry-url" ]; then
    print_step "Pushing to Docker registry..."
    docker tag $DOCKER_IMAGE $REGISTRY_URL/$DOCKER_IMAGE
    docker push $REGISTRY_URL/$DOCKER_IMAGE
fi

# Step 6: Deploy to EC2
if [ "$EC2_HOST" = "your-ec2-instance-ip" ]; then
    print_error "Please configure EC2_HOST environment variable or update this script"
    exit 1
fi

print_step "Deploying to EC2 instance..."

# Create deployment directory and copy files
ssh -i $EC2_KEY $EC2_USER@$EC2_HOST << 'EOF'
    sudo mkdir -p /opt/ai-todo-app
    sudo mkdir -p /opt/ai-todo-app/logs
    sudo chown -R $USER:$USER /opt/ai-todo-app
EOF

# Copy necessary files
print_step "Copying files to EC2..."
scp -i $EC2_KEY Dockerfile $EC2_USER@$EC2_HOST:/opt/ai-todo-app/
scp -i $EC2_KEY server/ecosystem.config.js $EC2_USER@$EC2_HOST:/opt/ai-todo-app/
scp -r -i $EC2_KEY build/ $EC2_USER@$EC2_HOST:/opt/ai-todo-app/
scp -r -i $EC2_KEY server/ $EC2_USER@$EC2_HOST:/opt/ai-todo-app/

# Install Docker and dependencies on EC2 if not present
ssh -i $EC2_KEY $EC2_USER@$EC2_HOST << 'EOF'
    # Update system
    sudo apt-get update -y
    
    # Install Docker if not present
    if ! command -v docker &> /dev/null; then
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
    fi
    
    # Install Node.js if not present
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # Install PM2 globally
    sudo npm install -g pm2 serve
    
    cd /opt/ai-todo-app
    
    # Stop existing services
    pm2 delete all 2>/dev/null || true
    docker stop ai-todo-app 2>/dev/null || true
    docker rm ai-todo-app 2>/dev/null || true
    
    # Install backend dependencies
    cd server && npm ci --only=production && cd ..
    
    # Start services with PM2
    pm2 start server/ecosystem.config.js
    pm2 save
    pm2 startup
EOF

print_step "Setting up Nginx reverse proxy..."
ssh -i $EC2_KEY $EC2_USER@$EC2_HOST << 'EOF'
    # Install Nginx if not present
    if ! command -v nginx &> /dev/null; then
        sudo apt-get install -y nginx
    fi
    
    # Create Nginx configuration
    sudo tee /etc/nginx/sites-available/ai-todo-app > /dev/null << 'NGINX_CONF'
server {
    listen 80;
    server_name _;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX_CONF
    
    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/ai-todo-app /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test and restart Nginx
    sudo nginx -t
    sudo systemctl restart nginx
    sudo systemctl enable nginx
EOF

print_step "Deployment completed successfully! 🎉"
echo ""
echo "🌐 Your AI Todo App is now accessible at: http://$EC2_HOST"
echo "📊 Monitor logs with: ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'pm2 logs'"
echo "🔄 Restart services with: ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'pm2 restart all'"
echo ""
echo "🔧 Don't forget to:"
echo "   1. Set up your .env file on the EC2 instance"
echo "   2. Configure your domain name and SSL certificate"
echo "   3. Set up monitoring and backups"