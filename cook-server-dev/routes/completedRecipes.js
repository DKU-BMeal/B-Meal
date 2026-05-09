// routes/completedRecipes.js
import express from 'express';
import { query } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ✅ 이 라우트 전체는 로그인 해야만 접근 가능
router.use(authenticateToken);


// 🔧 MySQL DATETIME 형식으로 변환하는 헬퍼
function toMySqlDateTime(value) {
  const d = value ? new Date(value) : new Date();

  if (Number.isNaN(d.getTime())) {
    // 이상한 값이 들어오면 그냥 지금 시간으로
    return new Date();
  }

  // mysql2는 JS Date 객체를 자동으로 'YYYY-MM-DD HH:MM:SS'로 바꿔줌
  return d;
}

// ============================================
// GET /api/completed-recipes
// 완료한 요리 목록 가져오기
// ============================================
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id; // 토큰에서 꺼낸 유저 ID (UUID)

    const rows = await query(
      `SELECT
        id,
        user_id,
        recipe_id,
        name,
        image,
        description,
        category,
        cooking_method,
        hashtags,
        ingredients_json,
        steps_json,
        cooking_time,
        servings,
        difficulty,
        completed_at
       FROM completed_recipes
       WHERE user_id = ?
       ORDER BY completed_at DESC`,
      [userId]
    );

    // rows 그대로 반환 → 프론트(api.ts)가 ingredients_json / steps_json을 파싱
    res.json({ recipes: rows });
  } catch (error) {
    console.error('GET /api/completed-recipes error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get completed recipes',
    });
  }
});


// ============================================
// POST /api/completed-recipes
// 요리 완료 시 한 건 저장
// ============================================
// routes/completedRecipes.js (POST 부분 수정)
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      id: recipeId,       // 프론트에서 넘기는 selectedRecipe.id
      name,
      image,
      description,
      category,
      cooking_method,
      hashtags,
      ingredients,
      steps,
      completedAt,
      cookingTime,
      servings,
      difficulty,
    } = req.body;

    console.log('POST /api/completed-recipes body:', req.body);

    if (!recipeId || !name) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'recipe id and name are required',
      });
    }

    


    // 🔥 여기서 배열 → JSON 문자열로 변환
    const ingredientsJson = JSON.stringify(ingredients ?? []);
    const stepsJson = JSON.stringify(steps ?? []);

    const completedAtValue = toMySqlDateTime(completedAt);

    await query(
      `INSERT INTO completed_recipes (
        user_id,
        recipe_id,
        name,
        image,
        description,
        category,
        cooking_method,
        hashtags,
        ingredients_json,
        steps_json,
        cooking_time,
        servings,
        difficulty,
        completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        recipeId,
        name,
        image ?? null,
        description ?? null,
        category ?? null,
        cooking_method ?? null,
        hashtags ?? null,
        ingredientsJson,           // ✅ 문자열로 저장
        stepsJson,                  // ✅ 문자열로 저장
        cookingTime ?? null,
        servings ?? null,
        difficulty ?? null,
        completedAtValue,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Completed recipe saved successfully',
    });
  } catch (error) {
    console.error('POST /api/completed-recipes error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to save completed recipe',
      detail: String(error?.message ?? error),
    });
  }
});

// ✅ 완료한 레시피 단건 조회 (ID로)
// ✅ 완료한 레시피 단건 조회 (recipe_id 기준 단일 조회)
// ✅ 완료한 레시피 단건 조회 (recipe_id 기준 + 로그인 유저 + 최신 1건)
router.get("/:id", async (req, res) => {
  const { id } = req.params;      // 🔥 이게 recipe_id
  const userId = req.user.id;

  try {
    const rows = await query(
      `
      SELECT *
      FROM completed_recipes
      WHERE recipe_id = ? AND user_id = ?
      ORDER BY completed_at DESC
      LIMIT 1
      `,
      [id, userId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "레시피 없음" });
    }

    const r = rows[0];

    const ingredients =
      typeof r.ingredients_json === "string"
        ? JSON.parse(r.ingredients_json)
        : r.ingredients_json ?? [];

    const steps =
      typeof r.steps_json === "string"
        ? JSON.parse(r.steps_json)
        : r.steps_json ?? [];

    res.setHeader("Cache-Control", "no-store");

    res.json({
      recipe: {
        id: r.recipe_id,          // 🔥 프론트 기준 ID 유지
        name: r.name,
        image: r.image,
        description: r.description,
        category: r.category,
        cooking_method: r.cooking_method,
        hashtags: r.hashtags,
        ingredients,
        steps,
        completedAt: r.completed_at,
        cookingTime: r.cooking_time,
        servings: r.servings,
        difficulty: r.difficulty,
      },
    });
  } catch (err) {
    console.error("❌ completed-recipes 단건 조회 실패:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});




export default router;
