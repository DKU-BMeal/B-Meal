import express from 'express';
import { chatWithGPT, chatFollowup, chatIntent } from '../controllers/aiController.js';

const router = express.Router();

// GPT 레시피 생성
router.post('/ai/chat', chatWithGPT);

// GPT Follow-up (요리 중 대화 / 재료 부족 / 수정)
router.post('/ai/followup', chatFollowup);

// 의도 감지
router.post('/ai/intent', chatIntent);

export default router;
