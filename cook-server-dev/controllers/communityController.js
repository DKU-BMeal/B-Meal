import pool from "../config/db.js";  // ✅ 이게 정답


/**
 * ✅ 커뮤니티 전체 조회 (북마크 인기순)
 */
export const getCommunityReviews = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        c.*,
        r.image_large AS recipe_image,   -- ✅ 원본 레시피 이미지 추가
        COUNT(sr.id) AS bookmark_count,
        COUNT(DISTINCT cc.id) AS comment_count
      FROM community_reviews c
      LEFT JOIN recipes r
        ON c.recipe_id = r.id
      LEFT JOIN saved_recipes sr 
        ON c.recipe_id = sr.recipe_id
      LEFT JOIN community_comments cc           -- ⭐ 댓글 테이블 조인
        ON c.id = cc.review_id
      GROUP BY c.id
      ORDER BY bookmark_count DESC
    `);

    return res.json(rows);
  } catch (error) {
    console.error("getCommunityReviews error:", error);
    res.status(500).json({ message: "커뮤니티 조회 실패" });
  }
};


/**
 * ✅ 커뮤니티 리뷰 작성
 */
export const createCommunityReview = async (req, res) => {
  try {
    const userId = req.user.id; // ✅ 로그인 미들웨어 기준
    const {
      recipeId,
      recipeName,
      rating,
      review,
      imageUrl,
      userName,
      userInitial,
    } = req.body;

    await pool.query(
      `
      INSERT INTO community_reviews (
        user_id, recipe_id, recipe_name,
        rating, review, image_url,
        user_name, user_initial
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        userId,
        recipeId,
        recipeName,
        rating,
        review,
        imageUrl || null,
        userName,
        userInitial,
      ]
    );

    res.json({ message: "리뷰 등록 완료" });
  } catch (error) {
    console.error("createCommunityReview error:", error);
    res.status(500).json({ message: "리뷰 등록 실패" });
  }
};

/**
 * ✅ 댓글 조회
 */
export const getCommunityComments = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `
      SELECT *
      FROM community_comments
      WHERE review_id = ?
      ORDER BY created_at ASC
    `,
      [id]
    );

    res.json(rows);
  } catch (error) {
    console.error("getCommunityComments error:", error);
    res.status(500).json({ message: "댓글 조회 실패" });
  }
};

/**
 * ✅ 댓글 작성
 */
export const createCommunityComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params; // review_id
    const { text, userName, userInitial } = req.body;

    await pool.query(
      `
      INSERT INTO community_comments (
        review_id, user_id,
        user_name, user_initial,
        text
      )
      VALUES (?, ?, ?, ?, ?)
    `,
      [id, userId, userName, userInitial, text]
    );

    res.json({ message: "댓글 작성 완료" });
  } catch (error) {
    console.error("createCommunityComment error:", error);
    res.status(500).json({ message: "댓글 작성 실패" });
  }
};


/**
 * ✅ 커뮤니티 게시글 삭제
 */
export const deleteCommunityReview = async (req, res) => {
  try {
    const { reviewId } = req.params;   // ✅ 이름 맞춤
    const userId = req.user.id;

    const [result] = await pool.query(
      `
      DELETE FROM community_reviews
      WHERE id = ? AND user_id = ?
      `,
      [reviewId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(403).json({ message: "삭제 권한 없음" });
    }

    res.json({ message: "삭제 완료" });
  } catch (error) {
    console.error("deleteCommunityReview error:", error);
    res.status(500).json({ message: "삭제 실패" });
  }
};


/**
 * ✅ 댓글 삭제
 */
export const deleteCommunityComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const [result] = await pool.query(
      `
      DELETE FROM community_comments
      WHERE id = ? AND user_id = ?
      `,
      [commentId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(403).json({ message: "댓글 삭제 권한 없음" });
    }

    res.json({ message: "댓글 삭제 완료" });
  } catch (error) {
    console.error("deleteCommunityComment error:", error);
    res.status(500).json({ message: "댓글 삭제 실패" });
  }
};
