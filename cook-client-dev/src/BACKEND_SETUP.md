# 🚀 백엔드 서버 실행 가이드

쿠킹 어시스턴트 애플리케이션을 사용하려면 **백엔드 서버를 먼저 실행**해야 합니다.

---

## ⚠️ 중요 안내

현재 "Failed to fetch" 에러가 발생하는 경우, 백엔드 서버가 실행되지 않은 것입니다.

**에러 메시지:**
```
API Error (/auth/signup): TypeError: Failed to fetch
```

**해결 방법:** 아래 단계를 따라 백엔드 서버를 실행하세요.

---

## 📋 사전 준비사항

### 1. 필수 프로그램 설치
- ✅ **Node.js 18 이상** ([다운로드](https://nodejs.org/))
- ✅ **MySQL 8.0 이상** ([다운로드](https://dev.mysql.com/downloads/mysql/))

### 2. 설치 확인
```bash
# Node.js 버전 확인
node --version
# v18.0.0 이상이어야 함

# MySQL 버전 확인
mysql --version
# 8.0 이상이어야 함
```

---

## 🔧 백엔드 설정 및 실행

### Step 1: MySQL 데이터베이스 생성

터미널에서 MySQL에 접속:
```bash
mysql -u root -p
```

비밀번호 입력 후, 데이터베이스 생성:
```sql
CREATE DATABASE cooking_assistant CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### Step 2: 환경변수 설정

```bash
cd server
cp .env.example .env
```

`.env` 파일을 열고 다음 내용을 입력:
```env
# MySQL 설정
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password_here    # MySQL 비밀번호 입력!
DB_NAME=cooking_assistant

# JWT Secret (아래 명령어로 생성 권장)
JWT_SECRET=your_random_secret_key_at_least_64_chars_long_here

# OpenAI API Key (AI 음성 기능용)
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# Google Cloud API Key (STT/TTS용)
GOOGLE_CLOUD_API_KEY=your-google-cloud-api-key-here

# 서버 설정
PORT=3001
NODE_ENV=development
```

**JWT Secret 생성 (선택사항):**
```bash
# 랜덤 64자 문자열 생성
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: 의존성 설치

```bash
cd server
npm install
```

### Step 4: 데이터베이스 마이그레이션 실행

```bash
npm run migrate
```

**성공 메시지:**
```
✅ Database migration completed successfully!
✅ Created tables: users, ingredients, saved_recipes, cooking_history
```

### Step 5: 백엔드 서버 실행

```bash
npm run dev
```

**성공 메시지:**
```
🔌 MySQL connected to cooking_assistant
🚀 Server is running on http://localhost:3001
```

---

## ✅ 서버 실행 확인

### 1. 브라우저에서 헬스 체크
http://localhost:3001/health

**응답:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "version": "1.0.0"
}
```

### 2. 콘솔 로그 확인
프론트엔드 앱을 새로고침하면 콘솔에 다음과 같이 표시:
```
🔌 API Base URL: http://localhost:3001/api
```

---

## 🎯 프론트엔드 실행

백엔드 서버가 정상 실행된 후, **새 터미널**에서:

```bash
# 프로젝트 루트 디렉토리로 이동
cd ..

# 프론트엔드 실행
npm run dev
```

**브라우저에서 열기:**
http://localhost:5173

---

## 🐛 문제 해결

### 1. "ECONNREFUSED" 에러
**원인:** MySQL 서버가 실행되지 않음

**해결:**
```bash
# macOS (Homebrew)
brew services start mysql

# Windows
net start MySQL80

# Linux
sudo systemctl start mysql
```

### 2. "Access denied for user" 에러
**원인:** MySQL 비밀번호 오류

**해결:**
1. `.env` 파일의 `DB_PASSWORD` 확인
2. MySQL 비밀번호가 맞는지 확인
3. MySQL 사용자 권한 확인:
   ```sql
   GRANT ALL PRIVILEGES ON cooking_assistant.* TO 'root'@'localhost';
   FLUSH PRIVILEGES;
   ```

### 3. "Port 3001 already in use" 에러
**원인:** 포트 3001이 이미 사용 중

**해결:**
```bash
# 포트 사용 중인 프로세스 찾기 (macOS/Linux)
lsof -i :3001

# Windows
netstat -ano | findstr :3001

# 프로세스 종료 후 다시 실행
```

또는 `.env` 파일에서 다른 포트 사용:
```env
PORT=3002
```

### 4. "Cannot find module" 에러
**원인:** 의존성 설치 안 됨

**해결:**
```bash
cd server
rm -rf node_modules package-lock.json
npm install
```

---

## 📝 개발 팁

### 서버 자동 재시작
`nodemon`이 설치되어 있어 코드 변경 시 자동으로 서버가 재시작됩니다.

### 로그 확인
서버 로그에서 모든 API 요청을 확인할 수 있습니다:
```
POST /api/auth/signup 201 - 234.567 ms
POST /api/auth/login 200 - 123.456 ms
GET /api/ingredients 200 - 45.678 ms
```

### API 테스트 (curl)
```bash
# 회원가입
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456","name":"테스트"}'

# 로그인
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
```

---

## 📚 추가 문서

- **[README.md](./README.md)** - 프로젝트 전체 개요
- **[server/README.md](./server/README.md)** - 백엔드 API 상세 문서
- **[server/DEPLOYMENT_GUIDE.md](./server/DEPLOYMENT_GUIDE.md)** - 프로덕션 배포 가이드

---

## 💡 FAQ

**Q: OpenAI API Key가 없으면 앱을 사용할 수 없나요?**  
A: 기본 기능(회원가입, 로그인, 식재료 관리 등)은 사용 가능합니다. AI 음성 기능만 사용할 수 없습니다.

**Q: MySQL 대신 다른 DB를 사용할 수 있나요?**  
A: 현재는 MySQL만 지원합니다. PostgreSQL 지원은 향후 추가 예정입니다.

**Q: 프로덕션 배포는 어떻게 하나요?**  
A: [server/DEPLOYMENT_GUIDE.md](./server/DEPLOYMENT_GUIDE.md)를 참고하세요.

---

**백엔드 서버가 정상적으로 실행되면 모든 기능을 사용할 수 있습니다! 🎉**
