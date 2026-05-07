# 🚀 쿠킹 어시스턴트 완전 설정 가이드

## 📋 시스템 개요

### 구현 완료 기능

✅ **유통기한 알림 시스템**
- 3일 이내 만료 예정 알림
- 1일 이내 만료 주의 알림
- 오늘 만료 긴급 알림

✅ **AI 식재료 등록**
- Google Cloud Vision API 연동
- 이미지 자동 인식 및 카테고리 분류
- 카메라 촬영 / 사진 업로드 지원

✅ **식약처 레시피 시스템**
- 6개 확정 카테고리 (국&찌개, 반찬, 밥, 일품, 후식, 기타)
- 실시간 레시피 상세 조회
- Step Map 조리 가이드

---

## 🔧 초기 설정

### Step 1: 환경변수 설정

#### 백엔드 환경변수 (`server/.env`)

```bash
# 데이터베이스
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=asdf1020!!
DB_NAME=cooking_assistant

# JWT
JWT_SECRET=랜덤64자리문자열

# API 키
FOODSAFETY_API_KEY=식약처_API_키
OPENAI_API_KEY=OpenAI_API_키
GOOGLE_CLOUD_API_KEY=Google_Cloud_API_키

# 서버
PORT=3001
NODE_ENV=development
```

#### 프론트엔드 환경변수 (루트 `.env`)

```bash
VITE_API_URL=http://localhost:3001/api
VITE_PORT=5173
```

---

### Step 2: API 키 발급

#### 2-1. 식약처 API 키 발급

1. **사이트 접속**: https://www.foodsafetykorea.go.kr/api/openApiInfo.do
2. **회원가입 및 로그인**
3. **인증키 발급** → `COOKRCP01` (조리식품의 레시피 DB) 선택
4. 발급된 키를 `FOODSAFETY_API_KEY`에 입력

#### 2-2. Google Cloud Vision API 키 발급

1. **Google Cloud Console**: https://console.cloud.google.com
2. **새 프로젝트 생성** (또는 기존 프로젝트 선택)
3. **API 및 서비스 → 라이브러리**
4. **"Cloud Vision API"** 검색 → 사용 설정
5. **사용자 인증 정보 → API 키 만들기**
6. 생성된 키를 `GOOGLE_CLOUD_API_KEY`에 입력

**중요:** API 키 제한 설정
- 애플리케이션 제한사항: HTTP 리퍼러
- API 제한사항: Cloud Vision API만 허용

#### 2-3. OpenAI API 키 (음성 기능용)

1. **OpenAI Platform**: https://platform.openai.com
2. **API Keys** 메뉴에서 새 키 생성
3. 생성된 키를 `OPENAI_API_KEY`에 입력

---

### Step 3: 데이터베이스 마이그레이션

```bash
# MySQL 접속
mysql -u root -p

# 데이터베이스 생성
CREATE DATABASE cooking_assistant CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;

# 마이그레이션 실행
cd server
npm install
npm run migrate
```

**예상 결과:**
```
✅ Connected to MySQL server
✅ Database 'cooking_assistant' ready
🔧 FOREIGN_KEY_CHECKS = 0 (disabled)
✅ Migration completed successfully!

📊 Database Summary:
   Total tables: 7
   - users
   - ingredients
   - saved_recipes
   - cooking_history
   - recipes_light
   - cooking_sessions
   - user_stats (view)
```

---

### Step 4: 레시피 데이터 크롤링

```bash
# 백엔드 서버 실행
cd server
npm start

# 다른 터미널에서 크롤링 실행
curl -X POST http://localhost:3001/api/recipes/crawl
```

**진행 상황:**
```json
{
  "success": true,
  "message": "Recipe crawl completed",
  "inserted": 1146,
  "skipped": 0,
  "total": 1146
}
```

크롤링 소요 시간: **5-10분**

---

### Step 5: 카테고리 확인

```bash
curl http://localhost:3001/api/recipes/categories
```

**예상 응답:**
```json
{
  "total": 1146,
  "null_count": 0,
  "categories": [
    { "category": "국&찌개", "count": 189 },
    { "category": "반찬", "count": 312 },
    { "category": "밥", "count": 245 },
    { "category": "일품", "count": 187 },
    { "category": "후식", "count": 134 },
    { "category": "기타", "count": 79 }
  ]
}
```

---

## 🎯 API 엔드포인트

### 유통기한 알림

```bash
GET /api/ingredients/notifications/expiry
Authorization: Bearer {token}
```

**응답:**
```json
{
  "notifications": {
    "today": [...],
    "one_day": [...],
    "three_days": [...]
  },
  "total": 5
}
```

### AI 식재료 등록

```bash
POST /api/ingredients/ai-register
Authorization: Bearer {token}
Content-Type: application/json

{
  "image": "base64_encoded_image_data"
}
```

**응답:**
```json
{
  "success": true,
  "detected": {
    "name": "토마토",
    "category": "채소",
    "labels": [
      { "name": "Tomato", "confidence": 0.98 },
      { "name": "Vegetable", "confidence": 0.95 }
    ]
  }
}
```

### 레시피 목록 조회

```bash
GET /api/recipes/public?category=국&찌개&limit=20
```

**응답:**
```json
{
  "recipes": [
    {
      "id": "RCP_0001",
      "name": "김치찌개",
      "category": "국&찌개",
      "cooking_method": "끓이기",
      "hashtags": "#김치 #찌개"
    }
  ],
  "total": 20
}
```

### 레시피 상세 조회

```bash
GET /api/recipes/detail/RCP_0001
```

**응답:**
```json
{
  "recipe": {
    "id": "RCP_0001",
    "name": "김치찌개",
    "steps": [
      {
        "step": 1,
        "text": "김치를 먹기 좋은 크기로 썬다",
        "image": "http://..."
      },
      ...
    ],
    "ingredients": "김치 200g, 돼지고기 100g...",
    "calories": "350kcal"
  }
}
```

---

## 🎨 프론트엔드 사용법

### 유통기한 알림 사용

```tsx
import { ExpiryNotifications } from "./components/ExpiryNotifications";

function App() {
  return (
    <>
      <ExpiryNotifications />
      {/* 나머지 컴포넌트 */}
    </>
  );
}
```

### AI 식재료 등록 버튼 추가

```tsx
import { AIIngredientRegister } from "./components/AIIngredientRegister";

function IngredientsPage() {
  const handleSuccess = () => {
    // 식재료 목록 새로고침
    loadIngredients();
  };

  return (
    <div>
      <AIIngredientRegister onSuccess={handleSuccess} />
      {/* 기존 식재료 목록 */}
    </div>
  );
}
```

### 식약처 카테고리 사용

```tsx
import { RECIPE_CATEGORIES, getCategoryLabel } from "./constants/recipe-categories";
import { getPublicRecipes } from "./utils/api";

function RecipesPage() {
  const [selectedCategory, setSelectedCategory] = useState("국&찌개");

  const loadRecipes = async () => {
    const { recipes } = await getPublicRecipes({ 
      category: selectedCategory,
      limit: 20 
    });
  };

  return (
    <div>
      {RECIPE_CATEGORIES.map(cat => (
        <button 
          key={cat.id}
          onClick={() => setSelectedCategory(cat.id)}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
```

---

## ✅ 검증 체크리스트

### 백엔드

- [ ] `npm start` 실행 → 포트 3001에서 실행
- [ ] `curl http://localhost:3001/health` → `{"status":"healthy"}`
- [ ] `curl http://localhost:3001/api/recipes/categories` → 카테고리 6개 반환
- [ ] `curl http://localhost:3001/api/recipes/public?limit=5` → 레시피 5개 반환
- [ ] 서버 로그에 에러 없음

### 데이터베이스

- [ ] `recipes_light` 테이블에 1146개 레시피
- [ ] NULL 카테고리 0개
- [ ] 카테고리 종류: 국&찌개, 반찬, 밥, 일품, 후식, 기타

### 프론트엔드

- [ ] `npm run dev` 실행 → 포트 5173에서 실행
- [ ] 레시피 목록 정상 표시
- [ ] 카테고리 필터 동작
- [ ] AI 식재료 등록 버튼 표시
- [ ] 유통기한 알림 표시 (만료 예정 식재료가 있을 때)

---

## 🚨 문제 해결

### 1. 레시피 목록이 비어있음

**원인**: 크롤링 미실행 또는 카테고리 불일치

**해결:**
```bash
# 레시피 개수 확인
mysql -u root -p cooking_assistant -e "SELECT COUNT(*) FROM recipes_light;"

# 0개면 크롤링 실행
curl -X POST http://localhost:3001/api/recipes/crawl

# 카테고리 확인
curl http://localhost:3001/api/recipes/categories
```

### 2. AI 식재료 등록 실패

**원인**: Google Cloud API 키 미설정 또는 잘못된 키

**해결:**
```bash
# 환경변수 확인
cat server/.env | grep GOOGLE_CLOUD_API_KEY

# 키가 없으면 추가
echo "GOOGLE_CLOUD_API_KEY=발급받은_키" >> server/.env

# 서버 재시작
npm start
```

### 3. 유통기한 알림이 표시되지 않음

**원인**: 만료 예정 식재료가 없거나 컴포넌트 미등록

**해결:**
```tsx
// App.tsx에 ExpiryNotifications 추가 확인
import { ExpiryNotifications } from "./components/ExpiryNotifications";

function App() {
  return (
    <>
      <ExpiryNotifications />
      {/* ... */}
    </>
  );
}
```

### 4. Step Map에서 단계가 표시되지 않음

**원인**: 식약처 API 응답 파싱 실패

**해결:**
```bash
# 레시피 상세 조회 테스트
curl "http://localhost:3001/api/recipes/detail/RCP_0001"

# steps 배열이 있는지 확인
# steps: [] 이면 식약처 API에 MANUAL 데이터 없음
```

---

## 🎉 최종 확인

모든 설정이 완료되었으면 다음을 테스트하세요:

1. **회원가입/로그인**
2. **식재료 추가** (일반 등록)
3. **AI 식재료 등록** (사진 촬영)
4. **유통기한 알림** 확인
5. **레시피 목록** 조회 (6개 카테고리)
6. **레시피 상세** → **Step Map** 시작
7. **조리 완료** → 히스토리 저장

---

## 📞 추가 지원

문제가 계속되면 다음 정보를 수집하세요:

```bash
# 서버 로그
cd server
npm start 2>&1 | tee server.log

# DB 상태
mysql -u root -p cooking_assistant -e "
  SELECT 
    'recipes_light' as table_name, COUNT(*) as count FROM recipes_light
  UNION ALL
  SELECT 'ingredients', COUNT(*) FROM ingredients
  UNION ALL
  SELECT 'users', COUNT(*) FROM users;
"

# API 테스트
curl http://localhost:3001/api/recipes/public?limit=5
curl http://localhost:3001/api/recipes/categories
```

이 정보로 정확한 문제 진단이 가능합니다.
