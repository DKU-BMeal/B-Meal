// === VoiceAssistant.tsx — Wakeword + 동일 처리 + 무음 종료 (MERGED VERSION) ===
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Mic, MicOff, Bot, User, Send } from "lucide-react";
import { toast } from "sonner";
import { askGPT_raw, askCookingFollowup } from "../utils/api";
import type { Recipe } from "../types/recipe";
import { speakText, stopSpeaking } from "../utils/tts";
import { Progress } from "./ui/progress";
import type { UserProfile } from "./ProfileSetup";
import type { FullRecipe } from "./FoodRecipe";
import { addCompletedRecipe } from "../utils/api";
import { v4 as uuidv4 } from "uuid";


const CHAT_SAVE_KEY = "voice_assistant_chat_state_v1";
// ✅ 세션별 저장 키 (App.tsx에서 내려준 voiceSessionKey 사용)
const getStorageKey = (sessionKey: number) =>
  `${CHAT_SAVE_KEY}_${sessionKey}`;



// ===============================
// Types
// ===============================
interface VoiceAssistantProps {
  onRecipeSelect: (recipe: Recipe) => void;
  onBack: () => void;
  initialRecipe?: Recipe | null;
  userProfile: UserProfile | null;
  onCookingComplete?: (recipe: Recipe) => void;
  onNewChat?: () => void;
  sessionKey: number;
  // ★ FoodRecipe에서 넘어오는 전체 레시피(DB 기반)
  initialRecipeContext?: FullRecipe | null;
}

interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  text: string;
  timestamp: Date;
}

interface FollowupResult {
  assistantMessage: string;
  recipe: Recipe;
}

// ===============================
// 🔥 Text Normalizer — (음성/채팅 동일하게 처리)
// ===============================
function normalizeText(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/[?？!.,]/g, "")
    .split(/\.|!|\?|~|…/)[0]
    .replace(/\s+/g, " ")
    .trim();
}
//여기수정
// ===============================
// 🔊 타이머 종료 효과음
// ===============================
function playTimerSound() {
  const audio = new Audio("/sounds/timer-end.mp3");
  audio.volume = 1.0;
  audio.play().catch(() => {});
}

//여기수정
// ===============================
// 🔥 Step 내의 "1분 30초", "30초" 등 시간 자동 감지
// ===============================
function extractSecondsFromText(stepText: string): number | null {
  const minuteMatch = stepText.match(/(\d+)\s*분/);
  const secondMatch = stepText.match(/(\d+)\s*초/);

  let total = 0;

  if (minuteMatch) total += parseInt(minuteMatch[1], 10) * 60;
  if (secondMatch) total += parseInt(secondMatch[1], 10);

  return total > 0 ? total : null;
}

// 봇이 생각 중일 때 보여줄 점 애니메이션 컴포넌트 선언
const TypingDots = () => {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    let step = 0;
    const interval = setInterval(() => {
      setDots([".", "..", "..."][step % 3]);
      step++;
    }, 400);
    return () => clearInterval(interval);
  }, []);
  return <span>{dots}</span>;
};


// ===============================
// Component
// ===============================
export function VoiceAssistant({
  onRecipeSelect,
  onBack,
  initialRecipe,
  userProfile,
  onCookingComplete,
  initialRecipeContext,
  onNewChat,
  sessionKey,
}: VoiceAssistantProps) {
  // ====== 상태 ======
    const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [voiceFatalError, setVoiceFatalError] = useState(false);

  const [recipeInfo, setRecipeInfo] = useState<Recipe | null>(
    initialRecipe ?? null
  );
  //여기 수정 88까지
  // 🟦 재료 부족 → 대체재 선택 흐름 관리용 상태
  const [replacementMode, setReplacementMode] = useState<{
    missing: string | null;
    options: string[] | null;
  } | null>(null);

  // 🟦 "어떤 재료로 대체할까요?" 라고 이미 물어본 상태인지
  const [awaitingReplacementChoice, setAwaitingReplacementChoice] =
    useState(false);


  const [ingredientsChecked, setIngredientsChecked] = useState(false);
  const [cookingStarted, setCookingStarted] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // ✅ sessionStorage에서 채팅을 복원했는지(초기화 useEffect가 덮어쓰지 않게)
  const didRestoreRef = useRef(false);
  // ✅ resetChat 중 "빈 상태"가 다시 저장되는 걸 막기 위한 플래그
  const suppressAutoSaveRef = useRef(false);

  // ===============================
  // 🔥 타이머 상태
  // ===============================
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<any>(null);

  // 🔥 타이머 대기 상태 (추가)
const [pendingTimerSeconds, setPendingTimerSeconds] = useState<number | null>(null);

  //이거 추가
  const [originalTimerSeconds, setOriginalTimerSeconds] = useState<number | null>(null);

  // 🔥 단계 관련 최신 상태를 들고 있을 ref들
  const ingredientsCheckedRef = useRef(ingredientsChecked);
  const cookingStartedRef = useRef(cookingStarted);
  const currentStepIndexRef = useRef(currentStepIndex);
  const recipeInfoRef = useRef<Recipe | null>(recipeInfo);
  const completedStepsRef = useRef<number[]>(completedSteps);
  const replacementModeRef = useRef(replacementMode);
  const awaitingReplacementChoiceRef = useRef(awaitingReplacementChoice);

  // Wakeword / Command recognizer
  const [isWakeActive, setIsWakeActive] = useState(false);
  const isWakeActiveRef = useRef(false);
  const wakeRecognizerRef = useRef<any | null>(null);
  const commandRecognizerRef = useRef<any | null>(null);
  const silenceTimerRef = useRef<number | null>(null);

  // ❗ 치명적인 에러(not-allowed) 발생 시 자동 재시작 막기 위한 플래그
  const hardErrorRef = useRef(false);

  // keep wake active ref synced
  useEffect(() => {
    isWakeActiveRef.current = isWakeActive;
  }, [isWakeActive]);

  // ✅ 마운트 시: 이전 채팅 상태 복원
  useEffect(() => {
  try {
    const STORAGE_KEY = getStorageKey(sessionKey);
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const saved = JSON.parse(raw);

    if (Array.isArray(saved.messages)) {
      setMessages(
        saved.messages.map((m: any) => ({
          ...m,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        }))
      );
    }

    if (saved.recipeInfo) setRecipeInfo(saved.recipeInfo);
    if (typeof saved.ingredientsChecked === "boolean") setIngredientsChecked(saved.ingredientsChecked);
    if (typeof saved.cookingStarted === "boolean") setCookingStarted(saved.cookingStarted);
    if (typeof saved.currentStepIndex === "number") setCurrentStepIndex(saved.currentStepIndex);
    if (Array.isArray(saved.completedSteps)) setCompletedSteps(saved.completedSteps);

    if ("timerSeconds" in saved) setTimerSeconds(saved.timerSeconds);
    if ("timerRunning" in saved) setTimerRunning(saved.timerRunning);
    if ("pendingTimerSeconds" in saved) setPendingTimerSeconds(saved.pendingTimerSeconds);
    if ("originalTimerSeconds" in saved) setOriginalTimerSeconds(saved.originalTimerSeconds);

    // ✅ 복원 완료 플래그
    didRestoreRef.current = true;
  } catch (e) {
    console.error("채팅 상태 복원 실패:", e);
  }
  }, [sessionKey]);
  // ✅ 상태 변경 시 자동 저장
  useEffect(() => {
    if (suppressAutoSaveRef.current) return;
  try {
    const STORAGE_KEY = getStorageKey(sessionKey);
    const payload = {
      messages,
      recipeInfo,
      ingredientsChecked,
      cookingStarted,
      currentStepIndex,
      completedSteps,
      timerSeconds,
      timerRunning,
      pendingTimerSeconds,
      originalTimerSeconds,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error("채팅 상태 저장 실패:", e);
  }
}, [
  messages,
  recipeInfo,
  ingredientsChecked,
  cookingStarted,
  currentStepIndex,
  completedSteps,
  timerSeconds,
  timerRunning,
  pendingTimerSeconds,
  originalTimerSeconds,
  sessionKey,
  ]);

  // auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

    // ref ↔ state 동기화
  useEffect(() => {
    ingredientsCheckedRef.current = ingredientsChecked;
  }, [ingredientsChecked]);

  useEffect(() => {
    cookingStartedRef.current = cookingStarted;
  }, [cookingStarted]);

  useEffect(() => {
    currentStepIndexRef.current = currentStepIndex;
  }, [currentStepIndex]);

  useEffect(() => {
    recipeInfoRef.current = recipeInfo;
  }, [recipeInfo]);

  useEffect(() => {
    completedStepsRef.current = completedSteps;
  }, [completedSteps]);

  useEffect(() => {
    replacementModeRef.current = replacementMode;
  }, [replacementMode]);

  useEffect(() => {
    awaitingReplacementChoiceRef.current = awaitingReplacementChoice;
  }, [awaitingReplacementChoice]);


  // ------------------------------------
  // 🔥 조리창에서 나갈 때(언마운트) 마이크 완전 정리
  // ------------------------------------
  useEffect(() => {
    return () => {
      console.log("[voice] cleanup on unmount: stop all recognition");

      // 무음 타이머 정리
      clearSilenceTimer();

      // 웨이크워드 + 명령 인식 전부 중지
      stopAllListening();

      // 혹시 남아있을 수도 있는 ref들 정리 (안 해도 큰 문제는 없지만 안전하게)
      try { wakeRecognizerRef.current?.stop?.(); } catch {}
      try { commandRecognizerRef.current?.stop?.(); } catch {}
      wakeRecognizerRef.current = null;
      commandRecognizerRef.current = null;
      isWakeActiveRef.current = false;
      hardErrorRef.current = false;
    };
  }, []);


  // ===============================
// 초기 레시피 세팅
//  - initialRecipe(이미 Recipe 형태)가 있으면 그대로 사용
//  - 없으면 FullRecipe(initialRecipeContext)를 Recipe로 변환해서 사용
// ===============================
useEffect(() => {
  let base: Recipe | null = initialRecipe ?? null;

  // FullRecipe → Recipe 변환
  if (!base && initialRecipeContext) {
    const full = initialRecipeContext as any;

    // 재료 문자열(fullIngredients)
    const fullIngredients =
      full.ingredients?.map((ing: any) =>
        `• ${(ing.name ?? ing.ingredient ?? ing.title ?? "").trim()}${
          ing.amount ?? ing.quantity ?? ing.volume
            ? " " + (ing.amount ?? ing.quantity ?? ing.volume)
            : ""
        }`
      ) ?? [];

    // 단계 문자열 배열
    const steps =
      full.steps
        ?.map((s: any) => {
          if (!s) return "";
          if (typeof s === "string") return s;

          const candKeys = [
            "description",
            "step",
            "content",
            "text",
            "instruction",
            "instruction_text",
          ];
          for (const k of candKeys) {
            if (typeof s[k] === "string" && s[k].trim()) return s[k];
          }

          const vals = Object.values(s).filter(
            (v) => typeof v === "string" && v.trim()
          ) as string[];

          return vals.join(" ");
        })
        .filter((line: string) => line && line.length > 0) ?? [];

    base = {
      id: full.id ?? uuidv4(),
      name: full.name,
      recipeName: full.name,
      image: full.image ?? null,
      fullIngredients,
      ingredients:
        full.ingredients?.map((ing: any) => ({
          name: (ing.name ?? ing.ingredient ?? ing.title ?? "").trim(),
          amount:
            (ing.amount ?? ing.quantity ?? ing.volume ?? "")
              .toString()
              .trim(),
        })) ?? [],
      steps,
      category: full.category ?? "기타",
      cookingTime: full.cooking_time ?? full.cookingTime ?? null,
      servings: full.servings ?? null,
      difficulty: full.difficulty ?? null,
    };
  }

  if (!base) return;

  // ===== 여기부터는 그대로 유지 =====
  // ✅ sessionStorage로 복원한 상태가 있으면 채팅을 비우지 않음
  if (!didRestoreRef.current) {
  setMessages([]);
  }
  setRecipeInfo(base);
  setIngredientsChecked(false);
  setCookingStarted(false);
  setCurrentStepIndex(0);
  setCompletedSteps([]);
  setIsFinished(false);
  setIsSpeaking(false);
  setIsListening(false);
  setIsWakeActive(false);

  const fullLines =
    base.fullIngredients
      ?.map((line: any) =>
        typeof line === "string" ? line : String(line)
      )
      .filter((s: string) => s && s.trim().length > 0) ?? [];

  const ingredientLines =
    !fullLines.length && Array.isArray((base as any).ingredients)
      ? (base as any).ingredients
          .map((i: any) => {
            if (typeof i === "string") return i;
            const name = i.name ?? i.ingredient ?? i.title ?? "";
            const amount = i.amount ?? i.quantity ?? i.qty ?? "";
            if (!name && !amount) return "";
            return amount ? `${name} ${amount}` : name;
          })
          .filter((s: string) => s && s.trim().length > 0)
      : [];

  const lines = fullLines.length > 0 ? fullLines : ingredientLines;
  const title = base.recipeName ?? (base as any).name ?? "이 레시피";

  // ✅ sessionStorage에서 복원한 경우엔 메시지 다시 찍지 않음
  if (!didRestoreRef.current) {
  if (lines.length > 0) {
    addMessage(
      `${title} 재료 목록입니다:\n${lines.join("\n")}\n\n빠진 재료가 있으면 말해주세요!`,


      "assistant"
    );
  } else {
    addMessage(
      `${title} 레시피의 재료 정보를 불러오지 못했어요.\n필요한 재료를 말로 알려주시면 도와드릴게요!`,
      "assistant"
    );
  }
}
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [initialRecipe, initialRecipeContext]);


  const totalSteps = recipeInfo?.steps?.length ?? 0;
  const completedCount = completedSteps.length;

  // ===============================
  // 메시지 추가
  // ===============================
  const addMessage = (text: string, type: "assistant" | "user") => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${type}-${Date.now()}-${Math.random()}`,
        type,
        text,
        timestamp: new Date(),
      },
    ]);

    if (type === "assistant") {
      speakText(text, {
        lang: "ko-KR",
        rate: 1.0,
        pitch: 1.0,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
      });
    }
  };

  // ===============================
  // Intent: Start Cooking
  // ===============================
  const isStartIntent = (text: string) => {
    const exact = ["시작", "시작해", "가자", "ㄱㄱ", "스타트", "start", "시작할게", "시작할게요", "시작하겠습니다", "해볼게", "해볼게요", "해보겠습니다"];
    if (exact.some((kw) => text === kw)) return true;
    // "시작"이 단어 경계에 있는 경우만 허용 (재시작, 말해줘 등 오인식 방지)
    const includeKeywords = ["시작해줘", "시작하자", "요리시작", "조리시작", "시작할게", "바로시작", "바로 시작"];
    return includeKeywords.some((kw) => text.replace(/\s/g, "").includes(kw));
  };
  // ✅ '다음', '계속' 같은 말도 한 번에 인식
  const isNextIntent = (text: string) => {
    const compact = text.replace(/\s/g, "");
    const keywords = ["다음", "다음단계", "다음으로", "계속", "계속해"];
    return keywords.some((kw) => compact.includes(kw));
  };

  // 단계 메시지
  const buildStepMessage = (i: number, steps: string[] = []) => {
    if (!steps || steps.length === 0) return "요리 단계를 불러올 수 없어요.";

    const base = `[${i + 1}단계 / ${steps.length}단계]\n${steps[i]}`;
    const guide = `\n\n완료하면 "다음"이라고 말해주세요.`;

    if (i === 0) return `좋습니다! 요리를 시작하겠습니다.\n\n${base}${guide}`;
    return `${base}${guide}`;
  };

  //여기 수정
  // ===============================
  // 🔥 단계 시작 시 시간 감지 → 타이머 실행
  // ===============================
  const handleStepStart = (stepText: string) => {
    const sec = extractSecondsFromText(stepText);

    if (sec) {
      setPendingTimerSeconds(sec);

      addMessage(
        `⏱️ ${sec}초가 필요한 단계예요.\n타이머를 시작하려면 "타이머 시작해줘"라고 말해주세요.`,
        "assistant"
      );
    } else {
      setPendingTimerSeconds(null);
      stopTimer();
    }
  };


  //여기 수정
  // ===============================
  // 🔥 타이머 시작 / 정지 기능
  // ===============================
  const startTimer = (sec: number) => {
    if (timerRef.current) clearInterval(timerRef.current);

    setOriginalTimerSeconds(sec); 
    setTimerSeconds(sec);
    setTimerRunning(true);

    timerRef.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev === null) return null;

        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setTimerRunning(false);

          playTimerSound();   // 🔥 효과음 재생

          addMessage(` ${sec}초가 지났어요! 다음 단계로 넘어가볼까요?`, "assistant");
          return 0;
        }

        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setTimerRunning(false);
    setTimerSeconds(null);
    setOriginalTimerSeconds(null); 
  };

    // 채팅 초기화
  const resetChat = () => {
    suppressAutoSaveRef.current = true;
    didRestoreRef.current = false;
  // 1) 타이머 정리
  try {
    stopTimer();
  } catch (e) {
    // stopTimer가 내부에서 예외 낼 가능성은 낮지만 안전하게
    console.error(e);
  }
  setPendingTimerSeconds(null);
  setOriginalTimerSeconds(null);
  setTimerSeconds(null);
  setTimerRunning(false);

  // 2) 대화/요리 진행 상태 초기화
  setMessages([]);
  setRecipeInfo(null);
  setIngredientsChecked(false);
  setCookingStarted(false);
  setCurrentStepIndex(0);
  setCompletedSteps([]);
  setIsFinished(false);

  // 3) 대체재 흐름 초기화(너 파일에 있는 상태들)
  setReplacementMode(null);
  setAwaitingReplacementChoice(false);

  // 4) 저장된 복원 데이터 삭제
  const STORAGE_KEY = getStorageKey(sessionKey);
  sessionStorage.removeItem(STORAGE_KEY);
  // 5) 🔇 음성 / 듣기 / 웨이크워드 완전 종료
  stopSpeaking();
  setIsSpeaking(false);
  stopAllListening();
  setIsListening(false);
  setIsWakeActive(false);
  onNewChat?.();
  };


  //여기 수정 427까지
  // ===============================
  // 🔥 핵심: 음성 입력도 텍스트 입력과 100% 동일 처리
  // ===============================
    async function handleUserInput(rawText: string, opts?: { skipAddUserMsg?: boolean }) {
      const text = normalizeText(rawText);
      if (!text) return;

      // 🔥 stale closure 방지: 항상 ref에서 최신 상태 읽기 (맨 위에서 선언)
      const replacementMode = replacementModeRef.current;
      const awaitingReplacementChoice = awaitingReplacementChoiceRef.current;

      // skipAddUserMsg가 없을 때만 메시지 추가 (기존 로직 유지)
      if (!opts?.skipAddUserMsg) {
        addMessage(text, "user");
      }

      // ===============================
      // 🔥 타이머 시작 음성 명령 처리 (최우선)
      // ===============================
      if (
        pendingTimerSeconds &&
        !timerRunning &&
        ["타이머시작", "타이머 시작", "시작해", "시작"].some((k) =>
          text.replace(/\s/g, "").includes(k)
        )
      ) {
        startTimer(pendingTimerSeconds);
        setPendingTimerSeconds(null);

        addMessage("⏱️ 타이머를 시작했어요!", "assistant");
        return;
      }

      if (
        pendingTimerSeconds &&
        ["타이머취소", "타이머 취소", "안할래", "취소"].some((k) =>
          text.replace(/\s/g, "").includes(k)
        )
      ) {
        setPendingTimerSeconds(null);
        addMessage("⏱️ 타이머를 취소했어요.", "assistant");
        return;
      }



      // 🟦 0단계: 이미 "어떤 재료로 대체할까요?" 단계라면 여기서 먼저 처리
      if (awaitingReplacementChoice && replacementMode && recipeInfoRef.current) {
        const user = text; // "1번", "2", "쪽파로 대체", 이런 것들

        let selected: string | null = null;

        // 1) 번호로 고른 경우 ("1", "1번")
        const numMatch = user.match(/\d+/);
        if (numMatch && replacementMode.options) {
          const idx = parseInt(numMatch[0], 10) - 1;
          if (
            !Number.isNaN(idx) &&
            idx >= 0 &&
            idx < replacementMode.options.length
          ) {
            selected = replacementMode.options[idx];
          }
        }

        // 2) 재료 이름으로 고른 경우 ("쪽파", "부추로 대체", "대파로 할게" 등)
        if (!selected && replacementMode.options) {
          // 옵션에서 핵심 재료명만 추출해서 비교 (괄호·설명 제거 후 첫 단어)
          selected = replacementMode.options.find((opt) => {
            const coreName = opt.replace(/\s*\(.*?\)\s*/g, "").trim();
            // 사용자 입력이 옵션 핵심명을 포함하거나, 옵션 핵심명이 사용자 입력을 포함하면 매칭
            return user.includes(coreName) || coreName.includes(user.replace(/로\s*(대체|바꿔|할게|쓸게).*/g, "").trim());
          }) ?? null;
        }

        if (selected) {
          // 선택 완료 → 상태 초기화
          setAwaitingReplacementChoice(false);
          setReplacementMode(null);

          // GPT에게 "대파를 쪽파로 대체해줘" 같은 식으로 정확히 전달
          const followupText = `${replacementMode.missing ?? ""}를 ${selected}로 대체해줘`;

          try {
            const result: FollowupResult = await askCookingFollowup(
              recipeInfoRef.current,
              followupText,
              userProfile
            );

            setRecipeInfo(result.recipe);

            // 1) assistantMessage 정리 → 불필요한 "요리를 바로 시작할까요?" 제거
            let cleanAssistantMsg = (result.assistantMessage ?? "")
              .replace(/요리를 바로 시작할까요[^\n]*/g, "") // 해당 문장 전체 제거
              .trim();

            // 2) 메시지 합치기
            let merged = cleanAssistantMsg + "\n\n";

            // 3) 재료 목록 추가
            if (result.recipe.fullIngredients && result.recipe.recipeName) {
              const ingredList = result.recipe.fullIngredients.join("\n");
              merged += `${result.recipe.recipeName} 재료 목록입니다:\n${ingredList}\n\n빠진 재료가 있으면 말해주세요!\n\n`;
            }

            // 4) 마지막 질문은 여기서만 한 번만!
            merged += `요리를 바로 시작할까요?`;

            // 5) 최종 출력
            addMessage(merged, "assistant");



          } catch {
            addMessage("대체 재료로 레시피를 업데이트하지 못했어요.", "assistant");
          }

          return; // ✅ 여기서 끝! 아래 일반 로직으로 내려가지 않음
        }

        // 번호/이름도 못 알아들었을 때
        addMessage(
          `알아듣기 어려워요.\n사용하실 번호나 재료명을 다시 알려주세요.\n예: "1번", "쪽파로 대체해줘"`,
          "assistant"
        );
        return;
      }

      // 🔥 항상 ref에 들어있는 "최신 상태"를 기준으로 처리
      const ingredientsChecked = ingredientsCheckedRef.current;
      const cookingStarted = cookingStartedRef.current;
      const currentStepIndex = currentStepIndexRef.current;
      const recipeInfoLocal = recipeInfoRef.current;
      const completedSteps = completedStepsRef.current;


    console.log(
      "%c[VOICE DEBUG] ===== 사용자 입력 처리 시작 =====",
      "color: #4CAF50; font-weight: bold"
    );
    console.log("[VOICE DEBUG] 입력(raw):", rawText);
    console.log("[VOICE DEBUG] 입력(normalized):", text);
    console.log("[VOICE DEBUG] ingredientsChecked:", ingredientsChecked);
    console.log("[VOICE DEBUG] cookingStarted:", cookingStarted);
    console.log("[VOICE DEBUG] currentStepIndex:", currentStepIndex);
    console.log("[VOICE DEBUG] recipeInfo:", recipeInfoLocal);
    console.log("[VOICE DEBUG] ======================================");

    //addMessage(text, "user");

    // ===== 1) 처음 레시피 생성 =====
    if (!recipeInfoLocal) {
      try {
        const json = await askGPT_raw({ message: text, profile: userProfile });
        const info = JSON.parse(json);

        // 인사·잡담 등 레시피가 없는 응답 → assistantMessage만 표시
        if (info.assistantMessage && (!info.steps?.length || !info.fullIngredients?.length)) {
          addMessage(info.assistantMessage, "assistant");
          return;
        }

        if (!info.steps?.length || !info.fullIngredients?.length) throw new Error();

        if (!info.category) {
          info.category = "AI 레시피";
        }

        setRecipeInfo(info);
        addMessage(
          `${info.recipeName ?? ""} 재료 목록입니다:\n${info.fullIngredients.join(
            "\n"
          )}\n\n빠진 재료가 있으면 말해주세요!`,
          "assistant"
        );
      } catch {
        addMessage("레시피를 불러오지 못했어요!", "assistant");
      }
      return;
    }

    const nowRecipe =
      typeof recipeInfoLocal === "string"
        ? JSON.parse(recipeInfoLocal)
        : recipeInfoLocal;

    // ✅ 우선순위 0: 이미 요리 중일 때의 '다음/계속'은 무조건 "다음 단계"로 처리
    const compact = text.replace(/\s/g, "");
    const isPureNext = ["다음", "다음단계", "다음으로", "계속", "계속해"].some(
      (kw) => compact.includes(kw)
    );

    if (cookingStarted && isPureNext) {
      const total = nowRecipe.steps?.length ?? 0;
      const current = currentStepIndex;

      if (!completedSteps.includes(current)) {
        setCompletedSteps((prev) => [...prev, current]);
      }

      const next = current + 1;

      if (next < total) {
        setCurrentStepIndex(next);
        addMessage(
          buildStepMessage(next, nowRecipe.steps || []),
          "assistant"
        );
        // 🔥🔥🔥 여기!!! 타이머 실행 여기 수정
        handleStepStart(nowRecipe.steps[next]);
      } else {
        setIsFinished(true);
        addMessage(
          '모든 단계가 끝났습니다! ‘요리 완료’를 눌러주세요.',
          'assistant'
        );
      }
      return;
    }

    //이 단락 수정
    // ===== 2) 재료 체크 단계 =====
    if (!ingredientsChecked) {
      // 🟦 사용자 선택 해석
      const isOption1 =
        ["1", "1번", "첫번째", "첫 번째", "대체재", "대체재로 바꾸기", "대체재로 바꿀래"]
          .some((k) => text === k || text.includes(k));

      const isOption2 =
        ["2", "2번", "두번째", "두 번째", "없어도 돼", "없이 만들기", "없이 만들게", "없이 만들어", "없이 할게", "빼고 만들", "그냥 빼고", "그냥 만들기", "그냥 없이", "둘 다 없이", "그냥 빼줘"]
          .some((k) => text === k || text.includes(k));
      const readyKeywords = ["다 있어", "다있어", "재료 다 있어", "재료다있어"];
      if (readyKeywords.some((k) => text.includes(k))) {
        setIngredientsChecked(true);
        setCookingStarted(false);
        setCurrentStepIndex(0);
        setReplacementMode(null);
        setAwaitingReplacementChoice(false);
        addMessage("모든 재료가 준비되었군요! 요리를 시작할까요?", "assistant");
        return;
      }

      if (isStartIntent(text) || isNextIntent(text)) {
        setIngredientsChecked(true);
        setCookingStarted(true);
        setCurrentStepIndex(0);
        setReplacementMode(null);
        setAwaitingReplacementChoice(false);
        addMessage(buildStepMessage(0, nowRecipe.steps || []), "assistant");
        // 🔥🔥🔥 요기!!! 타이머 실행 여기 수정
        handleStepStart(nowRecipe.steps[0]);
        return;
      }
      //이거 수정
      // 🟦 1번 / 2번 선택 처리
      if (!awaitingReplacementChoice && replacementMode) {

        // 0️⃣ 사용자가 "1번" 선택 없이 바로 대체재 이름을 말한 경우 ("대파로 대체할게" 등)
        if (replacementMode.options && recipeInfoRef.current) {
          const user = text;
          const directSelected = replacementMode.options.find((opt) => {
            const coreName = opt.replace(/\s*\(.*?\)\s*/g, "").trim();
            return (
              user.includes(coreName) ||
              coreName.includes(
                user.replace(/로\s*(대체|바꿔|할게|쓸게|대신|써줘|쓸래).*/g, "").trim()
              )
            );
          }) ?? null;

          if (directSelected) {
            setAwaitingReplacementChoice(false);
            setReplacementMode(null);

            const followupText = `${replacementMode.missing ?? ""}를 ${directSelected}로 대체해줘`;

            try {
              const result: FollowupResult = await askCookingFollowup(
                recipeInfoRef.current,
                followupText,
                userProfile
              );

              setRecipeInfo(result.recipe);

              let cleanAssistantMsg = (result.assistantMessage ?? "")
                .replace(/요리를 바로 시작할까요[^\n]*/g, "")
                .trim();

              let merged = cleanAssistantMsg + "\n\n";

              if (result.recipe.fullIngredients && result.recipe.recipeName) {
                const ingredList = result.recipe.fullIngredients.join("\n");
                merged += `${result.recipe.recipeName} 재료 목록입니다:\n${ingredList}\n\n빠진 재료가 있으면 말해주세요!\n\n`;
              }

              merged += `요리를 바로 시작할까요?`;
              addMessage(merged, "assistant");
            } catch {
              addMessage("재료 대체 업데이트에 실패했습니다.", "assistant");
            }
            return;
          }
        }

        // 1️⃣ Option 1: 대체재로 바꾸기
        if (isOption1) {
          setAwaitingReplacementChoice(true);

          const opts = replacementMode.options ?? [];
          const optsText = opts
            .map((opt, idx) => `${idx + 1}) ${opt}`)
            .join("\n");

          addMessage(
            `어떤 재료로 대체할까요?\n${optsText}\n\n사용하실 대체재 번호나 재료명을 말씀해 주세요.`,
            "assistant"
          );
          return;
        }

        // 2️⃣ Option 2: 없이 만들기 → Option 1과 동일하게 followup 처리
        if (isOption2) {
          try {
            const followupText = `${replacementMode.missing ?? ""} 없이 만들게 해줘`;

            const result: FollowupResult = await askCookingFollowup(
              recipeInfoRef.current,
              followupText,
              userProfile
            );

            setRecipeInfo(result.recipe);

            // assistantMessage 정리
            let cleanAssistantMsg = (result.assistantMessage ?? "")
              .replace(/요리를 바로 시작할까요[^\n]*/g, "")
              .trim();

            let merged = cleanAssistantMsg + "\n\n";

            // 재료 목록 출력
            if (result.recipe.fullIngredients && result.recipe.recipeName) {
              const ingredList = result.recipe.fullIngredients.join("\n");
              merged += `${result.recipe.recipeName} 재료 목록입니다:\n${ingredList}\n\n빠진 재료가 있으면 말해주세요!\n\n`;
            }

            // 마지막 문구 추가
            merged += `요리를 바로 시작할까요?`;

            addMessage(merged, "assistant");

            // 흐름 초기화
            setReplacementMode(null);
            setAwaitingReplacementChoice(false);
          } catch {
            addMessage("재료를 제외한 레시피 업데이트에 실패했습니다.", "assistant");
          }
          return;
        }
      }

      try {
        const result: FollowupResult = await askCookingFollowup(
          nowRecipe,
          text,
          userProfile
        );
        setRecipeInfo(result.recipe);
        addMessage(result.assistantMessage, "assistant");

        // 🟦 여기서 GPT 답변 안에서 "대체재 목록"을 파싱해서 저장
        // 예시 메시지:
        // 대파가 없으시군요!
        // 다음과 같은 재료로 대체할 수 있습니다:
        //
        // - 쪽파
        // - 부추
        // - 샐러리
        //
        // 1) 대체재료로 바꾸기
        // 2) 해당 재료 없이 만들기
        const lines = result.assistantMessage.split("\n");
        const bulletLines = lines.filter((line) =>
          line.trim().startsWith("-") || line.trim().startsWith("•")
        );

        if (bulletLines.length > 0) {
          const options = bulletLines.map((line) =>
            line.replace(/^[-•]\s*/, "").trim()
          );

          // 사용자가 말한 "대파 없어", "양파 없는데" 등에서 재료명만 대충 추출
          // 조사 포함 패턴을 먼저 매칭해야 "이 없어" → 조사까지 제거됨
          const missing = text
            .replace(/[이가은는을를도] 없어|[이가은는을를도] 없는데|[이가은는을를도] 없음|[이가은는을를도] 없다|없어|없는데|없음|없다/g, "")
            .trim();

          setReplacementMode({
            missing: missing || null,
            options,
          });
        }
      } catch {
        addMessage("빠진 재료가 있을까요?", "assistant");
      }
      return;
    }


    // ===== 3) 요리 시작 전 =====
    if (!cookingStarted) {
      if (isStartIntent(text) || isNextIntent(text)) {
        setCookingStarted(true);
        setCurrentStepIndex(0);
        addMessage(buildStepMessage(0, nowRecipe.steps || []), "assistant");
        return;
      }
      addMessage(`요리를 시작하려면 "시작해"라고 말해주세요!`, "assistant");
      return;
    }

    // ===== 4) 단계 진행 =====
    if (
      ["다음", "다했어", "됐어", "ㅇㅋ", "오케이"].some((kw) =>
        text.replace(/\s/g, "").includes(kw)
      )
    ) {
      const total = nowRecipe.steps?.length ?? 0;

      if (!completedSteps.includes(currentStepIndex)) {
        setCompletedSteps((prev) => [...prev, currentStepIndex]);
      }

      const next = currentStepIndex + 1;

      if (next < total) {
        setCurrentStepIndex(next);
        addMessage(buildStepMessage(next, nowRecipe.steps || []), "assistant");
      } else {
        setIsFinished(true);
        addMessage("모든 단계가 끝났습니다! ‘요리 완료’를 눌러주세요.", "assistant");
      }
      return;
    }

    // ===== 5) 요리 중 질문 =====
    try {
      const result: FollowupResult = await askCookingFollowup(
        nowRecipe,
        text,
        userProfile
      );
      setRecipeInfo(result.recipe);
      addMessage(result.assistantMessage, "assistant");
    } catch {
      addMessage("다시 설명해줄래요?", "assistant");
    }
  }

  // ===============================
  // 텍스트 입력
  // ===============================
  const sendText = async () => {
    if (!textInput.trim()) return;
    const clean = normalizeText(textInput);
    setTextInput("");
    setIsProcessing(true);

    // 1. 사용자 질문을 먼저 화면에 추가 (순서 보장)
    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, type: "user", text: clean, timestamp: new Date() }
    ]);

    // 2. 봇 타이핑(...) 메시지 추가
    const typingId = `bot-typing-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: typingId, type: "assistant", text: "__typing__", timestamp: new Date() }
    ]);

    try {
      // { skipAddUserMsg: true }를 전달하여 중복 생성을 막습니다.
      await handleUserInput(clean, { skipAddUserMsg: true }); 
    } finally {
      // 생각 중 메시지 제거
      setMessages((prev) => prev.filter(m => m.id !== typingId));
      setIsProcessing(false);
    }
  };

  // ===============================
  // 무음 타이머 관리 (2초)
  // ===============================
  const clearSilenceTimer = () => {
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const stopCommandListening = () => {
  clearSilenceTimer();
  try { commandRecognizerRef.current?.stop(); } catch {}
  commandRecognizerRef.current = null; // ← 추가!!!
  };

  const stopWakeListening = () => {
  try { wakeRecognizerRef.current?.stop(); } catch {}
  wakeRecognizerRef.current = null; // ← 추가!!!
  };

  const stopAllListening = () => {
    hardErrorRef.current = false; // 버튼으로 끌 때는 에러 상태 리셋
    stopWakeListening();
    stopCommandListening();
    setIsWakeActive(false);
  };

  const resetSilenceTimer = () => {
    clearSilenceTimer();
    // 2초 동안 아무 말 없으면 자동으로 명령 인식 종료
    silenceTimerRef.current = window.setTimeout(() => {
      stopCommandListening();
      if (isWakeActiveRef.current && !hardErrorRef.current) {
        startWakeListening();
      }
    }, 2000);
  };

  // ===============================
  // 웨이크워드 시작 ("안녕")
  // ===============================
  const startWakeListening = () => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("브라우저가 음성 인식을 지원하지 않습니다.");
      return;
    }

    stopWakeListening();
    hardErrorRef.current = false;

    const recognizer = new SpeechRecognition();
    recognizer.lang = "ko-KR";
    recognizer.continuous = true;
    recognizer.interimResults = true;

    recognizer.onstart = () => {
      console.log("[wake] onstart");
      setIsWakeActive(true);
    };

    recognizer.onresult = (e: any) => {
  const result = e.results[e.results.length - 1];
  const text: string = result[0].transcript || "";
  const normalized = text.replace(/\s+/g, "");

  console.log("[wake] result:", text, "=>", normalized);
  // 여러 개 웨이크워드 허용
  const wakeWords = ["두콩아","두콩","안녕"];

  if (wakeWords.some((word) => normalized.includes(word))) {
    console.log("[wake] 웨이크워드 감지 → command 모드로 전환");

    try {
      recognizer.onresult = null;
      recognizer.onend = null;
      recognizer.onerror = null;
      recognizer.onstart = null;
      recognizer.stop();
    } catch (e) {
      console.error("[wake] stop() error:", e);
    }

    // wake 완전히 종료된 뒤 커맨드 모드 시작
    setTimeout(() => {
      startCommandListening();
    }, 500);
  }
};


    recognizer.onerror = (e: any) => {
      console.error("[wake] onerror:", e);
      // ✅ stop() 호출로 인한 정상 종료 → 신경 안 씀
    if (e.error === "aborted") {
    console.log("[wake] aborted (stop() 호출로 인한 정상 종료)");
    return;
    }
      if (
        e.error === "not-allowed" ||
        e.error === "audio-capture" ||
        e.error === "network" ||
        e.error === "service-not-allowed"
      ) {
        hardErrorRef.current = true;
        isWakeActiveRef.current = false;
        setIsWakeActive(false);
        setVoiceFatalError(true);

        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          toast.error("브라우저에서 이 사이트의 마이크 사용이 차단되어 있어요.");
        } else if (e.error === "audio-capture") {
          toast.error("마이크 장치를 찾을 수 없어요. 시스템 설정을 확인해주세요.");
        } else if (e.error === "network") {
          toast.error(
            "이 네트워크에서는 음성 인식 서버에 연결할 수 없어 자동 듣기를 사용할 수 없어요."
          );
        }
        return;
      }

      console.log("[wake] non-fatal error:", e.error);
    };

    recognizer.onend = () => {
      console.log(
        "[wake] onend, isWakeActiveRef.current =",
        isWakeActiveRef.current,
        "isListening =",
        isListening,
        "hardErrorRef =",
        hardErrorRef.current
      );

      if (wakeRecognizerRef.current !== recognizer) {
        return;
      }

      if (!isWakeActiveRef.current || hardErrorRef.current) {
        console.log("[wake] stop: auto-restart disabled (user off or hardError)");
        wakeRecognizerRef.current = null;
        return;
      }

      setTimeout(() => {
        if (!isWakeActiveRef.current || hardErrorRef.current) return;
        try {
          console.log("[wake] restart start()");
          recognizer.start();
        } catch (err) {
          console.error("[wake] restart error:", err);
          wakeRecognizerRef.current = null;
          hardErrorRef.current = true;
        }
      }, 300);
    };

    wakeRecognizerRef.current = recognizer;

    try {
      console.log("[wake] start() 호출");
      recognizer.start();
    } catch (e) {
      console.error("[wake] start() 예외:", e);
      setIsWakeActive(false);
      hardErrorRef.current = true;
      toast.error("웨이크워드 인식을 시작할 수 없습니다.");
    }
  };

  // ===============================
  // 명령 음성 인식 (실제 대화 내용)
  // ===============================
  const startCommandListening = () => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("브라우저가 음성 인식을 지원하지 않습니다.");
      return;
    }

    if (hardErrorRef.current) {
      console.warn("[cmd] hardErrorRef=true → startCommandListening 생략");
      return;
    }

    stopCommandListening();
    clearSilenceTimer();

    stopSpeaking();
    setIsSpeaking(false);

    if (wakeRecognizerRef.current) {
      stopWakeListening();
    }

    const recognizer = new SpeechRecognition();
    recognizer.lang = "ko-KR";
    recognizer.continuous = true;
    recognizer.interimResults = true;

    let finalText = "";

    recognizer.onresult = (e: any) => {
      const result = e.results[e.results.length - 1];
      const text: string = result[0].transcript || "";

      console.log("[cmd] partial:", text);

      resetSilenceTimer();

      if (result.isFinal) {
        finalText += " " + text;
      }
    };

    recognizer.onerror = (e: any) => {
      console.error("[cmd] onerror:", e);

      if (
        e.error === "not-allowed" ||
        e.error === "audio-capture" ||
        e.error === "network" ||
        e.error === "service-not-allowed"
      ) {
        hardErrorRef.current = true;
        setVoiceFatalError(true);

        if (e.error === "network") {
          toast.error(
            "이 네트워크에서는 음성 인식 서버에 연결할 수 없어 음성 기능을 사용할 수 없어요."
          );
        } else {
          toast.error(
            "마이크 권한 / 장치 문제로 음성 인식을 사용할 수 없어요."
          );
        }

        stopAllListening();
        return;
      }

      toast.error("음성 인식 중 오류가 발생했어요.");
    };

    recognizer.onend = async () => {
      console.log("[cmd] onend, finalText =", finalText);
      clearSilenceTimer();
      setIsListening(false);
      commandRecognizerRef.current = null;

      const trimmedText = normalizeText(finalText); // 변수명 변경
      if (trimmedText.length > 0) {
        // 1. 사용자 메시지 추가
        setMessages((prev) => [
          ...prev,
          { id: `user-voice-${Date.now()}`, type: "user", text: trimmedText, timestamp: new Date() }
        ]);

        // 2. 봇 생각 중 추가
        const typingId = `bot-typing-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          { id: typingId, type: "assistant", text: "__typing__", timestamp: new Date() }
        ]);

        try {
          await handleUserInput(trimmedText, { skipAddUserMsg: true });
        } finally {
          setMessages((prev) => prev.filter(m => m.id !== typingId));
        }
      }

      if (isWakeActiveRef.current && !hardErrorRef.current) {
        startWakeListening();
      }
    };

    try {
      console.log("[cmd] start() 호출");
      recognizer.start();
      commandRecognizerRef.current = recognizer;
      setIsListening(true);
      resetSilenceTimer();
    } catch (e) {
      console.error("[cmd] start() 예외:", e);
      toast.error("명령 인식을 시작할 수 없습니다.");
    }
  };

  // ===============================
  // 요리 완료
  // ===============================
  const handleCompleteCooking = async () => {
    if (!recipeInfo) return;

    stopSpeaking();
    setIsSpeaking(false);

    try {
      const payload = {
        id: recipeInfo.id ?? uuidv4(),

        name: recipeInfo.name ?? recipeInfo.recipeName ?? "이름 없는 레시피",
        image: recipeInfo.image ?? null,
        description: recipeInfo.description ?? null,
        category: recipeInfo.category ?? "기타",

        ingredients: Array.isArray(recipeInfo.ingredients)
          ? recipeInfo.ingredients.map((ing: any) =>
              typeof ing === "string"
                ? { name: ing, amount: "" }
                : {
                    name: ing.name ?? "",
                    amount: ing.amount ?? "",
                  }
            )
          : [],

        steps: Array.isArray(recipeInfo.steps)
          ? recipeInfo.steps.map((s: any) => String(s))
          : [],

        completedAt: new Date().toISOString(),

        cookingTime: recipeInfo.cookingTime ?? null,
        servings: recipeInfo.servings ?? null,
        difficulty: recipeInfo.difficulty ?? null,
      };

      console.log("✅ 최종 전송 payload:", payload);

      // ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅
      //await addCompletedRecipe(payload);   // 🔥🔥🔥 이게 핵심
      // ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅

      toast.success("완료한 요리가 저장되었습니다!");

      // ✅ App.tsx에 완료 이벤트 전달 → 완료 목록 갱신
      resetChat();
      onCookingComplete?.(recipeInfo);

    } catch (err) {
      console.error("❌ 완료 레시피 저장 실패:", err);
      toast.error("완료한 레시피 저장에 실패했습니다.");
    }
  };





  // ===============================
  // 진행률 계산
  // ===============================
  const totalForProgress = recipeInfo?.steps ? recipeInfo.steps.length : 0;
  const progressValue =
    totalForProgress > 0
      ? Math.round((completedCount / totalForProgress) * 100)
      : 0;


  // ===============================
  // UI
  // ===============================
  return (
    <div>
      <div className="max-w-3xl mx-auto">

        

        {/* 상단 상태 카드 */}
        <Card className="mb-4 border bg-primary/5 border-primary/20">
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center justify-between gap-4">
              
              {/* 제목 + 설명 + 진행률 */}
              <div className="flex-1">
                <h2 className="text-lg font-bold">
                  {recipeInfo?.recipeName ?? recipeInfo?.name ?? "AI 음성 요리 도우미"}
                </h2>

                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">
                  원하는 요리를 말하거나 입력해보세요!{"\n"}예: "김치볶음밥 알려줘"
                </p>

                {cookingStarted && recipeInfo && (
                  <div className="mt-4 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>진행 상황</span>
                      <span>
                        {completedCount} / {totalForProgress} 단계 완료
                      </span>
                    </div>
                    <Progress value={progressValue} className="h-2" />
                  </div>
                )}

                  {/*이거추가 */}
                 {/* 🔥 타이머 UI — 카드 내부에 넣는다면 여기! */}
                  {timerRunning && originalTimerSeconds && (
                    <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2 text-primary font-semibold">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-5 h-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>

                          <span>{timerSeconds}초 남음</span>
                        </div>

                      </div>

                      <Progress
                        value={
                          ((originalTimerSeconds - (timerSeconds ?? 0)) /
                            originalTimerSeconds) *
                          100
                        }
                        className="h-2 bg-primary/20"
                      />
                    </div>
                  )}
              </div>

              {/* 웨이크워드 버튼 */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={isWakeActive ? stopAllListening : startWakeListening}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    isListening
                      ? "bg-primary text-white animate-pulse"
                      : isWakeActive
                      ? "bg-primary/20 text-primary"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                >
                  {isListening ? (
                    <MicOff className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </button>

                <span className="text-[11px] text-muted-foreground text-center">
                  {isListening
                    ? "지금 말씀하세요..."
                    : isWakeActive
                    ? `"두콩아"이라고 불러보세요`
                    : "자동 듣기 켜기"}
                </span>
              </div>

            </div>
          </CardContent>
        </Card>

        

        {/* 채팅 영역 */}
        <Card className="rounded-2xl border bg-muted/40">
          <CardContent className="p-0">
            <div
              className="flex flex-col"
              style={{ height: "380px", overflow: "hidden" }}
            >
              <ScrollArea
                className="flex-1 px-3 py-4"
                style={{ height: "100%", overflowY: "auto" }}
              >
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex mb-3 ${
                      m.type === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {m.type === "assistant" ? (
                      <>
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center mr-2 mt-auto">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                        <div className="max-w-[75%]">
                          <div className="inline-block rounded-2xl rounded-bl-sm bg-white border border-gray-100 px-3 py-2 text-sm shadow-sm whitespace-pre-line">
                            {/* 수정: text가 __typing__이면 애니메이션 출력 */}
                            {m.text === "__typing__" ? <TypingDots /> : m.text}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="max-w-[75%] flex justify-end">
                          <div className="inline-block rounded-2xl rounded-br-sm bg-[#FEE500] px-3 py-2 text-sm text-black shadow-sm whitespace-pre-line">
                            {m.text}
                          </div>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-[#FEE500] flex items-center justify-center ml-2 mt-auto">
                          <User className="w-4 h-4 text-black" />
                        </div>
                      </>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        {/* 입력 영역 */}
        <div className="mt-4 flex flex-col gap-3">
  <div className="flex items-center gap-2">
    <Input
      value={textInput}
      onChange={(e) => setTextInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !isProcessing) sendText();
      }}
      placeholder="메시지를 입력하세요"
    />
    <Button onClick={sendText} disabled={!textInput.trim() || isProcessing}>
      <Send className="w-4 h-4" />
    </Button>
  </div>

  {isSpeaking && (
    <div className="flex justify-end">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          stopSpeaking();
          setIsSpeaking(false);
        }}
      >
        말하기 멈추기
      </Button>
    </div>

  )}

  {/* ✅ 채팅 초기화 버튼 */}
  <Button variant="outline" className="w-full" onClick={resetChat}>
    채팅 초기화
  </Button>

  {/* ✅ 요리 완료 버튼 */}
  <Button
    className="w-full mt-1"
    size="lg"
    onClick={handleCompleteCooking}
    disabled={!recipeInfo || !isFinished}
  >
    요리 완료
  </Button>

  {!isFinished && recipeInfo && (
    <p className="text-[11px] text-muted-foreground text-center">
      단계 안내가 모두 끝나면 <strong>요리 완료</strong> 버튼을 눌러주세요.
    </p>
  )}
</div>
</div>
</div>
  );
}