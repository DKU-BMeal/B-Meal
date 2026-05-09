-- ============================================
-- RECIPE CRAWL HISTORY TABLE (Migration Step 005)
-- ============================================

DROP TABLE IF EXISTS recipes_light;

CREATE TABLE IF NOT EXISTS recipe_crawl_history (
    id SERIAL PRIMARY KEY,
    total_inserted INT NOT NULL,
    total_skipped INT NOT NULL,
    total_processed INT NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 참고: 레시피 데이터가 성공적으로 로드되려면, /api/recipes/crawl 엔드포인트를
-- 서버 구동 후 한 번 실행하여 FoodSafety API로부터 전체 레시피 데이터를
-- 'recipes' 테이블에 삽입해야 합니다.
