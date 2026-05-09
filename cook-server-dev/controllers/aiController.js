// aiController.js (최적화 버전)
import { 
  askGPT, 
  askGPTFollowup, 
  askIntent, 
  isQuickNextCommand // 서비스에서 추가한 유틸리티 함수 임포트
} from "../services/aiService.js";

// ===============================================
// ★ GPT 기본 레시피 생성 API
// ===============================================
export const chatWithGPT = async (req, res) => {
  try {
    const { message, profile } = req.body;

    const forbiddenKeywords = ["주식", "정치", "비트코인", "게임", "욕설"];
      if (forbiddenKeywords.some(kw => message.includes(kw))) {
        return res.json({ 
          reply: JSON.stringify({ 
            assistantMessage: "죄송합니다. 저는 요리 보조 AI로서 요리와 관련된 질문에만 답변해 드릴 수 있습니다.",
            // 👈 recipe 관련 필드들을 null 혹은 빈 값으로 명시하여 클라이언트 에러 방지
            recipeName: null,
            fullIngredients: null,
            steps: null 
          })
        });
      }
    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "message is required" });
    }

    const reply = await askGPT(message, profile);
    res.json({ reply });
  } catch (err) {
    console.error("GPT Error:", err);
    res.status(500).json({ error: "레시피 생성 중 오류가 발생했습니다." });
  }
};

// ===============================================
// ★ Follow-up API (안정성 및 속도 최적화 버전)
// ===============================================
export const chatFollowup = async (req, res) => {
  try {
    const { recipe, question, profile } = req.body;

    if (!recipe || !question) {
      return res.status(400).json({ error: "recipe and question are required" });
    }

    // 1. [속도 최적화] "다음 단계" 키워드 선제적 처리 (GPT 호출 생략)
    // 사용자가 '다음', '계속' 등을 입력하면 AI 서비스 로직을 타지 않고 즉시 응답 생성
    if (isQuickNextCommand(question)) {
      console.log("[Fast Path] '다음' 키워드 감지 - 즉각 응답");
      return res.json({
        assistantMessage: "좋습니다! 다음 단계로 넘어갈게요.",
        recipe: recipe // 클라이언트가 currentStepIndex를 올릴 수 있도록 기존 레시피 그대로 반환
      });
    }

    // 2. 일반적인 질문이나 재료 변경 요청은 기존대로 GPT 처리
    console.log("FOLLOW-UP REQUEST:", { question });
    const result = await askGPTFollowup(recipe, question, profile);
    
    // 3. [안정성] 응답 구조 검증 (누락 방지)
    if (!result.assistantMessage || !result.recipe) {
      throw new Error("Invalid GPT response format");
    }

    res.json(result);
  } catch (err) {
    console.error("GPT Follow-up Error:", err);
    // 에러 발생 시 사용자에게 기존 데이터를 보존하도록 응답
    res.status(500).json({ 
      error: "대화 처리 중 오류가 발생했습니다.",
      recipe: req.body.recipe // 상태 유지를 위해 받은 레시피 반환
    });
  }
};

// ===============================================
// ★ 의도 감지 API
// ===============================================
export const chatIntent = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "text is required" });
    }

    // [속도 최적화] 명확한 '시작' 키워드는 DB/AI 없이 즉시 판별
    const fastStartKeywords = ["시작하자", "시작해줘", "조리시작"];
    if (fastStartKeywords.includes(text.replace(/\s/g, ""))) {
      return res.json({ intent: { intent: "start" } });
    }

    const intent = await askIntent(text);
    res.json({ intent });
  } catch (err) {
    console.error("Intent Error:", err);
    res.status(500).json({ intent: { intent: "none" } }); // 실패 시 기본값으로 안전하게 응답
  }
};