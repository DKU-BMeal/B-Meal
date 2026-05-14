import express from "express";
import { getDietStats, getDietProfile, getDietRecommendations } from "../controllers/dietReportController.js";

const router = express.Router();

router.get("/stats",           getDietStats);
router.get("/profile",         getDietProfile);
router.get("/recommendations", getDietRecommendations);

export default router;
