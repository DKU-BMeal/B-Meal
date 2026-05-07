-- ============================================
-- INSERT SAMPLE DATA (Migration Step 002)
-- ============================================

INSERT INTO users (id, email, password_hash, name)
VALUES ('sample-user-001', 'demo@cooking.com', '$2a$10$YourHashedPasswordHere', '데모 사용자');

INSERT INTO ingredients (user_id, name, category, quantity, unit)
VALUES
('sample-user-001', '양파', '채소', '3', '개'),
('sample-user-001', '달걀', '유제품', '10', '개'),
('sample-user-001', '김치', '소스/양념', '1', '포기');