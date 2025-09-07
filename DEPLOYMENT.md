# 🚀 AI Todo App - AWS Deployment Guide

이 가이드는 AI Todo App을 AWS EC2에 배포하는 방법을 설명합니다.

## 📋 준비사항

### 1. AWS 계정 및 도구
- AWS 계정 (프리티어 사용 가능)
- AWS CLI 설치 및 구성
- EC2 Key Pair 생성

### 2. 로컬 환경
- Docker 설치
- Node.js 18+ 및 npm
- Git

## 🏗️ 배포 방법

### 방법 1: 자동 배포 스크립트 사용 (권장)

#### 1단계: CloudFormation으로 인프라 구성
```bash
# AWS CLI로 스택 생성
aws cloudformation create-stack \
  --stack-name ai-todo-app-infrastructure \
  --template-body file://aws-infrastructure.yml \
  --parameters ParameterKey=KeyPairName,ParameterValue=your-key-pair-name \
               ParameterKey=InstanceType,ParameterValue=t3.micro \
  --capabilities CAPABILITY_IAM
```

#### 2단계: 스택 생성 완료 대기
```bash
# 스택 상태 확인
aws cloudformation describe-stacks --stack-name ai-todo-app-infrastructure

# 또는 콘솔에서 확인: https://console.aws.amazon.com/cloudformation/
```

#### 3단계: 배포 스크립트 실행
```bash
# 환경변수 설정
export EC2_HOST=$(aws cloudformation describe-stacks \
  --stack-name ai-todo-app-infrastructure \
  --query 'Stacks[0].Outputs[?OutputKey==`PublicIP`].OutputValue' \
  --output text)

export EC2_KEY="~/.ssh/your-key.pem"
export EC2_USER="ubuntu"

# 배포 실행
./deploy.sh
```

### 방법 2: 수동 배포

#### 1단계: EC2 인스턴스 생성
1. AWS 콘솔에서 EC2 인스턴스 생성
2. Ubuntu 20.04 LTS AMI 선택
3. t3.micro 인스턴스 타입 (프리티어)
4. 보안 그룹에서 다음 포트 열기:
   - 22 (SSH)
   - 80 (HTTP)
   - 443 (HTTPS)
   - 3000 (Frontend)
   - 3001 (Backend API)

#### 2단계: 서버 준비
```bash
# SSH로 서버 접속
ssh -i your-key.pem ubuntu@your-ec2-ip

# 시스템 업데이트
sudo apt-get update -y
sudo apt-get upgrade -y

# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Node.js 18 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 및 필요 도구 설치
sudo npm install -g pm2 serve

# Nginx 설치
sudo apt-get install -y nginx
```

#### 3단계: 애플리케이션 배포
```bash
# 애플리케이션 디렉토리 생성
sudo mkdir -p /opt/ai-todo-app
sudo chown -R ubuntu:ubuntu /opt/ai-todo-app
cd /opt/ai-todo-app

# 코드 복사 (로컬에서)
scp -i your-key.pem -r ./build ubuntu@your-ec2-ip:/opt/ai-todo-app/
scp -i your-key.pem -r ./server ubuntu@your-ec2-ip:/opt/ai-todo-app/

# 서버에서 백엔드 의존성 설치
cd /opt/ai-todo-app/server
npm ci --only=production

# PM2로 서비스 시작
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 4단계: Nginx 설정
```bash
# Nginx 설정 파일 생성
sudo tee /etc/nginx/sites-available/ai-todo-app > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    
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
EOF

# 사이트 활성화
sudo ln -sf /etc/nginx/sites-available/ai-todo-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Nginx 재시작
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 🔧 환경변수 설정

서버에서 환경변수 파일을 생성하세요:

```bash
# 백엔드 환경변수
cd /opt/ai-todo-app/server
cat > .env << EOF
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001
NODE_ENV=production
DATABASE_PATH=./todos.db
EOF
```

## 📊 모니터링 및 관리

### 서비스 상태 확인
```bash
# PM2 프로세스 상태
pm2 status

# PM2 로그 확인
pm2 logs

# Nginx 상태
sudo systemctl status nginx

# 시스템 리소스
htop
```

### 서비스 재시작
```bash
# PM2 서비스 재시작
pm2 restart all

# Nginx 재시작
sudo systemctl restart nginx
```

## 🔒 보안 설정

### SSL 인증서 설정 (Let's Encrypt)
```bash
# Certbot 설치
sudo apt-get install -y certbot python3-certbot-nginx

# SSL 인증서 발급 (도메인 필요)
sudo certbot --nginx -d your-domain.com

# 자동 갱신 설정
sudo crontab -e
# 추가: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 방화벽 설정
```bash
# UFW 설치 및 설정
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
```

## 🚨 트러블슈팅

### 1. 서비스가 시작되지 않는 경우
```bash
# PM2 로그 확인
pm2 logs

# 포트 사용 확인
sudo netstat -tulpn | grep :3001

# 환경변수 확인
cd /opt/ai-todo-app/server && cat .env
```

### 2. 외부에서 접속이 안 되는 경우
```bash
# 보안 그룹 확인 (AWS 콘솔)
# Nginx 상태 확인
sudo systemctl status nginx

# 포트 확인
curl -I http://localhost

# 방화벽 상태
sudo ufw status
```

### 3. OpenAI API 오류
```bash
# API 키 확인
echo $OPENAI_API_KEY

# 백엔드 로그 확인
pm2 logs ai-todo-backend

# API 키 테스트
curl -H "Authorization: Bearer your-api-key" \
  https://api.openai.com/v1/models
```

## 📈 성능 최적화

### PM2 클러스터 모드
```javascript
// ecosystem.config.js 수정
module.exports = {
  apps: [{
    name: 'ai-todo-backend',
    script: 'server.js',
    instances: 'max', // CPU 코어 수만큼 프로세스 생성
    exec_mode: 'cluster'
  }]
};
```

### Nginx 캐싱
```nginx
# /etc/nginx/sites-available/ai-todo-app에 추가
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 📝 백업 및 복구

### 데이터베이스 백업
```bash
# SQLite 백업
cp /opt/ai-todo-app/server/todos.db /opt/ai-todo-app/backups/todos-$(date +%Y%m%d).db

# S3로 백업 (AWS CLI 필요)
aws s3 cp /opt/ai-todo-app/server/todos.db s3://your-backup-bucket/
```

### 자동 백업 스크립트
```bash
#!/bin/bash
# /opt/ai-todo-app/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/ai-todo-app/backups"
mkdir -p $BACKUP_DIR

# 데이터베이스 백업
cp /opt/ai-todo-app/server/todos.db $BACKUP_DIR/todos-$DATE.db

# 7일 이상 된 백업 삭제
find $BACKUP_DIR -name "todos-*.db" -mtime +7 -delete

echo "Backup completed: todos-$DATE.db"
```

## 🎯 다음 단계

1. **도메인 연결**: Route 53으로 사용자 친화적인 URL 설정
2. **SSL 인증서**: HTTPS 보안 연결 설정
3. **모니터링**: CloudWatch로 성능 및 에러 모니터링
4. **CDN**: CloudFront로 전 세계 빠른 접근
5. **자동 배포**: GitHub Actions로 CI/CD 파이프라인 구축

---

배포가 완료되면 `http://your-ec2-ip`로 접속하여 AI Todo App을 사용할 수 있습니다! 🎉