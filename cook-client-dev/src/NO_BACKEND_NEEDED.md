# 쿠킹 어시스턴트 - Mock API 모드

## ⚠️ 중요: Supabase 필요 없음

이 애플리케이션은 **완전히 localStorage 기반의 Mock API**를 사용합니다.

- ✅ **백엔드 서버 불필요**
- ✅ **Supabase 연결 불필요**
- ✅ **Edge Functions 배포 불필요**
- ✅ **데이터베이스 설정 불필요**

## 작동 방식

모든 데이터는 브라우저의 `localStorage`와 `sessionStorage`에 저장됩니다:

- 사용자 인증: `mock_users`
- 프로필: `mock_profiles`
- 식재료: `mock_ingredients`
- 저장된 레시피: `mock_saved_recipes`
- 요리 기록: `mock_cooking_history`

## Mock API 파일

전체 Mock API 구현: `/utils/api.ts`

## 데모 계정

- 이메일: `demo@cooking.com`
- 비밀번호: `demo123`

## Supabase 403 에러 무시

`/supabase/functions` 폴더는 시스템 보호 파일이므로 삭제할 수 없습니다.
Figma Make 플랫폼이 자동으로 배포를 시도하지만, 이 에러는 **무시해도 됩니다**.

앱은 Supabase 없이 정상 작동합니다.

## 실제 백엔드 연결 시

실제 백엔드를 연결하려면:
1. `/utils/api.ts` 파일을 실제 API 호출로 교체
2. `/server` 폴더의 Node.js 서버 사용
3. 또는 Supabase를 실제로 설정

현재는 **프론트엔드만으로 완전히 작동**합니다.
