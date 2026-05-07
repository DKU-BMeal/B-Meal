#!/bin/bash

echo "--- 백엔드 서버 API 자동 테스트 시작 (jq 없이) ---"

MYSQL_PW="Imaru112!!"
API_URL="http://localhost:3001/api"
DB_NAME="cooking_assistant"
TEST_EMAIL="test@test.com"
TEST_PW="123456"
TEST_NAME="테스트"
TOKEN=""
USER_ID=""
RECIPE_ID=""

echo ">> 백엔드 서버가 실행 중인지 확인하세요 (npm run dev)"
sleep 1

# -------------------------------------------------------------------
echo "--- 1. 서버 헬스 체크 ---"
curl -s $API_URL/health
echo
echo

# -------------------------------------------------------------------
echo "--- 2. 레시피 목록 가져오기 ---"
PUBLIC_RECIPES=$(curl -s "$API_URL/recipes/public?limit=1")
echo "$PUBLIC_RECIPES"
echo

# JSON에서 값을 jq 없이 뽑기 → grep + cut 활용
RECIPE_ID=$(echo "$PUBLIC_RECIPES" | grep -o '"id":"[^"]*"' | head -1 | cut -d '"' -f4)
echo "획득한 레시피 ID: $RECIPE_ID"
echo

# -------------------------------------------------------------------
echo "--- 3. 회원가입 ---"
curl -s -X POST $API_URL/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"'$TEST_EMAIL'","password":"'$TEST_PW'","name":"'$TEST_NAME'"}'
echo
echo

# -------------------------------------------------------------------
echo "--- 4. 로그인 ---"
AUTH_RESPONSE=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"'$TEST_EMAIL'","password":"'$TEST_PW'"}')

echo "$AUTH_RESPONSE"
echo

TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d '"' -f4)
USER_ID=$(echo "$AUTH_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d '"' -f4)

echo "TOKEN: $TOKEN"
echo "USER_ID: $USER_ID"
echo

if [ -z "$TOKEN" ]; then
  echo "로그인 실패 → 인증 필요한 테스트 건너뜀"
  exit 1
fi

# -------------------------------------------------------------------
echo "--- 5. 식재료 등록 ---"
EXPIRY_DATE=$(date -d "+3 days" +"%Y-%m-%d")
curl -s -X POST $API_URL/ingredients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"양파","category":"채소","expiry_date":"'$EXPIRY_DATE'"}'
echo
echo

# -------------------------------------------------------------------
echo "--- 6. 유통기한 임박 알림 ---"
curl -s "$API_URL/ingredients/notifications/expiry" \
  -H "Authorization: Bearer $TOKEN"
echo
echo

# -------------------------------------------------------------------
echo "--- 7. 레시피 저장 ---"
curl -s -X POST $API_URL/recipes/save \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipe_id":"'$RECIPE_ID'"}'
echo
echo

# -------------------------------------------------------------------
echo "--- 8. 레시피 상세 조회 ---"
curl -s "$API_URL/recipes/detail/$RECIPE_ID"
echo
echo

# -------------------------------------------------------------------
echo "--- 9. DB 확인 ---"
mysql -u root -p$MYSQL_PW $DB_NAME -e "SELECT COUNT(*) FROM users;"
mysql -u root -p$MYSQL_PW $DB_NAME -e "SELECT COUNT(*) FROM ingredients;"
mysql -u root -p$MYSQL_PW $DB_NAME -e "SELECT COUNT(*) FROM saved_recipes;"

echo "--- 테스트 완료 ---"
