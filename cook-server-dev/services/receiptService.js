import axios from "axios";
import fs from "fs";
import FormData from "form-data";

// ✅ 1️⃣ 네이버 CLOVA OCR: 이미지 → 텍스트
async function runOCR(imagePath) {
  const apiUrl = process.env.NAVER_OCR_API_URL;
  const secretKey = process.env.NAVER_OCR_SECRET_KEY;

  if (!apiUrl || !secretKey) {
    throw new Error("네이버 OCR API 키가 .env에 설정되지 않았습니다.");
  }

  const formData = new FormData();
  formData.append("file", fs.createReadStream(imagePath));
  formData.append(
    "message",
    JSON.stringify({
      version: "V2",
      requestId: Date.now().toString(),
      timestamp: Date.now(),
      images: [
        {
          format: "jpg",
          name: "receipt",
        },
      ],
    })
  );

  const response = await axios.post(apiUrl, formData, {
    headers: {
      ...formData.getHeaders(),
      "X-OCR-SECRET": secretKey,
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  const fields = response.data.images?.[0]?.fields || [];

  // ✅ OCR로 추출된 모든 텍스트를 하나의 문자열로 합침
  const fullText = fields.map((f) => f.inferText).join("\n");

  return fullText;
}

// ✅ 2️⃣ GPT: 영수증 텍스트 → 식재료 JSON 파싱
async function runGPTParser(receiptText) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY가 .env에 없습니다.");
  }

  const prompt = `
아래는 마트 영수증 OCR 결과야.
여기서 **식재료 이름, 수량, 단위만** 추출해서
반드시 아래 JSON 배열 형식으로만 출력해.

형식:
[
  { "name": "양파", "quantity": "2", "unit": "개" }
]

영수증 내용:
${receiptText}

⚠️ 설명 없이 JSON만 출력해.
  `;

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "너는 영수증을 식재료 JSON으로 변환하는 AI다." },
        { role: "user", content: prompt },
      ],
      temperature: 0,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  const raw = response.data.choices[0].message.content;

  try {
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.error("GPT JSON 파싱 실패:", raw);
    throw new Error("GPT가 올바른 JSON을 반환하지 않았습니다.");
  }
}

// ✅ 3️⃣ 최종 함수: 이미지 → 식재료 배열
export async function parseReceiptImage(imagePath) {
  // 1. OCR 실행
  const text = await runOCR(imagePath);

  console.log("✅ OCR 결과:\n", text);

  // 2. GPT 파싱
  const ingredients = await runGPTParser(text);

  // 3. 최소 필드 검증
  return ingredients
    .filter((ing) => ing.name && ing.quantity && ing.unit)
    .map((ing) => ({
      name: String(ing.name),
      quantity: String(ing.quantity),
      unit: String(ing.unit),
    }));
}
