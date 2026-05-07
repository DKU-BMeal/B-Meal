import express from 'express';
import { query } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ============================================
// Get User Profile
// ============================================
router.get('/', async (req, res) => {
  try {
    const users = await query(
  'SELECT id, email, name, allergies, preferences, created_at, updated_at FROM users WHERE email = ?',
  [req.user.email]
  );


    if (users.length === 0) {
      return res.status(404).json({
        error: 'Profile not found'
      });
    }

    const profile = users[0];
    
    // Parse JSON fields
    if (profile.allergies && typeof profile.allergies === 'string') {
      profile.allergies = JSON.parse(profile.allergies);
    }
    if (profile.preferences && typeof profile.preferences === 'string') {
      profile.preferences = JSON.parse(profile.preferences);
    }

    res.json({ profile });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch profile'
    });
  }
});

// ============================================
// Update User Profile
// ============================================
router.put('/', async (req, res) => {
  console.log("📥 PROFILE UPDATE BODY:", req.body);
  console.log("🔑 현재 토큰 유저:", req.user);

  try {
    const userEmail = req.user.email;
    const { name, allergies, preferences } = req.body;

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }

    if (allergies !== undefined) {
      updates.push('allergies = ?');
      values.push(JSON.stringify(allergies));
    }

    if (preferences !== undefined) {
      updates.push('preferences = ?');
      values.push(JSON.stringify(preferences));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No fields to update',
      });
    }

    // WHERE 조건에 email 사용
    values.push(userEmail);

    await query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE email = ?`,
      values
    );

    // 업데이트된 프로필 다시 조회
    const users = await query(
      'SELECT id, email, name, allergies, preferences, created_at, updated_at FROM users WHERE email = ?',
      [userEmail]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Profile not found after update' });
    }

    const profile = users[0];

    if (profile.allergies && typeof profile.allergies === 'string') {
      profile.allergies = JSON.parse(profile.allergies);
    }
    if (profile.preferences && typeof profile.preferences === 'string') {
      profile.preferences = JSON.parse(profile.preferences);
    }

    res.json({ profile });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update profile',
    });
  }
});



// ============================================
// Delete Account
// ============================================
router.delete('/', async (req, res) => {
  try {
    const userEmail = req.user.email;

    // 유저 존재 확인 + id 가져오기
    const users = await query('SELECT id FROM users WHERE email = ?', [userEmail]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].id;

    // ⚠️ (선택) user_id로 연결된 테이블이 있으면 여기서 먼저 삭제
    // 예)
    // await query('DELETE FROM ingredients WHERE user_id = ?', [userId]);
    // await query('DELETE FROM completed_recipes WHERE user_id = ?', [userId]);
    // await query('DELETE FROM saved_recipes WHERE user_id = ?', [userId]);
    // await query('DELETE FROM user_stats WHERE id = ?', [userId]);

    // 마지막에 users 삭제
    await query('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ ok: true });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete account',
    });
  }
});



// ============================================
// Get User Statistics
// ============================================
router.get('/stats', async (req, res) => {
  try {
    const stats = await query(
      'SELECT * FROM user_stats WHERE id = ?',
      [req.user.id]
    );

    if (stats.length === 0) {
      return res.json({
        stats: {
          total_ingredients: 0,
          total_saved_recipes: 0,
          total_completed_recipes: 0
        }
      });
    }

    res.json({ stats: stats[0] });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch statistics'
    });
  }
});

export default router;
