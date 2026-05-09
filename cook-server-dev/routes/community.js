import express from "express";
import {
  getCommunityReviews,
  createCommunityReview,
  getCommunityComments,
  createCommunityComment,
  deleteCommunityReview, 
  deleteCommunityComment, 
} from "../controllers/communityController.js";

const router = express.Router();

// 커뮤니티 전체 조회 (인기순)
router.get("/", getCommunityReviews);

// 커뮤니티 리뷰 작성
router.post("/", createCommunityReview);

// 댓글 조회
router.get("/:id/comments", getCommunityComments);

// 댓글 작성
router.post("/:id/comments", createCommunityComment);

// ✅ 리뷰 삭제 (명확화)
router.delete("/:reviewId", deleteCommunityReview);

// ✅ 댓글 삭제
router.delete("/:reviewId/comments/:commentId", deleteCommunityComment);


export default router;
