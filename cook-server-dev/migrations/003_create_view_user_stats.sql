-- ============================================
-- CREATE VIEW USER_STATS (Migration Step 003)
-- ============================================

CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(DISTINCT i.id) as total_ingredients,
    COUNT(DISTINCT sr.id) as total_saved_recipes,
    COUNT(DISTINCT ch.id) as total_completed_recipes
FROM users u
LEFT JOIN ingredients i ON u.id = i.user_id
LEFT JOIN saved_recipes sr ON u.id = sr.user_id
LEFT JOIN cooking_history ch ON u.id = ch.user_id
GROUP BY u.id, u.name, u.email;