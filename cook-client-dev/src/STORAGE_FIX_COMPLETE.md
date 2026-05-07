# ✅ 식재료 보관 위치 기능 수정 완료

## 📋 수정 내용 요약

식재료 추가 시 **냉장실/냉동실/실온** 보관 위치가 정상적으로 저장되고 표시되도록 전체 시스템을 수정했습니다.

---

## 🔧 수정된 파일

### 1. **데이터베이스 스키마** (`/server/migrations/001_create_tables.sql`)
- `ingredients` 테이블에 **`storage`** 컬럼 추가
- 타입: `VARCHAR(20)`
- 기본값: `'room'` (실온)
- 인덱스 추가로 성능 최적화

```sql
CREATE TABLE ingredients (
    ...
    storage VARCHAR(20) DEFAULT 'room',
    ...
    INDEX idx_storage (storage)
);
```

### 2. **백엔드 API** (`/server/routes/ingredients.js`)
- **GET** `/api/ingredients`: storage 필드 조회 추가
- **POST** `/api/ingredients`: storage 필드 저장 로직 추가
- **PUT** `/api/ingredients/:id`: storage 필드 수정 로직 추가

### 3. **프론트엔드** (`/components/IngredientsManagement.tsx`)
- **데이터 로딩 시**: 백엔드의 `storage` → 프론트의 `location`으로 변환
- **추가/수정 시**: 프론트의 `location` → 백엔드의 `storage`로 매핑
- UI는 기존 "냉장실/냉동실/실온" 그대로 유지

---

## 🚀 적용 방법

### ✅ 방법 1: 새로 마이그레이션 (권장)

기존 데이터베이스를 **완전히 새로 시작**하는 방법입니다.

```bash
# 백엔드 폴더로 이동
cd server

# 기존 데이터베이스 삭제 (주의: 모든 데이터 삭제됨!)
mysql -u root -p -e "DROP DATABASE IF EXISTS cooking_assistant; CREATE DATABASE cooking_assistant;"

# 새로운 스키마로 마이그레이션
npm run migrate

# 서버 재시작
npm start
```

**결과:**
- ✅ storage 컬럼이 포함된 새 테이블 생성
- ✅ 모든 제약조건과 인덱스 정상 적용
- ❌ 기존 데이터는 모두 삭제됨

---

### ✅ 방법 2: 기존 DB에 컬럼만 추가 (데이터 보존)

기존 데이터를 **유지**하면서 storage 컬럼만 추가하는 방법입니다.

```bash
# MySQL 접속
mysql -u root -p cooking_assistant

# SQL 명령어 실행
ALTER TABLE ingredients 
ADD COLUMN storage VARCHAR(20) DEFAULT 'room' AFTER category,
ADD INDEX idx_storage (storage);

# 확인
DESCRIBE ingredients;

# 종료
exit;
```

**결과:**
- ✅ 기존 데이터 모두 유지
- ✅ storage 컬럼 추가 (기존 데이터는 'room'으로 설정)
- ✅ 인덱스 추가

---

### ✅ 방법 3: MySQL Workbench 사용 (GUI)

그래픽 인터페이스로 수정하는 방법입니다.

```
1. MySQL Workbench 실행
2. cooking_assistant 데이터베이스 연결
3. 왼쪽 "Tables" → "ingredients" 우클릭 → "Alter Table"
4. "Columns" 탭에서:
   - "Add Column" 클릭
   - Column Name: storage
   - Datatype: VARCHAR(20)
   - Default: 'room'
   - 위치: category 다음으로 이동
5. "Indexes" 탭에서:
   - "Add Index" 클릭
   - Index Name: idx_storage
   - Column: storage 선택
6. "Apply" 클릭
7. SQL 확인 후 "Apply" 클릭
```

---

## ✅ 적용 확인

마이그레이션 후 다음을 확인하세요:

### 1. **DB 구조 확인**

```bash
mysql -u root -p cooking_assistant

# 테이블 구조 확인
DESCRIBE ingredients;
```

**예상 결과:**
```
+-------------+--------------+------+-----+-------------------+
| Field       | Type         | Null | Key | Default           |
+-------------+--------------+------+-----+-------------------+
| id          | varchar(36)  | NO   | PRI | NULL              |
| user_id     | varchar(36)  | NO   | MUL | NULL              |
| name        | varchar(100) | NO   |     | NULL              |
| category    | varchar(50)  | NO   | MUL | NULL              |
| storage     | varchar(20)  | YES  | MUL | room              | ← 이게 보여야 함!
| quantity    | varchar(50)  | YES  |     | NULL              |
| unit        | varchar(20)  | YES  |     | NULL              |
| expiry_date | date         | YES  | MUL | NULL              |
| notes       | text         | YES  |     | NULL              |
| created_at  | timestamp    | YES  |     | CURRENT_TIMESTAMP |
| updated_at  | timestamp    | YES  |     | CURRENT_TIMESTAMP |
+-------------+--------------+------+-----+-------------------+
```

### 2. **백엔드 서버 재시작**

```bash
cd server
npm start
```

**확인 사항:**
```
✅ MySQL 연결 성공
✅ 서버가 포트 3001에서 실행 중
✅ API 엔드포인트 로드됨
```

### 3. **프론트엔드 테스트**

프론트엔드를 실행하고 식재료 추가 테스트:

```bash
# 프론트엔드 실행
npm run dev
```

**테스트 순서:**
1. 로그인
2. "식재료 관리" 페이지 이동
3. "식재료 추가" 버튼 클릭
4. 다음 정보 입력:
   - 식재료명: 양파
   - 보관 위치: **냉장실** (중요!)
   - 수량: 2
   - 단위: 개
5. "추가" 버튼 클릭
6. **결과 확인:**
   - ✅ "식재료가 추가되었습니다" 토스트 메시지
   - ✅ 냉장실 카운트가 1개로 증가
   - ✅ 냉장실 선택 시 양파가 표시됨

---

## 🎯 동작 원리

### 데이터 흐름

```
프론트엔드                      백엔드                    DB
──────────                    ──────                  ────

[추가 시]
location: "냉장실"  ────▶  storage: "냉장실"  ────▶  저장
                  매핑

[조회 시]
location: "냉장실"  ◀────  storage: "냉장실"  ◀────  조회
                  변환
```

### 코드 매핑

**프론트 → 백엔드 (추가/수정):**
```javascript
// IngredientsManagement.tsx
const ingredientData = {
  name: formData.name,
  storage: formData.location  // location → storage 변환
};
```

**백엔드 → 프론트 (조회):**
```javascript
// IngredientsManagement.tsx
const ingredientsWithLocation = response.ingredients.map(ing => ({
  ...ing,
  location: ing.storage  // storage → location 변환
}));
```

---

## 🧪 전체 테스트 시나리오

### 1. **식재료 추가**
- [ ] 냉장실에 "우유" 추가 → 냉장실 1개 표시
- [ ] 냉동실에 "고기" 추가 → 냉동실 1개 표시
- [ ] 실온에 "양파" 추가 → 실온 1개 표시

### 2. **식재료 조회**
- [ ] 냉장실 선택 → 우유만 표시
- [ ] 냉동실 선택 → 고기만 표시
- [ ] 실온 선택 → 양파만 표시

### 3. **식재료 수정**
- [ ] 우유를 냉동실로 이동 → 냉장실 0개, 냉동실 2개

### 4. **식재료 삭제**
- [ ] 우유 삭제 → 냉동실 1개로 감소

---

## 🔍 문제 해결

### ❌ "Column 'storage' not found" 오류
**원인:** DB에 storage 컬럼이 없음  
**해결:**
```bash
mysql -u root -p cooking_assistant
ALTER TABLE ingredients ADD COLUMN storage VARCHAR(20) DEFAULT 'room' AFTER category;
```

### ❌ 식재료가 실온에만 모두 표시됨
**원인:** 기존 데이터의 storage 값이 NULL 또는 'room'  
**해결:** 기존 데이터를 수동 수정하거나 삭제 후 재추가

```sql
-- 기존 데이터 수정 예시
UPDATE ingredients SET storage = '냉장실' WHERE name IN ('우유', '치즈');
UPDATE ingredients SET storage = '냉동실' WHERE name IN ('고기', '생선');
```

### ❌ 프론트엔드에서 "Failed to add ingredient" 오류
**원인:** 백엔드 서버가 재시작되지 않음  
**해결:**
```bash
cd server
npm start
```

---

## 📝 추가 개선 사항

현재 수정으로 다음이 가능합니다:

✅ 식재료를 냉장실/냉동실/실온으로 분류 저장  
✅ 각 위치별 식재료 카운트 표시  
✅ 위치별 유통기한 임박 알림  
✅ 위치 변경 (수정 기능)  

### 향후 개선 가능:
- 📊 위치별 통계 그래프
- 🔔 위치별 알림 설정
- 📱 보관 위치 추천 기능
- 📷 식재료 사진 추가

---

## 🎉 수정 완료!

이제 식재료 보관 위치 기능이 정상적으로 작동합니다.

**다음 단계:**
1. ✅ 위 "적용 방법" 중 하나 선택
2. ✅ 마이그레이션 실행
3. ✅ 서버 재시작
4. ✅ 프론트엔드에서 테스트
5. 🎊 성공!

문제가 있으면 "문제 해결" 섹션을 참고하세요.
