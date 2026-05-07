import db from "../config/db.js";

class RecipeService {
  // 모든 레시피 조회 (검색 및 카테고리 필터 포함)
  async findAllRecipes(filters = {}) {
    const { category, search, limit = 50, offset = 0 } = filters;
    
    // 기본 쿼리 (로그에 찍힌 형식 유지)
    let query = `
      SELECT 
        id, 
        name, 
        category, 
        cooking_method, 
        hashtags, 
        ingredients_count, 
        image_large AS image 
      FROM recipes 
      WHERE 1=1
    `;
    const params = [];

    // ✅ 카테고리 필터 (로그의 TRIM 적용)
    if (category && category !== "전체") {
      query += " AND TRIM(category) LIKE ?";
      params.push(`%${category}%`);
    }

    // ✅ 검색어 필터 (누락되었던 핵심 로직 추가)
    if (search) {
      query += " AND name LIKE ?";
      params.push(`%${search}%`);
    }

    // 정렬 및 페이징
    query += " ORDER BY name ASC LIMIT ? OFFSET ?";
    params.push(Number(limit), Number(offset));

    try {
      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      console.error("[RecipeService] Error:", error);
      throw error;
    }
  }

  // 특정 ID로 레시피 조회
  async findRecipeById(id) {
    const [rows] = await db.execute("SELECT * FROM recipes WHERE id = ?", [id]);
    return rows[0];
  }

  // 새 레시피 생성
  async createRecipe(recipeData) {
    const [result] = await db.query("INSERT INTO recipes SET ?", [recipeData]);
    return { id: result.insertId, ...recipeData };
  }

  // 레시피 업데이트
  async updateRecipe(id, recipeData) {
    await db.query("UPDATE recipes SET ? WHERE id = ?", [recipeData, id]);
    return this.findRecipeById(id);
  }

  // 레시피 삭제
  async deleteRecipe(id) {
    const [result] = await db.execute("DELETE FROM recipes WHERE id = ?", [id]);
    return result.affectedRows > 0;
  }
}

export default new RecipeService();