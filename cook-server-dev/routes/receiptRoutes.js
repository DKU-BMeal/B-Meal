console.log("✅ receiptRoutes.js LOADED");

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { parseReceiptImage } from "../services/receiptService.js";

const router = express.Router();

// ✅ 업로드 폴더 자동 생성
const uploadDir = path.join(process.cwd(), "uploads/receipts");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ multer 설정 (이미지 업로드)
const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  },
});

// ✅ POST /api/receipt/parse
router.post("/parse", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "이미지가 업로드되지 않았습니다.",
      });
    }

    const filePath = req.file.path;

    // ✅ OCR + GPT 파싱 서비스 실행
    const ingredients = await parseReceiptImage(filePath);

    // ✅ 업로드된 파일 삭제 (서버 용량 보호)
    fs.unlink(filePath, () => {});

    return res.json({
      success: true,
      ingredients,
    });
  } catch (err) {
    console.error("🔴 Receipt parse error:", err);
    return res.status(500).json({
      error: "영수증 분석 중 오류가 발생했습니다.",
      message: err.message,
    });
  }
});

export default router;
