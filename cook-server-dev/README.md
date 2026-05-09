# 🍳 Cooking Assistant - MySQL Backend Server

완전한 Node.js + Express + MySQL 백엔드 서버입니다.

## 📋 목차

- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [설치 방법](#설치-방법)
- [데이터베이스 설정](#데이터베이스-설정)
- [서버 실행](#서버-실행)
- [API 엔드포인트](#api-엔드포인트)
- [배포 가이드](#배포-가이드)

---

## 🛠 기술 스택

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MySQL 8.0+
- **Authentication**: JWT (JSON Web Token)
- **Password Hashing**: bcryptjs
- **AI APIs**: 
  - OpenAI GPT-4o
  - Google Cloud Speech-to-Text
  - Google Cloud Text-to-Speech

---

## 📁 프로젝트 구조

```
server/
├── config/
│   └── db.js                 # MySQL 연결 설정
├── middleware/
│   └── auth.js               # JWT 인증 미들웨어
├── migrations/
│   ├── 001_create_tables.sql # 데이터베이스 스키마
│   └── migrate.js            # 마이그레이션 실행 스크립트
├── routes/
│   ├── auth.js               # 회원가입, 로그인
│   ├── profile.js            # 사용자 프로필
│   ├── ingredients.js        # 식재료 관리
│   ├── recipes.js            # 레시피 저장
│   └── ai.js                 # AI 음성 보조
├── utils/
│   └── jwt.js                # JWT 유틸리티
├── .env.example              # 환경변수 템플릿
├── .gitignore
├── index.js                  # 메인 서버 파일
├── package.json
└── README.md
```

---

## 🚀 설치 방법

### 1. Node.js 설치

Node.js 18 이상이 필요합니다.

```bash
# Node.js 버전 확인
node --version

# npm 버전 확인
npm --version
```

### 2. 프로젝트 의존성 설치

```bash
cd server
npm install
```

---

## 🗄️ 데이터베이스 설정

### 1. MySQL 설치

**Windows:**
- [MySQL Community Server](https://dev.mysql.com/downloads/mysql/) 다운로드 및 설치
- MySQL Workbench 설치 (선택사항, GUI 관리 도구)

**macOS:**
```bash
brew install mysql
brew services start mysql
```

**Linux (Ubuntu):**
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
```

### 2. MySQL 접속 및 사용자 생성

```bash
# MySQL 접속
mysql -u root -p

# 데이터베이스 생성
CREATE DATABASE cooking_assistant CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 사용자 생성 (선택사항)
CREATE USER 'cooking_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON cooking_assistant.* TO 'cooking_user'@'localhost';
FLUSH PRIVILEGES;

# 종료
EXIT;
```

### 3. 환경변수 설정

`.env.example` 파일을 `.env`로 복사하고 수정:

```bash
cp .env.example .env
```

`.env` 파일 내용:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=cooking_assistant

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# API Keys
OPENAI_API_KEY=sk-your-openai-api-key
GOOGLE_CLOUD_API_KEY=your-google-cloud-api-key

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 4. 데이터베이스 마이그레이션 실행

```bash
npm run migrate
```

성공하면 다음과 같이 출력됩니다:

```
✅ Connected to MySQL server
✅ Database 'cooking_assistant' ready
✅ Created table: users
✅ Created table: ingredients
✅ Created table: saved_recipes
✅ Created table: cooking_history
✅ Migration completed successfully!
```

---

## 🏃 서버 실행

### 개발 모드 (자동 재시작)

```bash
npm run dev
```

### 프로덕션 모드

```bash
npm start
```

서버가 시작되면:

```
🚀 ================================================
   Cooking Assistant API Server
================================================
📡 Server running on: http://localhost:3001
🌍 Environment: development
🔑 OpenAI API: ✅ Configured
🔑 Google API: ✅ Configured
================================================
```

### Health Check

```bash
curl http://localhost:3001/health
```

---

## 📡 API 엔드포인트

### 인증 (Auth)

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|----------|
| POST | `/api/auth/signup` | 회원가입 | ❌ |
| POST | `/api/auth/login` | 로그인 | ❌ |
| GET | `/api/auth/me` | 현재 사용자 정보 | ✅ |
| GET | `/api/auth/verify` | 토큰 검증 | ✅ |

### 프로필 (Profile)

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|----------|
| GET | `/api/profile` | 프로필 조회 | ✅ |
| PUT | `/api/profile` | 프로필 수정 | ✅ |
| GET | `/api/profile/stats` | 통계 조회 | ✅ |

### 식재료 (Ingredients)

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|----------|
| GET | `/api/ingredients` | 전체 목록 | ✅ |
| GET | `/api/ingredients/:id` | 단일 조회 | ✅ |
| POST | `/api/ingredients` | 추가 | ✅ |
| PUT | `/api/ingredients/:id` | 수정 | ✅ |
| DELETE | `/api/ingredients/:id` | 삭제 | ✅ |
| GET | `/api/ingredients/category/:category` | 카테고리별 조회 | ✅ |
| GET | `/api/ingredients/expiring/soon` | 유통기한 임박 | ✅ |

### 레시피 (Recipes)

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|----------|
| GET | `/api/recipes` | 저장한 레시피 목록 | ✅ |
| POST | `/api/recipes` | 레시피 저장 | ✅ |
| DELETE | `/api/recipes/:id` | 저장 취소 | ✅ |
| GET | `/api/recipes/check/:recipe_id` | 저장 여부 확인 | ✅ |
| GET | `/api/recipes/category/:category` | 카테고리별 조회 | ✅ |
| POST | `/api/recipes/history` | 요리 히스토리 추가 | ✅ |
| GET | `/api/recipes/history` | 요리 히스토리 조회 | ✅ |

### AI 음성 (AI)

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|----------|
| POST | `/api/ai/stt` | 음성→텍스트 + AI 응답 | ✅ |
| POST | `/api/ai/tts` | 텍스트→음성 | ✅ |
| GET | `/api/ai/health` | AI 서비스 상태 | ✅ |

### 요청 예시

**회원가입:**

```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "홍길동"
  }'
```

**로그인:**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**식재료 추가 (인증 필요):**

```bash
curl -X POST http://localhost:3001/api/ingredients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "양파",
    "category": "채소",
    "quantity": "3",
    "unit": "개"
  }'
```

---

## 🌐 배포 가이드

### 옵션 1: Railway (추천)

Railway는 무료로 시작할 수 있으며 MySQL과 Node.js를 모두 지원합니다.

#### 1. Railway 계정 생성
- https://railway.app 접속
- GitHub 계정으로 로그인

#### 2. MySQL 데이터베이스 생성
```
1. New Project 클릭
2. "Provision MySQL" 선택
3. 자동으로 MySQL 인스턴스 생성
4. Database 탭에서 연결 정보 확인
```

#### 3. Node.js 서버 배포
```
1. "New" → "GitHub Repo" 선택
2. server 디렉토리가 있는 저장소 선택
3. Root Directory: /server 설정
4. Environment Variables 추가:
   - DB_HOST (Railway MySQL 호스트)
   - DB_PORT (Railway MySQL 포트)
   - DB_USER (Railway MySQL 사용자)
   - DB_PASSWORD (Railway MySQL 비밀번호)
   - DB_NAME (데이터베이스 이름)
   - JWT_SECRET (랜덤 문자열)
   - OPENAI_API_KEY
   - GOOGLE_CLOUD_API_KEY
5. Deploy 클릭
```

#### 4. 마이그레이션 실행
Railway 대시보드에서:
```
Settings → Deploy Triggers → Run Command
npm run migrate
```

#### 5. 도메인 확인
- Settings → Domains에서 제공된 URL 확인
- 예: `your-app.up.railway.app`

---

### 옵션 2: Vercel (서버리스)

**주의:** Vercel은 서버리스 환경이므로 지속적인 MySQL 연결이 제한됩니다.

#### 1. 설정 파일 추가

`vercel.json` 파일 생성:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

#### 2. 배포

```bash
npm install -g vercel
vercel
```

---

### 옵션 3: Heroku

#### 1. Heroku CLI 설치
```bash
# macOS
brew tap heroku/brew && brew install heroku

# Windows
# https://devcenter.heroku.com/articles/heroku-cli 에서 다운로드
```

#### 2. 로그인 및 앱 생성
```bash
heroku login
heroku create cooking-assistant-api
```

#### 3. MySQL 애드온 추가
```bash
heroku addons:create jawsdb:kitefin
```

#### 4. 환경변수 설정
```bash
heroku config:set JWT_SECRET=your-secret-key
heroku config:set OPENAI_API_KEY=your-openai-key
heroku config:set GOOGLE_CLOUD_API_KEY=your-google-key
```

#### 5. 배포
```bash
git push heroku main
```

#### 6. 마이그레이션
```bash
heroku run npm run migrate
```

---

### 옵션 4: AWS (EC2 + RDS)

#### 1. RDS MySQL 인스턴스 생성
- AWS Console → RDS → Create Database
- MySQL 8.0 선택
- Free Tier 선택
- 보안 그룹 설정 (포트 3306 열기)

#### 2. EC2 인스턴스 생성
- Ubuntu Server 선택
- t2.micro (Free Tier)
- 보안 그룹: HTTP(80), HTTPS(443), Custom(3001)

#### 3. 서버 설정
```bash
# SSH 접속
ssh -i your-key.pem ubuntu@your-ec2-ip

# Node.js 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 설치 (프로세스 관리)
sudo npm install -g pm2

# 프로젝트 클론
git clone your-repo.git
cd server
npm install

# .env 파일 생성
nano .env
# (환경변수 입력)

# 마이그레이션
npm run migrate

# PM2로 서버 실행
pm2 start index.js --name cooking-api
pm2 save
pm2 startup
```

#### 4. Nginx 리버스 프록시 설정
```bash
sudo apt install nginx

sudo nano /etc/nginx/sites-available/cooking-api

# 다음 내용 입력:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# 활성화
sudo ln -s /etc/nginx/sites-available/cooking-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### 옵션 5: DigitalOcean

#### 1. Droplet 생성
- Ubuntu 22.04 LTS
- Basic Plan ($4/month)

#### 2. Managed Database 추가
- MySQL 8
- Same datacenter as Droplet

#### 3. 위 AWS EC2 설정과 동일하게 진행

---

## 🔐 보안 권장사항

### 프로덕션 환경

1. **JWT Secret 변경**
   ```
   openssl rand -base64 64
   ```

2. **HTTPS 사용**
   - Let's Encrypt SSL 인증서 설치
   - Certbot 사용 (자동 갱신)

3. **환경변수 보안**
   - .env 파일을 절대 Git에 커밋하지 않기
   - 배포 플랫폼의 환경변수 기능 사용

4. **데이터베이스 보안**
   - 강력한 비밀번호 사용
   - 외부 접근 제한
   - 정기적 백업

5. **Rate Limiting**
   ```bash
   npm install express-rate-limit
   ```

---

## 📊 모니터링

### PM2 Monitoring (서버)
```bash
pm2 monit
pm2 logs
pm2 status
```

### MySQL 모니터링
```sql
SHOW PROCESSLIST;
SHOW STATUS;
SELECT * FROM information_schema.processlist;
```

---

## 🧪 테스트

### Postman Collection

`postman_collection.json` 파일을 Postman에 import하여 모든 API 테스트 가능.

### 수동 테스트

```bash
# Health Check
curl http://localhost:3001/health

# 회원가입
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"테스터"}'

# 로그인 후 토큰 저장
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' \
  | jq -r '.token')

# 인증 필요한 API 테스트
curl http://localhost:3001/api/profile \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🆘 문제 해결

### MySQL 연결 오류
```bash
# MySQL 서비스 상태 확인
sudo systemctl status mysql

# MySQL 재시작
sudo systemctl restart mysql

# 포트 확인
netstat -an | grep 3306
```

### 포트 충돌
```bash
# 3001 포트 사용 중인 프로세스 찾기
lsof -i :3001

# 프로세스 종료
kill -9 <PID>
```

### 마이그레이션 실패
```bash
# 데이터베이스 초기화
mysql -u root -p
DROP DATABASE cooking_assistant;
CREATE DATABASE cooking_assistant CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# 마이그레이션 재실행
npm run migrate
```

---

## 📞 지원

문제가 발생하면:
1. 로그 확인: `npm run dev` 또는 `pm2 logs`
2. MySQL 로그: `/var/log/mysql/error.log`
3. 환경변수 확인: `.env` 파일

---

## 📝 라이센스

MIT License
