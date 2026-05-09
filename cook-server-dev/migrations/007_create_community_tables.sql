-- ============================================
-- COMMUNITY TABLES (Migration Step 007)
-- ============================================

CREATE TABLE IF NOT EXISTS community_reviews (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) NOT NULL,
    recipe_id VARCHAR(255) NOT NULL,
    recipe_name VARCHAR(255) NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review TEXT NOT NULL,
    image_url TEXT,
    user_name VARCHAR(100) NOT NULL,
    user_initial CHAR(2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_community_reviews_recipe_id ON community_reviews (recipe_id);
CREATE INDEX IF NOT EXISTS idx_community_reviews_user_id ON community_reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_community_reviews_created_at ON community_reviews (created_at);

CREATE TABLE IF NOT EXISTS community_comments (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    review_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    user_initial CHAR(2) NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (review_id) REFERENCES community_reviews(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_community_comments_review_id ON community_comments (review_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_user_id ON community_comments (user_id);
