import express from 'express';
import { chatWithGPT, chatFollowup, chatIntent, personalizeRecipe, recommendDishes } from '../controllers/aiController.js';

const router = express.Router();

// GPT 레시피 생성
router.post('/ai/chat', chatWithGPT);

// GPT Follow-up (요리 중 대화 / 재료 부족 / 수정)
router.post('/ai/followup', chatFollowup);

// 레시피 프로필 맞춤화
router.post('/ai/personalize', personalizeRecipe);

// 의도 감지
router.post('/ai/intent', chatIntent);

// 요리 추천 목록
router.post('/ai/recommend', recommendDishes);

export default router;
