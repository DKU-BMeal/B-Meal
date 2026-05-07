# 🍳 식약처 API 기반 레시피 시스템 설정 가이드

식약처 레시피 API를 활용한 실시간 레시피 조회 및 Step Map 조리 시스템이 구현되었습니다.

---

## 📋 시스템 구조

### 1. **경량 DB 설계**
- **저장**: 레시피 메타데이터만 (id, name, category)
- **실시간 조회**: 상세 정보는 식약처 API에서 조회
- **장점**: DB 용량 최소화, 최신 데이터 항상 반영

### 2. **Step Map 시스템**
- MANUAL01~20을 실시간으로 파싱
- 단계별 이미지 + 텍스트 가이드
- 타이머, 진행률 표시
- 조리 완료 후 히스토리 저장

---

## 🚀 설정 방법

### Step 1: 식약처 API 키 발급

1. **식약처 오픈API 사이트 접속**
   ```
   https://www.foodsafetykorea.go.kr/api/openApiInfo.do
   ```

2. **회원가입 및 로그인**

3. **인증키 발급**
   - 메뉴: `인증키 발급`
   - 활용 목적: 쿠킹 어시스턴트 레시피 서비스
   - API 서비스: `COOKRCP01` (조리식품의 레시피 DB)

4. **발급된 API 키 확인**
   - 예: `1234567890abcdef1234567890abcdef`

### Step 2: 환경변수 설정

**백엔드 `.env` 파일에 추가:**

```bash
# 식약처 API 키
FOODSAFETY_API_KEY=발급받은_API_키_입력

# 기존 환경변수는 그대로 유지
DB_HOST=localhost
DB_PORT=3306
...
```

### Step 3: 데이터베이스 마이그레이션

새로운 테이블이 추가되었습니다:
- `recipes_light`: 레시피 메타데이터
- `cooking_sessions`: 진행 중인 조리 세션
- `cooking_history`: 조리 완료 기록 (기존에 있었으나 수정됨)

```bash
cd server

# 방법 1: 새로 마이그레이션
mysql -u root -p -e "DROP DATABASE IF EXISTS cooking_assistant; CREATE DATABASE cooking_assistant;"
npm run migrate

# 방법 2: 기존 DB에 테이블만 추가
mysql -u root -p cooking_assistant < migrations/add_recipe_tables.sql
```

### Step 4: 레시피 데이터 크롤링 (최초 1회)

전체 레시피 목록을 DB에 저장합니다.

```bash
# 백엔드 서버 실행
cd server
npm start

# 다른 터미널에서 크롤링 실행
`curl -X POST http://localhost:3001/api/recipes/crawl`
```

**예상 결과:**
```json
{
  "success": true,
  "message": "Recipe crawl completed",
  "inserted": 2847,
  "skipped": 0,
  "total": 2847
}
```

크롤링 소요 시간: 약 3-5분

---

## 🎯 API 엔드포인트

### 공용 레시피 API (인증 불필요)

#### 1. 레시피 목록 조회
```
GET /api/recipes/public?category=반찬&search=김치&limit=50&offset=0
```

**응답:**
```json
{
  "recipes": [
    {
      "id": "RCP_0001",
      "name": "김치볶음밥",
      "category": "밥",
      "cooking_method": "볶음",
      "hashtags": "#김치 #볶음밥 #간단"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

#### 2. 레시피 상세 조회 (실시간 API 호출)
```
GET /api/recipes/detail/:id
```

**응답:**
```json
{
  "recipe": {
    "id": "RCP_0001",
    "name": "김치볶음밥",
    "category": "밥",
    "ingredients": "김치 200g, 밥 1공기, 참기름 1스푼...",
    "steps": [
      {
        "step": 1,
        "text": "김치를 잘게 썬다",
        "image": "http://..."
      },
      {
        "step": 2,
        "text": "팬에 기름을 두르고 김치를 볶는다",
        "image": "http://..."
      }
    ],
    "calories": "450kcal",
    "protein": "12g",
    "fat": "8g"
  }
}
```

### 조리 세션 API (인증 필요)

#### 3. 조리 시작
```
POST /api/recipes/session/start
Body: { "recipe_id": "RCP_0001", "recipe_name": "김치볶음밥" }
```

#### 4. 조리 종료
```
PUT /api/recipes/session/finish/:session_id
Body: { "rating": 5, "memo": "맛있었어요!" }
```

#### 5. 현재 진행 중인 세션
```
GET /api/recipes/session/active
```

---

## 🧪 테스트 방법

### 1. 레시피 목록 조회 테스트

```bash
curl http://localhost:3001/api/recipes/public?limit=10
```

### 2. 레시피 상세 조회 테스트

```bash
# 먼저 목록에서 레시피 ID 확인 후
curl http://localhost:3001/api/recipes/detail/RCP_SEQ번호
```

### 3. 조리 세션 테스트 (인증 필요)

```bash
# 로그인하여 토큰 획득
TOKEN="your_jwt_token"

# 세션 시작
curl -X POST http://localhost:3001/api/recipes/session/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipe_id":"RCP_0001","recipe_name":"김치볶음밥"}'

# 세션 종료
curl -X PUT http://localhost:3001/api/recipes/session/finish/세션ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating":5,"memo":"맛있었어요!"}'
```

---

## 🎨 프론트엔드 사용법

### StepMap 컴포넌트 사용

```tsx
import { StepMap } from "./components/StepMap";

function RecipeDetailPage() {
  const [showStepMap, setShowStepMap] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  const handleStartCooking = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    setShowStepMap(true);
  };

  if (showStepMap && selectedRecipeId) {
    return (
      <StepMap 
        recipeId={selectedRecipeId} 
        onBack={() => setShowStepMap(false)} 
      />
    );
  }

  return (
    <div>
      <Button onClick={() => handleStartCooking("RCP_0001")}>
        조리 시작
      </Button>
    </div>
  );
}
```

### API 클라이언트 사용

```tsx
import { getPublicRecipes, getRecipeDetail, startCookingSession } from "../utils/api";

// 레시피 목록 조회
const { recipes } = await getPublicRecipes({ 
  category: "반찬", 
  search: "김치",
  limit: 20 
});

// 레시피 상세 조회
const { recipe } = await getRecipeDetail("RCP_0001");

// 조리 세션 시작
const { session_id } = await startCookingSession("RCP_0001", "김치볶음밥");
```

---

## 📊 데이터 구조

### recipes_light 테이블
```sql
CREATE TABLE recipes_light (
    id VARCHAR(100) PRIMARY KEY,          -- 식약처 RCP_SEQ
    name VARCHAR(255) NOT NULL,           -- 레시피 이름
    category VARCHAR(50),                 -- 카테고리 (반찬/국/밥 등)
    cooking_method VARCHAR(50),           -- 조리 방법 (볶음/찜 등)
    hashtags TEXT,                        -- 해시태그
    ingredients_count INT,               -- 재료 텍스트 길이
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### cooking_sessions 테이블
```sql
CREATE TABLE cooking_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    recipe_id VARCHAR(100),
    recipe_name VARCHAR(255),
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    total_time INT,                      -- 조리 시간 (초)
    current_step INT,
    rating INT,
    memo TEXT
);
```

---

## 🔧 문제 해결

### ❌ "API key is invalid" 오류
**원인:** 환경변수에 API 키가 없거나 잘못됨  
**해결:**
```bash
# .env 파일 확인
cat server/.env | grep FOODSAFETY_API_KEY

# 키가 없으면 추가
echo "FOODSAFETY_API_KEY=발급받은_키" >> server/.env

# 서버 재시작
npm start
```

### ❌ "Table 'recipes_light' doesn't exist" 오류
**원인:** 마이그레이션 미실행  
**해결:**
```bash
cd server
npm run migrate
```

### ❌ 레시피 상세 조회가 너무 느림
**원인:** 식약처 API가 ID 직접 조회를 지원하지 않아 전체 순회  
**해결:** 캐싱 도입 (Redis 추천) 또는 전체 레시피 상세를 DB에 저장하는 방식으로 전환 가능

### ❌ 크롤링 실패
**원인:** API Rate Limiting 또는 네트워크 오류  
**해결:**
```javascript
// foodsafety-api.js의 crawlAllRecipes 함수에서
// 대기 시간 늘리기
await new Promise(resolve => setTimeout(resolve, 2000)); // 1000 → 2000
```

---

## 💡 최적화 팁

### 1. Redis 캐싱 도입
레시피 상세 정보를 Redis에 캐싱하여 조회 속도 향상:

```javascript
// 캐시 확인
const cached = await redis.get(`recipe:${recipeId}`);
if (cached) return JSON.parse(cached);

// API 호출
const recipe = await foodsafetyAPI.getRecipeDetail(recipeId);

// 캐시 저장 (24시간)
await redis.setex(`recipe:${recipeId}`, 86400, JSON.stringify(recipe));
```

### 2. 전체 레시피 상세 DB 저장 (선택)
DB 용량이 충분하다면 MANUAL01~20도 저장하여 조회 속도 극대화:

```sql
ALTER TABLE recipes_light 
ADD COLUMN steps JSON;
```

단점: DB 크기 증가 (~500MB), 정기적 업데이트 필요

### 3. 이미지 CDN 캐싱
식약처 이미지를 자체 CDN에 복사하여 로딩 속도 향상

---

## 📈 향후 개선 사항

- [ ] AI 기반 레시피 추천
- [ ] 사용자 보유 식재료 기반 레시피 필터링
- [ ] 음성 가이드와 Step Map 연동
- [ ] 조리 영상 녹화 기능
- [ ] 레시피 공유 기능
- [ ] 나만의 레시피 등록

---

## 🎉 완료!

이제 식약처 API 기반 레시피 시스템이 완전히 작동합니다.

**다음 단계:**
1. ✅ API 키 발급
2. ✅ 환경변수 설정
3. ✅ 마이그레이션 실행
4. ✅ 레시피 크롤링
5. ✅ 프론트엔드 테스트
6. 🎊 서비스 시작!

문제가 있으면 위 "문제 해결" 섹션을 참고하세요.
