-- ============================================
-- BASE TABLES CREATION (PostgreSQL Version)
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    allergies JSONB DEFAULT NULL,
    preferences JSONB DEFAULT NULL,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at);

CREATE TABLE IF NOT EXISTS email_verifications (
    email VARCHAR(255) PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ingredients (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    storage VARCHAR(20) DEFAULT 'room',
    quantity VARCHAR(50),
    unit VARCHAR(20),
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ingredients_user_id ON ingredients (user_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients (category);
CREATE INDEX IF NOT EXISTS idx_ingredients_storage ON ingredients (storage);
CREATE INDEX IF NOT EXISTS idx_ingredients_expiry_date ON ingredients (expiry_date);
CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients (name);

CREATE TABLE IF NOT EXISTS recipes (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50),
    cooking_method VARCHAR(50),
    image_small VARCHAR(500),
    image_large VARCHAR(500),
    info_weight VARCHAR(50),
    info_energy VARCHAR(50),
    info_carb VARCHAR(50),
    info_protein VARCHAR(50),
    info_fat VARCHAR(50),
    info_sodium VARCHAR(50),
    ingredients_details TEXT,
    hashtags TEXT,
    sodium_tip TEXT,
    manual_01 TEXT, manual_02 TEXT, manual_03 TEXT, manual_04 TEXT, manual_05 TEXT,
    manual_06 TEXT, manual_07 TEXT, manual_08 TEXT, manual_09 TEXT, manual_10 TEXT,
    manual_11 TEXT, manual_12 TEXT, manual_13 TEXT, manual_14 TEXT, manual_15 TEXT,
    manual_16 TEXT, manual_17 TEXT, manual_18 TEXT, manual_19 TEXT, manual_20 TEXT,
    ingredients_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes (name);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes (category);
CREATE INDEX IF NOT EXISTS idx_recipes_cooking_method ON recipes (cooking_method);

CREATE TABLE IF NOT EXISTS saved_recipes (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    recipe_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    difficulty VARCHAR(20),
    cooking_time VARCHAR(50),
    image VARCHAR(500),
    description TEXT,
    ingredients JSONB,
    steps JSONB,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, recipe_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_recipes_user_id ON saved_recipes (user_id);
CREATE INDEX IF NOT EXISTS idx_saved_recipes_category ON saved_recipes (category);
CREATE INDEX IF NOT EXISTS idx_saved_recipes_saved_at ON saved_recipes (saved_at);
CREATE INDEX IF NOT EXISTS idx_saved_recipes_name ON saved_recipes (name);

CREATE TABLE IF NOT EXISTS cooking_history (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) NOT NULL,
    recipe_id VARCHAR(100) NOT NULL,
    recipe_name VARCHAR(255) NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cooking_history_user_id ON cooking_history (user_id);
CREATE INDEX IF NOT EXISTS idx_cooking_history_completed_at ON cooking_history (completed_at);

CREATE TABLE IF NOT EXISTS cooking_sessions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) NOT NULL,
    recipe_id VARCHAR(100) NOT NULL,
    recipe_name VARCHAR(255) NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP,
    total_time INT,
    current_step INT DEFAULT 1,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    memo TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cooking_sessions_user_id ON cooking_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_cooking_sessions_started_at ON cooking_sessions (started_at);

CREATE TABLE IF NOT EXISTS recipe_crawl_history (
    id SERIAL PRIMARY KEY,
    total_inserted INT NOT NULL,
    total_skipped INT NOT NULL,
    total_processed INT NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
