-- ============================================
-- CATEGORY NORMALIZATION FOR recipes (Migration Step 004)
-- recipes_light 테이블에 대한 모든 참조를 recipes 테이블로 변경합니다.
-- ============================================

-- 0. NULL 방지
UPDATE recipes
SET category = '기타'
WHERE category IS NULL OR TRIM(category) = '';

-- 1. 카테고리 정규화
UPDATE recipes
SET category = CASE
    -- 밥류
    WHEN category LIKE '%밥%' OR category LIKE '%볶음밥%' OR category LIKE '%비빔밥%' THEN '밥'
    WHEN category LIKE '%죽%' OR category LIKE '%덮밥%' THEN '밥'

    -- 국/탕류
    WHEN category LIKE '%국%' OR category LIKE '%탕%' THEN '국/탕'

    -- 찌개류
    WHEN category LIKE '%찌개%' OR category LIKE '%전골%' THEN '찌개'

    -- 반찬류
    WHEN category LIKE '%반찬%' OR category LIKE '%밑반찬%' THEN '반찬'
    WHEN category LIKE '%나물%' OR category LIKE '%무침%' THEN '반찬'
    WHEN category LIKE '%조림%' OR category LIKE '%볶음%' THEN '반찬'

    -- 구이/튀김
    WHEN category LIKE '%구이%' OR category LIKE '%적%' THEN '구이'
    WHEN category LIKE '%튀김%' OR category LIKE '%전%' THEN '튀김'

    -- 면류
    WHEN category LIKE '%면%' OR category LIKE '%국수%' OR category LIKE '%파스타%' THEN '면류'

    -- 찜류
    WHEN category LIKE '%찜%' THEN '찜'

    -- 디저트/빵류
    WHEN category LIKE '%후식%' OR category LIKE '%디저트%' THEN '디저트'
    WHEN category LIKE '%빵%' OR category LIKE '%케이크%' THEN '디저트'

    -- 음료
    WHEN category LIKE '%음료%' OR category LIKE '%차%' THEN '음료'

    -- 일품/퓨전
    WHEN category LIKE '%일품%' THEN '일품'
    WHEN category LIKE '%퓨전%' THEN '퓨전'

    ELSE '기타'
END;

-- 2. 정규화 후 비어 있는 항목 처리
UPDATE recipes
SET category = '기타'
WHERE category IS NULL OR TRIM(category) = '';