# 🔧 레시피 시스템 문제 해결 가이드

## 📊 현재 상황 진단

### 1단계: 카테고리 분포 확인

```bash
# 서버 실행
cd server
npm start

# 다른 터미널에서 카테고리 확인
curl http://localhost:3001/api/recipes/categories
```

**예상 응답:**
```json
{
  "total": 1146,
  "null_count": 0,
  "categories": [
    { "category": "밥", "count": 245 },
    { "category": "국/탕", "count": 189 },
    { "category": "반찬", "count": 312 }
  ]
}
```

**문제 확인:**
- `null_count > 0` → NULL 카테고리 존재
- 카테고리 이름이 프론트가 기대하는 값과 다름 (예: "밥류", "한식" 등)

---

## 🔨 문제 해결 단계

### Step 1: DB 마이그레이션 확인

현재 테이블 구조 확인:

```bash
mysql -u root -p cooking_assistant

# 테이블 목록 확인
SHOW TABLES;

# recipes_light 테이블 확인
DESCRIBE recipes_light;

# 데이터 샘플 확인
SELECT id, name, category, cooking_method FROM recipes_light LIMIT 5;
```

**예상 결과:**
```
+--------------------+--------------+
| id                 | name         |
+--------------------+--------------+
| RCP_0001           | 김치볶음밥    |
+--------------------+--------------+
```

만약 `recipes_light` 테이블이 없다면:

```bash
cd server
npm run migrate
```

---

### Step 2: 레시피 크롤링

DB에 레시피가 없거나 적다면 크롤링 실행:

```bash
# 서버 실행 상태에서
curl -X POST http://localhost:3001/api/recipes/crawl
```

**주의사항:**
1. **식약처 API 키**가 `.env`에 설정되어 있어야 함
2. 크롤링은 **5-10분** 소요
3. **API Rate Limit** 때문에 실패하면 재시도

**진행 상황 확인:**
```bash
# 서버 로그 확인
[Recipe Crawl] Inserting 1146 recipes into DB...
[Recipe Crawl] Complete: 1146 inserted, 0 skipped
```

---

### Step 3: 카테고리 매핑

실제 카테고리 값이 프론트와 맞지 않으면 통합 필요:

```bash
mysql -u root -p cooking_assistant < server/migrations/fix_categories.sql
```

**또는 수동으로:**

```sql
-- 현재 카테고리 확인
SELECT DISTINCT category, COUNT(*) 
FROM recipes_light
GROUP BY category
ORDER BY COUNT(*) DESC;

-- 카테고리 통합
UPDATE recipes_light
SET category = CASE
    WHEN category LIKE '%밥%' THEN '밥'
    WHEN category LIKE '%국%' OR category LIKE '%탕%' THEN '국/탕'
    WHEN category LIKE '%찌개%' THEN '찌개'
    WHEN category LIKE '%반찬%' THEN '반찬'
    WHEN category LIKE '%면%' THEN '면류'
    WHEN category LIKE '%구이%' THEN '구이'
    WHEN category LIKE '%튀김%' THEN '튀김'
    WHEN category LIKE '%찜%' THEN '찜'
    WHEN category LIKE '%디저트%' OR category LIKE '%후식%' THEN '디저트'
    ELSE '기타'
END;

-- 결과 확인
SELECT category, COUNT(*) 
FROM recipes_light
GROUP BY category;
```

---

### Step 4: API 테스트

#### 4-1. 레시피 목록 조회

```bash
curl "http://localhost:3001/api/recipes/public?limit=20"
```

**정상 응답:**
```json
{
  "recipes": [
    {
      "id": "RCP_0001",
      "name": "김치볶음밥",
      "category": "밥",
      "cooking_method": "볶음",
      "hashtags": "#김치 #볶음밥",
      "ingredients_count": 150
    }
  ],
  "total": 20,
  "limit": 20,
  "offset": 0
}
```

**오류 발생 시:**
```json
{
  "error": "Internal server error",
  "message": "Failed to fetch recipes",
  "details": "..."
}
```

→ 서버 로그 확인: `[Public Recipes] Error: ...`

#### 4-2. 레시피 상세 조회

```bash
# 먼저 레시피 ID 하나 확인
curl "http://localhost:3001/api/recipes/public?limit=1"

# 해당 ID로 상세 조회
curl "http://localhost:3001/api/recipes/detail/RCP_0001"
```

**정상 응답:**
```json
{
  "recipe": {
    "id": "RCP_0001",
    "name": "김치볶음밥",
    "steps": [
      {
        "step": 1,
        "text": "팬에 기름을 두르고...",
        "image": "http://..."
      },
      {
        "step": 2,
        "text": "김치를 넣고 볶는다...",
        "image": "http://..."
      }
    ]
  }
}
```

**주의:** 식약처 API에서 실시간 조회하므로 **느릴 수 있음** (10-30초)

---

## ❌ 흔한 문제와 해결

### 문제 1: "Failed to fetch recipes"

**원인:**
- `recipes_light` 테이블이 비어있음
- 카테고리가 모두 NULL
- SQL 쿼리 오류

**해결:**
```bash
# 1. 레시피 개수 확인
mysql -u root -p cooking_assistant -e "SELECT COUNT(*) FROM recipes_light;"

# 2. 비어있으면 크롤링
curl -X POST http://localhost:3001/api/recipes/crawl

# 3. NULL 카테고리 확인
mysql -u root -p cooking_assistant -e "SELECT COUNT(*) FROM recipes_light WHERE category IS NULL;"

# 4. NULL이 많으면 fix_categories.sql 실행
mysql -u root -p cooking_assistant < server/migrations/fix_categories.sql
```

---

### 문제 2: 프론트에서 레시피가 표시되지 않음

**원인:**
- CORS 문제
- API URL 오타
- 백엔드 미실행

**해결:**

1. **백엔드 실행 확인**
   ```bash
   ps aux | grep node
   # 3001 포트에서 실행 중이어야 함
   ```

2. **CORS 설정 확인 (server/index.js)**
   ```javascript
   app.use(cors({
     origin: ['http://localhost:5173', 'http://localhost:3000'],
     credentials: true
   }));
   ```

3. **프론트 환경변수 확인 (루트 .env)**
   ```bash
   VITE_API_URL=http://localhost:3001/api
   ```

4. **브라우저 콘솔 확인**
   - F12 → Network 탭
   - `recipes/public` 요청 확인
   - 상태 코드가 200이 아니면 오류

---

### 문제 3: 레시피 상세 조회가 너무 느림

**원인:** 식약처 API가 ID 직접 조회를 지원하지 않아 전체 순회

**임시 해결:**
```javascript
// foodsafety-api.js의 getRecipeDetail에서
// 배치 크기 줄이기
const batchSize = 500; // 1000 → 500
```

**영구 해결:**
- Redis 캐싱 도입
- 또는 MANUAL 데이터도 DB에 저장 (용량 증가)

---

### 문제 4: Step Map에서 이미지가 표시되지 않음

**원인:**
- `MANUAL_IMG01` 등이 빈 문자열
- 이미지 URL이 잘못됨

**해결:**
```javascript
// StepMap.tsx에서 이미지 null 체크
{currentStepData.image && currentStepData.image !== '' && (
  <ImageWithFallback
    src={currentStepData.image}
    alt={`단계 ${currentStepData.step}`}
  />
)}
```

---

### 문제 5: "FOODSAFETY_API_KEY is not defined"

**원인:** 환경변수 미설정

**해결:**
```bash
# server/.env 파일 확인
cat server/.env | grep FOODSAFETY_API_KEY

# 없으면 추가
echo "FOODSAFETY_API_KEY=발급받은_키" >> server/.env

# 서버 재시작
npm start
```

---

## ✅ 최종 검증 체크리스트

### 백엔드

- [ ] `npm start` 실행 후 포트 3001에서 실행 중
- [ ] `curl http://localhost:3001/health` 성공
- [ ] `curl http://localhost:3001/api/recipes/categories` 성공
- [ ] `curl http://localhost:3001/api/recipes/public?limit=5` 레시피 5개 반환
- [ ] 서버 로그에 오류 없음

### 데이터베이스

- [ ] `recipes_light` 테이블 존재
- [ ] 레시피 데이터 1000개 이상
- [ ] NULL 카테고리 0개
- [ ] 카테고리 종류 10개 내외 (밥, 국/탕, 반찬 등)

### 프론트엔드

- [ ] `.env` 파일에 `VITE_API_URL` 설정됨
- [ ] `npm run dev` 실행 후 포트 5173에서 실행
- [ ] 브라우저 콘솔에 CORS 오류 없음
- [ ] 레시피 목록 페이지에서 카드 표시
- [ ] 레시피 클릭 시 상세 페이지 로드

---

## 🚨 긴급 복구

모든 것을 처음부터 다시 시작:

```bash
# 1. DB 완전 삭제
mysql -u root -p -e "DROP DATABASE IF EXISTS cooking_assistant; CREATE DATABASE cooking_assistant;"

# 2. 마이그레이션
cd server
npm run migrate

# 3. 레시피 크롤링
npm start &
sleep 5
curl -X POST http://localhost:3001/api/recipes/crawl

# 4. 카테고리 통합
mysql -u root -p cooking_assistant < migrations/fix_categories.sql

# 5. 검증
curl "http://localhost:3001/api/recipes/public?limit=5"
```

---

## 📞 추가 디버깅

문제가 계속되면 다음 정보 수집:

```bash
# 1. 서버 로그 전체
cd server
npm start 2>&1 | tee server.log

# 2. DB 상태
mysql -u root -p cooking_assistant -e "
  SELECT 
    (SELECT COUNT(*) FROM recipes_light) as total_recipes,
    (SELECT COUNT(*) FROM recipes_light WHERE category IS NULL) as null_categories,
    (SELECT COUNT(DISTINCT category) FROM recipes_light) as unique_categories;
"

# 3. 샘플 레시피 5개
mysql -u root -p cooking_assistant -e "
  SELECT id, name, category, cooking_method 
  FROM recipes_light 
  LIMIT 5;
"
```

이 정보를 공유하면 정확한 원인 파악 가능합니다.
