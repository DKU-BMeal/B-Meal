import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);


// ============================================
// Get All Ingredients
// ============================================
router.get('/', async (req, res) => {
  try {
    const ingredients = await query(
      `SELECT id, user_id, name, category, storage, quantity, unit, expiry_date, notes, created_at, updated_at 
       FROM ingredients 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({ ingredients });

  } catch (error) {
    console.error('Get ingredients error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch ingredients'
    });
  }
});


// ============================================
// Get Single Ingredient
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const ingredients = await query(
      'SELECT * FROM ingredients WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (ingredients.length === 0) {
      return res.status(404).json({
        error: 'Ingredient not found'
      });
    }

    res.json({ ingredient: ingredients[0] });

  } catch (error) {
    console.error('Get ingredient error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch ingredient'
    });
  }
});

// ============================================
// Add Ingredient
// ============================================
router.post('/', async (req, res) => {
  try {
    const { name, category, storage, quantity, unit, expiry_date, notes } = req.body;

    // Validation
    if (!name || !category) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Name and category are required'
      });
    }

    const ingredientId = uuidv4();

    await query(
      `INSERT INTO ingredients (id, user_id, name, category, storage, quantity, unit, expiry_date, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ingredientId, req.user.id, name, category, storage || null, quantity || null, unit || null, expiry_date || null, notes || null]
    );

    // Fetch created ingredient
    const ingredients = await query(
      'SELECT * FROM ingredients WHERE id = ?',
      [ingredientId]
    );

    res.status(201).json({
      success: true,
      ingredient: ingredients[0]
    });

  } catch (error) {
    console.error('Add ingredient error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add ingredient'
    });
  }
});

// ============================================
// Update Ingredient
// ============================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, storage, quantity, unit, expiry_date, notes } = req.body;

    // Check if ingredient exists and belongs to user
    const existing = await query(
      'SELECT id FROM ingredients WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Ingredient not found'
      });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }
    if (storage !== undefined) {
      updates.push('storage = ?');
      values.push(storage);
    }
    if (quantity !== undefined) {
      updates.push('quantity = ?');
      values.push(quantity);
    }
    if (unit !== undefined) {
      updates.push('unit = ?');
      values.push(unit);
    }
    if (expiry_date !== undefined) {
      updates.push('expiry_date = ?');
      values.push(expiry_date);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No fields to update'
      });
    }

    values.push(id);

    await query(
      `UPDATE ingredients SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    // Fetch updated ingredient
    const ingredients = await query(
      'SELECT * FROM ingredients WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      ingredient: ingredients[0]
    });

  } catch (error) {
    console.error('Update ingredient error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update ingredient'
    });
  }
});

// ============================================
// Delete Ingredient
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM ingredients WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Ingredient not found'
      });
    }

    res.json({
      success: true,
      message: 'Ingredient deleted successfully'
    });

  } catch (error) {
    console.error('Delete ingredient error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete ingredient'
    });
  }
});

// ============================================
// Get Ingredients by Category
// ============================================
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;

    const ingredients = await query(
      `SELECT * FROM ingredients 
       WHERE user_id = ? AND category = ? 
       ORDER BY created_at DESC`,
      [req.user.id, category]
    );

    res.json({ ingredients });

  } catch (error) {
    console.error('Get ingredients by category error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch ingredients'
    });
  }
});

// ============================================
// Get Expiring Soon Ingredients
// ============================================
router.get('/expiring/soon', async (req, res) => {
  try {
    const days = req.query.days || 7; // Default 7 days

    const ingredients = await query(
      `SELECT * FROM ingredients 
       WHERE user_id = ? 
       AND expiry_date IS NOT NULL 
       AND expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
       ORDER BY expiry_date ASC`,
      [req.user.id, days]
    );

    res.json({ ingredients });

  } catch (error) {
    console.error('Get expiring ingredients error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch expiring ingredients'
    });
  }
});

// ============================================
// Get Expiry Notifications (3일전, 1일전)
// ============================================
router.get('/notifications/expiry', async (req, res) => {
  try {
    // 3일 이내 만료 예정 (오늘 포함)
    const threeDays = await query(
      `SELECT * FROM ingredients 
       WHERE user_id = ? 
       AND expiry_date IS NOT NULL 
       AND expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
       ORDER BY expiry_date ASC`,
      [req.user.id]
    );

    // 1일 이내 만료 예정
    const oneDay = await query(
      `SELECT * FROM ingredients 
       WHERE user_id = ? 
       AND expiry_date IS NOT NULL 
       AND expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 1 DAY)
       ORDER BY expiry_date ASC`,
      [req.user.id]
    );

    // 오늘 만료
    const today = await query(
      `SELECT * FROM ingredients 
       WHERE user_id = ? 
       AND expiry_date = CURDATE()`,
      [req.user.id]
    );

    res.json({
      notifications: {
        today: today,
        one_day: oneDay,
        three_days: threeDays
      },
      total: threeDays.length
    });

  } catch (error) {
    console.error('Get expiry notifications error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch expiry notifications'
    });
  }
});

// ============================================
// AI 식재료 등록 (Vision API)
// ============================================
router.post('/ai-register', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Image is required'
      });
    }

    console.log('[AI Register] Processing image with Vision API...');

    // Google Cloud Vision API 호출
    const visionApiKey = process.env.GOOGLE_CLOUD_API_KEY;
    
    if (!visionApiKey) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'Google Cloud API Key is not configured'
      });
    }

    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: image },
              features: [
                { type: 'LABEL_DETECTION', maxResults: 10 },
                { type: 'OBJECT_LOCALIZATION', maxResults: 10 }
              ]
            }
          ]
        })
      }
    );

    const visionData = await visionResponse.json();

    if (!visionData.responses || !visionData.responses[0]) {
      throw new Error('Invalid Vision API response');
    }

    const labels = visionData.responses[0].labelAnnotations || [];
    const objects = visionData.responses[0].localizedObjectAnnotations || [];

    console.log('[AI Register] Detected labels:', labels.map(l => l.description));
    console.log('[AI Register] Detected objects:', objects.map(o => o.name));

    // 식재료 카테고리 매핑
    const categoryMap = {
      'Vegetable': '채소',
      'Fruit': '과일',
      'Meat': '육류',
      'Fish': '수산물',
      'Dairy': '유제품',
      'Grain': '곡물',
      'Seasoning': '양념',
      'Beverage': '음료',
      'Food': '기타'
    };

    // 가장 높은 confidence 라벨 선택
    let detectedIngredient = null;
    let detectedCategory = '기타';

    if (labels.length > 0) {
      detectedIngredient = labels[0].description;
      
      // 카테고리 추론
      for (const label of labels) {
        const desc = label.description.toLowerCase();
        if (desc.includes('vegetable')) detectedCategory = '채소';
        else if (desc.includes('fruit')) detectedCategory = '과일';
        else if (desc.includes('meat') || desc.includes('beef') || desc.includes('pork')) detectedCategory = '육류';
        else if (desc.includes('fish') || desc.includes('seafood')) detectedCategory = '수산물';
        else if (desc.includes('dairy') || desc.includes('milk') || desc.includes('cheese')) detectedCategory = '유제품';
        else if (desc.includes('grain') || desc.includes('rice')) detectedCategory = '곡물';
        
        if (detectedCategory !== '기타') break;
      }
    }

    res.json({
      success: true,
      detected: {
        name: detectedIngredient,
        category: detectedCategory,
        labels: labels.slice(0, 5).map(l => ({
          name: l.description,
          confidence: l.score
        })),
        objects: objects.slice(0, 5).map(o => ({
          name: o.name,
          confidence: o.score
        }))
      }
    });

  } catch (error) {
    console.error('[AI Register] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process image',
      details: error.message
    });
  }
});

export default router;