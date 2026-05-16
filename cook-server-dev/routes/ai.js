import express from 'express';
import { chatWithGPT, chatFollowup, chatIntent, chatMealPlan, chatWasteTips } from '../controllers/aiController.js';

const router = express.Router();

// GPT 레시피 생성
router.post('/ai/chat', chatWithGPT);

// GPT Follow-up (요리 중 대화 / 재료 부족 / 수정)
router.post('/ai/followup', chatFollowup);

// 의도 감지
router.post('/ai/intent', chatIntent);

// 예산 기반 식단 생성
router.post('/ai/meal-plan', chatMealPlan);

// 낭비 팁 생성
router.post('/ai/waste-tips', chatWasteTips);

export default router;
