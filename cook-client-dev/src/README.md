# 🍳 쿠킹 어시스턴트

AI 기반 맞춤형 요리 보조 웹 애플리케이션

---

## 📋 프로젝트 개요

**쿠킹 어시스턴트**는 1인 가구와 요리 초보자를 위한 AI 기반 요리 보조 플랫폼입니다.

### 주요 기능
- ✅ **AI 음성 보조**: 실시간 STT/TTS로 요리 단계 안내
- ✅ **맞춤형 레시피 추천**: 보유 재료 기반 GPT 추천
- ✅ **식재료 관리**: 냉장고 재료 추적 및 유통기한 알림
- ✅ **조리 가이드**: 단계별 타이머와 음성 피드백
- ✅ **알러지 경고**: 프로필 기반 자동 경고 시스템

---

## 🎨 디자인 테마

### 컬러 팔레트
- **메인 컬러 1**: 세이지그린 `#A5B68D`
- **메인 컬러 2**: 골드/머스타드 `#C9A86A`
- **보조 컬러 1**: 베이지 `#F2CC8F`
- **보조 컬러 2**: 아이보리 `#F4F1DE`
- **텍스트 컬러**: 다크 그레이 `#3A3A3A`

### UI 구성
- 상단 네비게이션 바
- 하단 네비게이션 바 (홈/레시피/AI/식재료/MY)
- 다크모드 지원

---

## 🏗️ 기술 스택

### 프론트엔드
- **React** + **TypeScript**
- **Tailwind CSS** v4.0
- **shadcn/ui** 컴포넌트
- **Lucide React** 아이콘

### 백엔드
- **Node.js** + **Express**
- **MySQL** 데이터베이스
- **JWT** 인증
- **OpenAI GPT** + **Google Cloud** (STT/TTS)

---

## 📁 프로젝트 구조

```
cooking-assistant/
├── 🎨 프론트엔드
│   ├── /App.tsx                      # 메인 앱
│   ├── /components/                  # React 컴포넌트
│   │   ├── Auth.tsx                  # 로그인/회원가입
│   │   ├── HomePage.tsx              # 홈 대시보드
│   │   ├── VoiceAssistant.tsx        # AI 음성 보조
│   │   ├── RecipeRecommendation.tsx  # 레시피 추천
│   │   ├── IngredientsManagement.tsx # 식재료 관리
│   │   └── ...
│   ├── /utils/
│   │   └── api.ts                    # API 클라이언트
│   └── /styles/
│       └── globals.css               # 전역 스타일
│
└── 🔧 백엔드
    └── /server/
        ├── index.js                  # Express 서버
        ├── package.json
        ├── .env.example              # 환경변수 템플릿
        ├── /config/
        │   └── db.js                 # MySQL 연결
        ├── /middleware/
        │   └── auth.js               # JWT 인증
        ├── /routes/
        │   ├── auth.js               # 인증 API
        │   ├── profile.js            # 프로필 API
        │   ├── ingredients.js        # 식재료 API
        │   ├── recipes.js            # 레시피 API
        │   └── ai.js                 # AI 음성 API
        ├── /migrations/
        │   ├── 001_create_tables.sql # DB 스키마
        │   └── migrate.js            # 마이그레이션 스크립트
        └── /utils/
            └── jwt.js                # JWT 유틸
```

---

## 🚀 시작하기

### ⚠️ 중요: 백엔드 서버 먼저 실행!

앱을 사용하려면 **백엔드 서버를 반드시 실행**해야 합니다.

**"Failed to fetch" 에러가 발생하나요?**  
👉 **[BACKEND_SETUP.md](./BACKEND_SETUP.md)** 가이드를 먼저 확인하세요!

---

### 1. 필수 요구사항
- Node.js 18+
- MySQL 8.0+
- OpenAI API Key
- Google Cloud API Key (STT/TTS)

### 2. 백엔드 설정

```bash
cd server

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
nano .env  # MySQL 비밀번호, API 키 입력

# MySQL 데이터베이스 생성
mysql -u root -p
CREATE DATABASE cooking_assistant CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# 마이그레이션 실행
npm run migrate

# 서버 실행
npm run dev  # 개발 모드
```

**✅ 서버 실행 확인**: http://localhost:3001/health

### 3. 프론트엔드 설정

```bash
# 프로젝트 루트에서
npm install

# 프론트엔드 실행
npm run dev
```

**✅ 앱 실행 확인**: http://localhost:5173

---

## 🔐 환경변수 설정

### 백엔드 (.env)
```env
# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=cooking_assistant

# JWT
JWT_SECRET=your_random_secret_key_64_chars

# API Keys
OPENAI_API_KEY=sk-proj-your-openai-key
GOOGLE_CLOUD_API_KEY=your-google-cloud-key

# Server
PORT=3001
NODE_ENV=development
```

### 프론트엔드 (.env - 선택사항)
```env
VITE_API_URL=http://localhost:3001/api
```

---

## 📡 API 엔드포인트

### 인증 (4개)
```
POST /api/auth/signup       # 회원가입
POST /api/auth/login        # 로그인
GET  /api/auth/me           # 현재 사용자
GET  /api/auth/verify       # 토큰 검증
```

### 프로필 (3개)
```
GET  /api/profile           # 프로필 조회
PUT  /api/profile           # 프로필 수정
GET  /api/profile/stats     # 통계 조회
```

### 식재료 (7개)
```
GET    /api/ingredients               # 전체 목록
POST   /api/ingredients               # 추가
GET    /api/ingredients/:id           # 단일 조회
PUT    /api/ingredients/:id           # 수정
DELETE /api/ingredients/:id           # 삭제
GET    /api/ingredients/category/:cat # 카테고리별
GET    /api/ingredients/expiring/soon # 유통기한 임박
```

### 레시피 (7개)
```
GET    /api/recipes                  # 저장한 목록
POST   /api/recipes                  # 레시피 저장
DELETE /api/recipes/:id              # 저장 취소
GET    /api/recipes/check/:id        # 저장 여부
GET    /api/recipes/category/:cat    # 카테고리별
POST   /api/recipes/history          # 요리 기록
GET    /api/recipes/history          # 요리 기록 조회
```

### AI 음성 (3개)
```
POST /api/ai/stt           # 음성→텍스트 + GPT 응답
POST /api/ai/tts           # 텍스트→음성
GET  /api/ai/health        # AI 서비스 상태
```

### 헬스체크 (1개)
```
GET /health                # 서버 상태
```

**총 25개 엔드포인트**

---

## 🗄️ 데이터베이스 스키마

### 1. users (사용자)
```sql
- id (UUID, PK)
- email (UNIQUE)
- password_hash
- name
- allergies (JSON)
- preferences (JSON)
- created_at, updated_at
```

### 2. ingredients (식재료)
```sql
- id (UUID, PK)
- user_id (FK)
- name
- category
- quantity, unit
- expiry_date
- notes
- created_at, updated_at
```

### 3. saved_recipes (저장된 레시피)
```sql
- id (UUID, PK)
- user_id (FK)
- recipe_id
- name, category
- difficulty, cooking_time
- image, description
- ingredients (JSON)
- steps (JSON)
- saved_at
```

### 4. cooking_history (요리 기록)
```sql
- id (UUID, PK)
- user_id (FK)
- recipe_id, recipe_name
- completed_at
- rating (1-5)
- notes
```

### 5. user_stats (통계 뷰)
```sql
SELECT 
  user.id,
  COUNT(ingredients),
  COUNT(saved_recipes),
  COUNT(cooking_history)
FROM users
```

---

## 🎯 구현 완료 기능

### ✅ 완전 구현 (11개)
1. ✅ 회원가입/로그인 (JWT 인증)
2. ✅ 프로필 관리
3. ✅ 식재료 완전한 CRUD
4. ✅ 레시피 저장/조회
5. ✅ AI 음성 보조 (STT → GPT → TTS)
6. ✅ 유통기한 임박 재료 조회
7. ✅ 조리 타이머
8. ✅ 다크모드
9. ✅ 오류 처리
10. ✅ 로그 관리
11. ✅ 세션 관리

### 🚧 추가 예정 기능
- ❌ Vision API (냉장고 사진 인식)
- ❌ OCR API (영수증 인식)
- ❌ 푸시 알림 (FCM)
- ❌ 쿠팡 API 연동
- ❌ GPT 기반 레시피 추천 엔진
- ❌ 대체 재료 제안
- ❌ 커뮤니티 게시판
- ❌ 리뷰 시스템

---

## 📚 추가 문서

- **[MIGRATION_COMPLETE.md](./MIGRATION_COMPLETE.md)** - Supabase → MySQL 전환 가이드
- **[server/README.md](./server/README.md)** - 백엔드 상세 가이드
- **[server/DEPLOYMENT_GUIDE.md](./server/DEPLOYMENT_GUIDE.md)** - 배포 가이드 (Railway, AWS, Render)

---

## 🌐 배포

### Railway (추천)
```bash
npm install -g @railway/cli
railway login
cd server
railway init
railway up
railway add mysql
railway run npm run migrate
```

### AWS EC2 + RDS
[자세한 가이드는 server/DEPLOYMENT_GUIDE.md 참조]

---

## 🤝 기여

이 프로젝트는 현재 개발 중입니다. 기여를 환영합니다!

---

## 📄 라이선스

MIT License

---

## 📞 문의

문제가 발생하면 이슈를 등록해주세요.

---

**Happy Cooking! 🎉**