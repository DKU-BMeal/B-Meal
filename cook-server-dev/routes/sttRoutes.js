// routes/sttRoutes.js
import express from "express";
import multer from "multer";
import { stt } from "../services/aiService.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/stt", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "audio 파일이 없습니다." });
    }

    const audioBuffer = req.file.buffer;
    const text = await stt(audioBuffer);

    return res.json({ text });
  } catch (err) {
    console.error("STT Error:", err);
    return res.status(500).json({ error: "STT 실패" });
  }
});

export default router;
