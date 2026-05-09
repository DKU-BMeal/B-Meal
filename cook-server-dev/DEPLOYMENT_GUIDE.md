# 🚀 완전한 배포 가이드

쿠킹 어시스턴트 MySQL 백엔드를 실제 서버에 배포하는 **완벽한 단계별 가이드**입니다.

---

## 📋 배포 전 체크리스트

- [ ] Node.js 18+ 설치됨
- [ ] MySQL 8+ 설치됨
- [ ] OpenAI API Key 발급받음
- [ ] Google Cloud API Key 발급받음 (Speech-to-Text, Text-to-Speech)
- [ ] 도메인 준비 (선택사항)
- [ ] Git 저장소에 코드 푸시됨

---

## 🎯 추천 배포 옵션 비교

| 플랫폼 | 난이도 | 비용 | MySQL | 무료 플랜 | 추천도 |
|--------|--------|------|-------|----------|--------|
| **Railway** | ⭐ 쉬움 | $5/월~ | ✅ 내장 | ✅ $5 크레딧 | ⭐⭐⭐⭐⭐ |
| **Render** | ⭐⭐ 보통 | $7/월~ | ✅ 외부 | ✅ 제한적 | ⭐⭐⭐⭐ |
| **Heroku** | ⭐⭐ 보통 | $7/월~ | ✅ 애드온 | ❌ | ⭐⭐⭐ |
| **AWS EC2+RDS** | ⭐⭐⭐⭐ 어려움 | $10/월~ | ✅ RDS | ✅ 12개월 | ⭐⭐⭐⭐⭐ |
| **DigitalOcean** | ⭐⭐⭐ 보통 | $6/월~ | ✅ Managed | ❌ | ⭐⭐⭐⭐ |
| **VPS (Cafe24 등)** | ⭐⭐⭐ 보통 | 2,200원/월~ | ✅ 직접 설치 | ❌ | ⭐⭐⭐ |

---

## 🏆 최고의 선택: Railway (가장 쉬움)

### 장점
- ✅ GitHub 연동 자동 배포
- ✅ MySQL 원클릭 설치
- ✅ 무료 $5 크레딧 (매월)
- ✅ SSL 자동 적용
- ✅ 환경변수 GUI 관리
- ✅ 로그 실시간 확인

### 1단계: Railway 계정 생성

1. https://railway.app 접속
2. "Start a New Project" 클릭
3. "Login with GitHub" - GitHub 계정으로 로그인
4. Railway 앱 권한 승인

### 2단계: MySQL 데이터베이스 생성

```
1. Dashboard에서 "New" 클릭
2. "Database" → "Add MySQL" 선택
3. 자동으로 MySQL 8.0 인스턴스 생성됨
4. MySQL 카드 클릭 → "Variables" 탭에서 연결 정보 확인:
   - MYSQLHOST
   - MYSQLPORT
   - MYSQLUSER
   - MYSQLPASSWORD
   - MYSQLDATABASE
```

### 3단계: GitHub 저장소 준비

```bash
# 로컬에서 Git 저장소 생성
cd server
git init
git add .
git commit -m "Initial commit - MySQL backend"

# GitHub에 저장소 생성 후 푸시
git remote add origin https://github.com/your-username/cooking-backend.git
git branch -M main
git push -u origin main
```

### 4단계: Railway에 서버 배포

```
1. Railway Dashboard → "New" → "GitHub Repo"
2. 저장소 선택 (cooking-backend)
3. "Deploy Now" 클릭
4. 자동으로 빌드 시작
```

### 5단계: 환경변수 설정

Railway 프로젝트 → Settings → Variables:

```env
# MySQL (Railway에서 자동 생성된 값 사용)
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}

# JWT
JWT_SECRET=생성한_랜덤_문자열_64자_이상
JWT_EXPIRES_IN=7d

# API Keys
OPENAI_API_KEY=sk-proj-your-openai-api-key
GOOGLE_CLOUD_API_KEY=your-google-cloud-api-key

# Server
PORT=3001
NODE_ENV=production

# CORS (프론트엔드 URL)
ALLOWED_ORIGINS=https://your-frontend-url.com,http://localhost:5173
```

### 6단계: 마이그레이션 실행

Railway Console 사용:

```
1. 프로젝트 카드 클릭
2. 오른쪽 상단 "..." 메뉴
3. "Open Terminal" 선택
4. 다음 명령어 실행:

npm run migrate
```

또는 로컬에서 Railway CLI 사용:

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 연결
railway link

# 마이그레이션 실행
railway run npm run migrate
```

### 7단계: 도메인 확인

```
1. Settings → Networking
2. "Generate Domain" 클릭
3. 생성된 URL 확인 (예: cooking-api-production.up.railway.app)
4. 커스텀 도메인 추가 가능
```

### 8단계: 테스트

```bash
# Health Check
curl https://your-app.up.railway.app/health

# 회원가입 테스트
curl -X POST https://your-app.up.railway.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"테스터"}'
```

---

## 🔧 Railway 추가 설정

### 자동 배포 설정

```
Settings → Deploys
- Auto Deploy: ON
- Deploy on Push: main branch
```

### 모니터링

```
Observability 탭:
- CPU 사용량
- 메모리 사용량
- 네트워크 트래픽
- 로그 스트리밍
```

### 백업 설정

MySQL 카드 → Settings → Backup:
- 자동 일일 백업
- 수동 백업 생성 가능

---

## 🌟 대안: Render.com (두 번째 추천)

### 특징
- 무료 플랜 제공 (제한적)
- PostgreSQL 무료, MySQL은 외부 필요
- GitHub 자동 배포

### 배포 단계

1. **Render 계정 생성**
   - https://render.com 접속
   - GitHub 로그인

2. **Web Service 생성**
   ```
   New → Web Service
   - Repository: cooking-backend
   - Name: cooking-api
   - Environment: Node
   - Build Command: npm install
   - Start Command: npm start
   ```

3. **외부 MySQL 연결**
   - **옵션 1**: PlanetScale (무료 MySQL)
     - https://planetscale.com
     - 무료 플랜: 5GB storage, 1B rows
   
   - **옵션 2**: Railway MySQL만 사용
     - Railway에서 MySQL 생성
     - 외부 접근 허용
     - Render에서 연결

4. **환경변수 설정**
   ```
   Environment Variables:
   - DB_HOST=your-mysql-host
   - DB_PORT=3306
   - 나머지 동일
   ```

5. **Deploy**

---

## 🏢 대기업급: AWS EC2 + RDS

완전한 제어와 확장성이 필요할 때.

### 비용 예상
- EC2 t2.micro: 무료 (12개월) → $8.5/월
- RDS db.t3.micro: 무료 (12개월) → $15/월
- **총**: 1년 무료 → $23.5/월

### 1단계: AWS 계정 생성
- https://aws.amazon.com/ko/free/
- 신용카드 필요 (프리티어 무료)

### 2단계: RDS MySQL 생성

```
1. AWS Console → RDS → Create Database
2. Engine: MySQL 8.0
3. Templates: Free tier
4. DB Instance: db.t3.micro
5. Credentials:
   - Master username: admin
   - Master password: 강력한 비밀번호
6. Storage: 20GB GP2
7. Connectivity:
   - Public access: Yes (나중에 제한)
   - VPC security group: Create new
8. Additional:
   - Initial database name: cooking_assistant
9. Create Database (5-10분 소요)
```

**보안 그룹 설정:**
```
1. RDS 인스턴스 클릭
2. Security group 클릭
3. Inbound rules → Edit
4. Add rule:
   - Type: MySQL/Aurora
   - Port: 3306
   - Source: EC2 Security Group (나중에 설정)
```

### 3단계: EC2 인스턴스 생성

```
1. EC2 → Launch Instance
2. Name: cooking-api-server
3. AMI: Ubuntu Server 22.04 LTS
4. Instance type: t2.micro (프리티어)
5. Key pair: Create new (다운로드 저장)
6. Network:
   - VPC: Same as RDS
   - Auto-assign public IP: Enable
7. Security group: Create new
   - SSH (22): My IP
   - HTTP (80): Anywhere
   - HTTPS (443): Anywhere
   - Custom TCP (3001): Anywhere
8. Launch Instance
```

### 4단계: EC2 접속 및 환경 설정

```bash
# SSH 키 권한 설정 (로컬)
chmod 400 your-key.pem

# EC2 접속
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Node.js 18 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 확인
node --version  # v18.x.x
npm --version   # 9.x.x

# Git 설치
sudo apt install git -y

# PM2 설치 (프로세스 관리자)
sudo npm install -g pm2
```

### 5단계: 애플리케이션 배포

```bash
# 프로젝트 클론
git clone https://github.com/your-username/cooking-backend.git
cd cooking-backend

# 의존성 설치
npm install

# .env 파일 생성
nano .env

# 내용 입력 (RDS 정보 사용):
PORT=3001
NODE_ENV=production
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=your-rds-password
DB_NAME=cooking_assistant
JWT_SECRET=your-secret-key
OPENAI_API_KEY=your-openai-key
GOOGLE_CLOUD_API_KEY=your-google-key
ALLOWED_ORIGINS=*

# 저장: Ctrl+X, Y, Enter

# 마이그레이션 실행
npm run migrate

# PM2로 서버 실행
pm2 start index.js --name cooking-api

# 부팅 시 자동 시작
pm2 startup
pm2 save

# 상태 확인
pm2 status
pm2 logs
```

### 6단계: Nginx 리버스 프록시 (선택사항)

```bash
# Nginx 설치
sudo apt install nginx -y

# 설정 파일 생성
sudo nano /etc/nginx/sites-available/cooking-api

# 내용:
server {
    listen 80;
    server_name your-domain.com;  # 또는 EC2 Public IP

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}

# 활성화
sudo ln -s /etc/nginx/sites-available/cooking-api /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# 테스트 및 재시작
sudo nginx -t
sudo systemctl restart nginx
```

### 7단계: SSL 인증서 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt install certbot python3-certbot-nginx -y

# SSL 인증서 발급 (도메인 필요)
sudo certbot --nginx -d your-domain.com

# 자동 갱신 확인
sudo certbot renew --dry-run
```

### 8단계: 방화벽 설정

```bash
# UFW 활성화
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# 상태 확인
sudo ufw status
```

### 9단계: 모니터링 설정

```bash
# PM2 모니터링
pm2 monit

# 로그 확인
pm2 logs cooking-api

# CPU/메모리 확인
htop  # sudo apt install htop
```

---

## 💰 국내 저렴한 VPS (카페24, 가비아 등)

### 카페24 호스팅

**비용**: 월 2,200원~

1. **가입 및 신청**
   - https://hosting.cafe24.com
   - 서버호스팅 → Linux 서버
   - CentOS 또는 Ubuntu 선택

2. **SSH 접속**
   ```bash
   ssh root@your-server-ip
   ```

3. **위 AWS EC2 설정과 동일하게 진행**

4. **MySQL 설치**
   ```bash
   sudo apt install mysql-server -y
   sudo mysql_secure_installation
   ```

---

## 🔐 보안 강화

### 1. JWT Secret 생성

```bash
# 강력한 랜덤 문자열 생성
openssl rand -base64 64
```

### 2. MySQL 보안

```sql
-- root 비밀번호 변경
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_strong_password';

-- 전용 사용자 생성
CREATE USER 'cooking_app'@'%' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON cooking_assistant.* TO 'cooking_app'@'%';
FLUSH PRIVILEGES;
```

### 3. 환경변수 보호

```bash
# .env 파일 권한
chmod 600 .env

# Git에서 제외
echo ".env" >> .gitignore
```

### 4. Rate Limiting

`index.js`에 추가:

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100 요청
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

---

## 📊 데이터베이스 백업

### 자동 백업 스크립트

`backup.sh` 생성:

```bash
#!/bin/bash

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
DB_NAME="cooking_assistant"
DB_USER="root"
DB_PASSWORD="your_password"

mkdir -p $BACKUP_DIR

mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# 7일 이상 된 백업 삭제
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql"
```

**권한 부여:**
```bash
chmod +x backup.sh
```

**Cron 설정 (매일 새벽 3시):**
```bash
crontab -e

# 추가:
0 3 * * * /home/ubuntu/backup.sh
```

---

## 🔍 문제 해결

### 서버가 시작되지 않을 때

```bash
# PM2 로그 확인
pm2 logs cooking-api --lines 100

# Node.js 프로세스 확인
ps aux | grep node

# 포트 사용 확인
netstat -tlnp | grep 3001
```

### MySQL 연결 오류

```bash
# MySQL 상태 확인
sudo systemctl status mysql

# MySQL 로그 확인
sudo tail -f /var/log/mysql/error.log

# 연결 테스트
mysql -h your-host -u your-user -p
```

### 메모리 부족

```bash
# 스왑 파일 생성 (2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구 설정
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## ✅ 배포 완료 체크리스트

- [ ] 서버가 정상적으로 실행됨
- [ ] Health Check 성공 (`/health`)
- [ ] 회원가입 테스트 성공
- [ ] 로그인 테스트 성공
- [ ] JWT 토큰 검증 성공
- [ ] 식재료 CRUD 테스트 성공
- [ ] AI API 테스트 성공
- [ ] HTTPS 적용됨 (프로덕션)
- [ ] 데이터베이스 백업 설정됨
- [ ] 모니터링 설정됨
- [ ] 프론트엔드에서 연결 테스트 성공

---

## 📞 추가 지원

배포 중 문제가 발생하면:

1. **로그 확인**: `pm2 logs` 또는 Railway 로그
2. **환경변수 확인**: `.env` 파일 또는 플랫폼 설정
3. **네트워크 확인**: 방화벽, 보안 그룹 설정
4. **MySQL 연결 확인**: `mysql -h <host> -u <user> -p`

---

## 🎉 축하합니다!

이제 쿠킹 어시스턴트 백엔드가 실제 서버에서 운영되고 있습니다! 🚀

프론트엔드를 연결하고 실제 사용자를 받을 준비가 되었습니다.
