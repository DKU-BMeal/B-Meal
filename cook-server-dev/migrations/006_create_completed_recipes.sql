DROP TABLE IF EXISTS completed_recipes;

CREATE TABLE completed_recipes (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  recipe_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  image TEXT,
  description TEXT,
  category VARCHAR(100),
  cooking_method VARCHAR(100),
  hashtags TEXT,
  ingredients_json JSONB,
  steps_json JSONB,
  cooking_time VARCHAR(50),
  servings VARCHAR(50),
  difficulty VARCHAR(50),
  completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_completed_user ON completed_recipes (user_id);
CREATE INDEX IF NOT EXISTS idx_completed_recipe ON completed_recipes (recipe_id);
