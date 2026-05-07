import pool from "../config/db.js";  // ✅ 이게 정답


/**
 * ✅ 커뮤니티에서 레시피 북마크 저장
 */
export const saveRecipe = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      recipeId,
      name,
      category,
      difficulty,
      cookingTime,
      image,
      description,
      ingredients,
      steps,
    } = req.body;

    await pool.query(
      `
      INSERT IGNORE INTO saved_recipes (
        id, user_id, recipe_id,
        name, category, difficulty,
        cooking_time, image, description,
        ingredients, steps
      )
      VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        userId,
        recipeId,
        name,
        category,
        difficulty,
        cookingTime,
        image,
        description,
        JSON.stringify(ingredients || []),
        JSON.stringify(steps || []),
      ]
    );

    res.json({ message: "저장 완료" });
  } catch (error) {
    console.error("saveRecipe error:", error);
    res.status(500).json({ message: "저장 실패" });
  }
};
