// === VoiceAssistant.tsx — Wakeword + 동일 처리 + 무음 종료 (MERGED VERSION) ===
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Mic, MicOff, Bot, User, Send, Volume2, VolumeX, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { askGPT_raw, askCookingFollowup, personalizeRecipe as personalizeRecipeAPI, getRecipeRecommendations } from "../utils/api";
import type { Recipe } from "../types/recipe";
import { speakText, stopSpeaking } from "../utils/tts";
import { Progress } from "./ui/progress";
import type { UserProfile } from "./ProfileSetup";
import type { FullRecipe } from "./FoodRecipe";
import { addCompletedRecipe } from "../utils/api";
import { v4 as uuidv4 } from "uuid";


const CHAT_SAVE_KEY = "voice_assistant_chat_state_v1";
const TTS_SETTINGS_KEY = "voice_assistant_tts_settings";

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
    .replace(/[!.,]/g, "")        // ?는 제거하지 않음 (표시에 유지)
    .split(/[~…]/)[0]             // 문장 단절은 ~ … 만 처리
    .replace(/\s+/g, " ")
    .trim();
}

// 의도 감지용: 공백 + 특수문자 전부 제거 (? 포함)
function compactText(raw: string): string {
  return raw.replace(/[\s?？!.,~…]/g, "");
}
type SubstitutionGroup = {
  groupName: string;
  options: string[];
  contextType: 'substitution' | 'action';
};

// AI 응답에서 재료별 대체 옵션 그룹을 파싱
// 마지막 옵션이 "없이"로 끝나면 substitution, 아니면 action
function parseSubstitutionGroups(message: string): SubstitutionGroup[] {
  const lines = message.split("\n");
  const groups: SubstitutionGroup[] = [];
  let cur: { groupName: string; options: string[] } | null = null;

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (/^\d+\)/.test(t)) {
      if (!cur) cur = { groupName: "", options: [] };
      const opt = t.replace(/^\d+\)\s*/, "").split(/\s*[—–\-]\s*/)[0].trim();
      cur.options.push(opt);
    } else {
      if (cur && cur.options.length > 0) {
        const lastOpt = cur.options[cur.options.length - 1] ?? "";
        groups.push({
          ...cur,
          contextType: lastOpt.includes("없이") ? 'substitution' : 'action',
        });
      }
      cur = { groupName: t.replace(/:$/, "").trim(), options: [] };
    }
  }
  if (cur && cur.options.length > 0) {
    const lastOpt = cur.options[cur.options.length - 1] ?? "";
    groups.push({
      ...cur,
      contextType: lastOpt.includes("없이") ? 'substitution' : 'action',
    });
  }
  return groups;
}

// 옵션 텍스트 정규화: 괄호, 조사, 어미 제거 후 핵심 키워드만 남김
// "적은 양으로 조리하기" → "적은 양으로 조리"로 만들어 "조리할게"도 매칭 가능하게
function normalizeOptionForMatch(opt: string): string {
  return opt
    .replace(/\([^)]*\)/g, "")
    .replace(/(하기로?|해줘|할게요?|해요?|하자|기$|하기$)$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// 사용자가 특정 요리 없이 "뭐 먹을까/추천해줘" 류 요청을 하는지 감지
function isRecommendationIntent(text: string): boolean {
  const compact = text.replace(/[\s?？]/g, "");

  // 1) 명확한 "뭐 먹을지 / 요리 추천" 패턴 — 특정 요리명 없음이 보장됨
  if ([
    "뭐먹을까", "뭐만들까", "뭐해먹을까", "뭐가좋을까", "뭐해볼까",
    "오늘뭐먹", "오늘뭐만들", "뭐먹지", "뭐만들지", "뭐해먹지",
    "뭐가맛있", "뭐먹을지", "뭐추천", "뭐해먹",
    "요리추천", "메뉴추천", "음식추천", "식사추천",
    "오늘추천", "오늘메뉴", "추천해줄래", "추천좀", "추천부탁",
    "저녁추천", "점심추천", "아침추천",
  ].some(kw => compact.includes(kw))) return true;

  // 2) "추천해줘/봐/주세요" — 앞뒤에 특정 요리명이 없는 경우만
  // "요리 추천해줘", "추천해줘 요리" 둘 다 허용 (어순 무관)
  const genericWords = [
    "요리", "음식", "메뉴", "오늘", "저녁", "점심", "아침", "밥", "뭐",
    "어떤", "좋은", "간단한", "간단", "맛있는", "맛있", "뭔가", "한번",
  ];
  const isGenericContext = (s: string) =>
    s === "" || genericWords.some(p => s === p || s.startsWith(p) || s.endsWith(p));

  for (const kw of ["추천해줘", "추천해봐", "추천해주세요", "추천해줄래요"]) {
    if (compact.endsWith(kw)) {
      const prefix = compact.slice(0, compact.length - kw.length);
      if (isGenericContext(prefix)) return true;
    }
    if (compact.startsWith(kw)) {
      const suffix = compact.slice(kw.length);
      if (isGenericContext(suffix)) return true;
    }
    // "추천해줘" 단독 포함 (짧은 문장 전체가 추천 요청인 경우)
    if (compact === kw) return true;
  }

  return false;
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

// GPT가 줄바꿈 없이 긴 산문을 반환할 때 자동으로 문단 분리
// 이미 \n 있는 텍스트(재료 목록, 단계 등)는 건드리지 않음
function autoFormatText(text: string): string {
  if (!text || text === "__typing__") return text;
  if (text.includes("\n")) return text; // 이미 서식 있으면 유지
  if (text.length < 80) return text;   // 짧은 메시지는 그대로

  // 한국어/영어 문장 경계에서 분리 (.!? 뒤에 공백+한글 대문자/한글)
  const sentences = text.split(/(?<=[.!?])\s+(?=[가-힣A-Z"'(])/g).filter(Boolean);
  if (sentences.length <= 2) return text;

  // 2문장씩 묶어서 문단 구성
  const paras: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    paras.push(sentences.slice(i, Math.min(i + 2, sentences.length)).join(" "));
  }
  return paras.join("\n\n");
}

// 사용자 프로필에 레시피에 영향을 줄 제약이 있는지 확인
function hasProfileConstraints(profile: import("./ProfileSetup").UserProfile | null): boolean {
  if (!profile) return false;
  return (
    (profile.allergies?.length ?? 0) > 0 ||
    (profile.dislikedIngredients?.length ?? 0) > 0 ||
    (profile.restrictions?.length ?? 0) > 0 ||
    (profile.healthConditions?.length ?? 0) > 0 ||
    !!profile.cookingLevel ||
    !!profile.servings ||
    !!profile.preferredCookingTime
  );
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
  // ====== TTS 설정 ======
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem(TTS_SETTINGS_KEY) ?? "{}").enabled ?? true; } catch { return true; }
  });
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
    try { return JSON.parse(localStorage.getItem(TTS_SETTINGS_KEY) ?? "{}").voiceName ?? ""; } catch { return ""; }
  });
  const [ttsRate, setTtsRate] = useState<number>(() => {
    try { return JSON.parse(localStorage.getItem(TTS_SETTINGS_KEY) ?? "{}").rate ?? 1.0; } catch { return 1.0; }
  });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showTtsSettings, setShowTtsSettings] = useState(false);

  // ====== 상태 ======
    const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [voiceFatalError, setVoiceFatalError] = useState(false);

  const [recipeInfo, setRecipeInfo] = useState<Recipe | null>(
    initialRecipe ?? null
  );
  // 레시피 없는 상태에서 AI가 메시지만 반환했을 때 이전 쿼리를 저장 (확인 응답 처리용)
  const [lastRecipeQuery, setLastRecipeQuery] = useState<string | null>(null);
  //여기 수정 88까지
  // 🟦 번호형 선택지 흐름 관리용 상태
  // substitution: 재료 대체 (쪽파/부추/없이 만들기)
  // action: 수량 조정 등 GPT가 직접 처리해야 하는 액션
  const [replacementMode, setReplacementMode] = useState<{
    missing: string | null;
    options: string[] | null;
    groups: SubstitutionGroup[] | null;
    contextType: 'substitution' | 'action';
  } | null>(null);

  // 🟦 "어떤 재료로 대체할까요?" 라고 이미 물어본 상태인지
  const [awaitingReplacementChoice, setAwaitingReplacementChoice] =
    useState(false);

  // 🟦 요리 추천 목록 선택 대기 상태
  const [awaitingRecommendationChoice, setAwaitingRecommendationChoice] =
    useState(false);
  const [recommendationList, setRecommendationList] = useState<
    { name: string; description: string }[] | null
  >(null);


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

  // TTS 설정 localStorage 저장
  useEffect(() => {
    try {
      localStorage.setItem(TTS_SETTINGS_KEY, JSON.stringify({
        enabled: ttsEnabled,
        voiceName: selectedVoiceName,
        rate: ttsRate,
      }));
    } catch {}
  }, [ttsEnabled, selectedVoiceName, ttsRate]);

  // 브라우저 음성 목록 로딩 (voiceschanged 이벤트 대응)
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      const korean = all.filter((v) => v.lang.startsWith("ko"));
      setAvailableVoices(korean.length > 0 ? korean : all);
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

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
    // 레시피탭에서 불러온 경우 + 프로필 제약이 있으면 AI 맞춤화
    if (initialRecipeContext && userProfile && hasProfileConstraints(userProfile)) {
      const personalizingId = `personalizing-${Date.now()}`;
      setMessages(prev => [
        ...prev,
        {
          id: personalizingId,
          type: "assistant" as const,
          text: "__typing__",
          timestamp: new Date(),
        },
      ]);

      (async () => {
        try {
          const result = await personalizeRecipeAPI(base!, userProfile);
          setMessages(prev => prev.filter(m => m.id !== personalizingId));

          if (result.recipe) {
            setRecipeInfo((prev: any) => ({ ...prev, ...result.recipe }));
            const recipeLines = (result.recipe.fullIngredients ?? []).join("\n");
            const recipeName = result.recipe.recipeName ?? title;
            let fullMsg = result.assistantMessage
              ? result.assistantMessage + "\n\n"
              : "";
            fullMsg += `${recipeName} 재료 목록입니다:\n${recipeLines}\n\n빠진 재료가 있으면 말해주세요!`;
            addMessage(fullMsg, "assistant");
          } else {
            throw new Error("no recipe in result");
          }
        } catch {
          setMessages(prev => prev.filter(m => m.id !== personalizingId));
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
      })();
    } else if (lines.length > 0) {
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
    const displayText = type === "assistant" ? autoFormatText(text) : text;

    setMessages((prev) => [
      ...prev,
      {
        id: `${type}-${Date.now()}-${Math.random()}`,
        type,
        text: displayText,
        timestamp: new Date(),
      },
    ]);

    if (type === "assistant" && ttsEnabled && text !== "__typing__") {
      const voice = availableVoices.find((v) => v.name === selectedVoiceName) ?? null;
      speakText(text, {
        lang: "ko-KR",
        rate: ttsRate,
        pitch: 1.0,
        voice,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
      });
    }
  };

  // ===============================
  // Intent: Start Cooking
  // ===============================
  const isStartIntent = (text: string) => {
    const compact = text.replace(/\s/g, "");
    // 명확한 시작 키워드 (포함 여부)
    if (["시작", "스타트", "start"].some((kw) => compact.includes(kw))) return true;
    // 단독으로 쓰일 때만 인식하는 짧은 키워드 (4자 이하 → "대체해줘"(5자) 방지)
    if (compact.length <= 4 && ["해줘", "해봐", "가자", "ㄱㄱ"].some((kw) => compact.includes(kw))) return true;
    if (compact === "ㄱ") return true;
    return false;
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

  // 3) 대체재 / 추천 흐름 / 쿼리 기억 초기화
  setReplacementMode(null);
  setAwaitingReplacementChoice(false);
  setAwaitingRecommendationChoice(false);
  setRecommendationList(null);
  setLastRecipeQuery(null);

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



      // 🟦 -1단계: 요리 추천 목록 선택 대기 중
      if (awaitingRecommendationChoice && recommendationList) {
        const c2 = compactText(text); // ?!., 포함 전부 제거한 비교용 문자열

        // ── 1) 번호 또는 이름으로 선택 ──
        const numMatch = text.match(/\d+/);
        let selected: { name: string; description: string } | null = null;

        if (numMatch) {
          const idx = parseInt(numMatch[0], 10) - 1;
          if (idx >= 0 && idx < recommendationList.length) selected = recommendationList[idx];
        }
        if (!selected) {
          selected = recommendationList.find((r) => text.includes(r.name)) ?? null;
        }

        if (selected) {
          setAwaitingRecommendationChoice(false);
          setRecommendationList(null);
          try {
            const json = await askGPT_raw({ message: `${selected.name} 레시피 알려줘`, profile: userProfile });
            const info = JSON.parse(json);
            const hasRecipe =
              info.recipeName &&
              Array.isArray(info.steps) && info.steps.length > 0 &&
              Array.isArray(info.fullIngredients) && info.fullIngredients.length > 0;
            if (hasRecipe) {
              if (!info.category) info.category = "AI 레시피";
              setRecipeInfo(info);
              setLastRecipeQuery(null);
              addMessage(`${info.recipeName} 재료 목록입니다:\n${info.fullIngredients.join("\n")}\n\n빠진 재료가 있으면 말해주세요!`, "assistant");
            } else {
              addMessage(info.assistantMessage ?? "레시피를 불러오지 못했어요. 다시 시도해주세요.", "assistant");
            }
          } catch {
            addMessage("레시피를 불러오지 못했어요! 다시 시도해주세요.", "assistant");
          }
          return;
        }

        // ── 2) "더 추천해줘" / "다른 거" / "X 별로야" → 새 목록 요청 ──
        // "추천해줘" 자체도 포함 (e.g. "다른 요리들 추천해줘 메인으로 먹기 좋은거로")
        const wantsMore = [
          // "다른 거" 류 — 가장 자연스러운 표현들
          "다른거", "다른것", "다른걸", "다른게",
          // "다른 요리/메뉴" 류
          "다른거추천", "다른요리", "다른메뉴", "다른음식",
          // "더 추천" 류
          "더추천", "더보여", "더없어", "더없나", "더없냐",
          // 기타
          "바꿔줘", "바꿔봐", "다시추천", "새로추천",
          "추천해줘", "추천해봐", "추천해주세요", "추천해줄래",
        ].some((k) => c2.includes(k));
        const hasDislikeSignal = [
          "별로", "별론", "별루",   // 다 별론데 / 별로야 / 별루
          "싫어", "싫다", "싫음",
          "말고", "빼고", "제외",
          "안먹", "못먹",
          "마음에안", "맘에안",
          "안좋", "별루",
        ].some((k) => c2.includes(k));

        if (wantsMore || hasDislikeSignal) {
          const exclude = recommendationList.map((r) => r.name);
          // 별도 pre-message 없이 outer typing indicator가 대기 표시 담당
          try {
            const result = await getRecipeRecommendations(userProfile, { exclude, userContext: text });
            const list: { name: string; description: string }[] = result.recommendations ?? [];
            if (list.length > 0) {
              setRecommendationList(list);
              const listText = list.map((r, i) => `${i + 1}) ${r.name}\n   ${r.description}`).join("\n\n");
              addMessage(`다른 요리를 추천해드릴게요!\n번호를 말씀해 주세요:\n\n${listText}`, "assistant");
            } else {
              addMessage("추천드릴 요리를 더 찾지 못했어요. 직접 원하는 요리를 말씀해 주세요!", "assistant");
              setAwaitingRecommendationChoice(false);
              setRecommendationList(null);
            }
          } catch {
            addMessage("죄송해요, 추천 중 오류가 났어요. 다시 시도해 주세요.", "assistant");
          }
          return;
        }

        // ── 3) 그 외: GPT에게 위임 ──
        // 질문("뭐야?", "어때?") → GPT가 설명 반환 → 설명 보여주고 추천 모드 유지
        // 특정 요리 직접 요청("파스타 만들어줘") → GPT가 레시피 반환 → 선택으로 처리
        try {
          const json = await askGPT_raw({ message: text, profile: userProfile });
          const info = JSON.parse(json);
          const hasRecipe =
            info.recipeName &&
            Array.isArray(info.steps) && info.steps.length > 0 &&
            Array.isArray(info.fullIngredients) && info.fullIngredients.length > 0;

          if (hasRecipe) {
            // 사용자가 특정 요리를 직접 요청 → 선택 처리, 추천 모드 종료
            setAwaitingRecommendationChoice(false);
            setRecommendationList(null);
            if (!info.category) info.category = "AI 레시피";
            setRecipeInfo(info);
            setLastRecipeQuery(null);
            addMessage(`${info.recipeName} 재료 목록입니다:\n${info.fullIngredients.join("\n")}\n\n빠진 재료가 있으면 말해주세요!`, "assistant");
          } else if (info.assistantMessage?.trim()) {
            // Q&A 답변 → 보여주고 추천 모드 유지
            addMessage(info.assistantMessage, "assistant");
            const listText = recommendationList
              .map((r, i) => `${i + 1}) ${r.name}\n   ${r.description}`)
              .join("\n\n");
            addMessage(`번호를 말씀해 주시면 바로 레시피를 알려드릴게요!\n\n${listText}`, "assistant");
          } else {
            addMessage(
              `번호를 말씀해 주시거나, 다른 추천을 원하시면 "다른 거 추천해줘"라고 말씀해 주세요.\n예: "1번", "된장국", "더 추천해줘"`,
              "assistant"
            );
          }
        } catch {
          addMessage(
            `번호를 말씀해 주시거나, 다른 추천을 원하시면 "다른 거 추천해줘"라고 말씀해 주세요.\n예: "1번", "된장국", "더 추천해줘"`,
            "assistant"
          );
        }
        return;
      }

      // 🟦 0단계: 이미 "어떤 재료로 대체할까요?" 단계라면 여기서 먼저 처리
      if (awaitingReplacementChoice && replacementMode && recipeInfoRef.current) {
        // 탈출구: "다 있어" / 시작 의도 → 대체재 모드 해제 후 일반 흐름으로
        const readyNow = ["다있어", "다준비됐어", "다있어요", "괜찮아", "그냥해"].some(
          (k) => text.replace(/\s/g, "").includes(k)
        );
        if (readyNow || isStartIntent(text)) {
          setAwaitingReplacementChoice(false);
          setReplacementMode(null);
          // 아래 일반 흐름(case 2 / 3)으로 계속 진행
        } else {

        const user = text;

        // ── 다중 그룹 모드 ("3번 1번" / "3번이랑 바질" / "없이 만들기 바질" 모두 처리) ──
        if (replacementMode.groups && replacementMode.groups.length > 0) {
          const groups = replacementMode.groups;
          const allNums = Array.from(user.matchAll(/\d+/g), (m) =>
            parseInt(m[0], 10)
          );
          let numIdx = 0;

          // 그룹마다: 이름 매칭 먼저 → 없으면 다음 번호로 폴백
          const selections: (string | null)[] = groups.map((group) => {
            // 이름 매칭: 완전 일치 → 정규화 일치 순으로 시도
            const nameMatch = group.options.find((opt) => {
              if (user.includes(opt)) return true;
              const norm = normalizeOptionForMatch(opt);
              return norm.length >= 4 && user.includes(norm);
            });
            if (nameMatch) return nameMatch;
            if (numIdx < allNums.length) {
              const n = allNums[numIdx++];
              const idx = n - 1;
              if (idx >= 0 && idx < group.options.length)
                return group.options[idx];
            }
            return null;
          });

          const unansweredGroups = groups.filter(
            (_, i) => selections[i] === null
          );

          if (unansweredGroups.length === 0) {
            // 모든 그룹 선택 완료
            setAwaitingReplacementChoice(false);
            setReplacementMode(null);

            const parts: string[] = [];
            for (let i = 0; i < groups.length; i++) {
              const sel = selections[i]!;
              const group = groups[i];
              if (group.contextType === 'substitution') {
                // 대체재 흐름: "X로 대체" 또는 "없이 만들기"
                const isRemove =
                  sel.includes("없이") ||
                  sel.includes("빼고") ||
                  sel.includes("제거");
                parts.push(
                  isRemove
                    ? `${group.groupName}은(는) 없이 만들어줘`
                    : `${group.groupName}은(는) ${sel}로 대체해줘`
                );
              } else {
                // 액션 흐름(수량 조정 등): 선택지 텍스트를 그대로 전달
                parts.push(`${group.groupName}: ${sel}`);
              }
            }

            const followupText = parts.join(", ");

            try {
              const result: FollowupResult = await askCookingFollowup(
                recipeInfoRef.current,
                followupText,
                userProfile
              );
              setRecipeInfo(result.recipe);

              const ingredientsChanged =
                JSON.stringify(result.recipe?.fullIngredients ?? []) !==
                JSON.stringify(recipeInfoRef.current?.fullIngredients ?? []);

              // GPT가 assistantMessage 안에 재료 목록을 직접 넣는 경우 제거 (클라이언트가 통일 처리)
              let merged = (result.assistantMessage ?? "")
                .replace(/요리를 바로 시작할까요[^\n]*/g, "")
                .replace(/\n+[^\n]*재료 목록입니다:[\s\S]*/g, "")
                .trim();

              if (ingredientsChanged && result.recipe?.fullIngredients?.length) {
                const recipeName =
                  result.recipe.recipeName ??
                  recipeInfoRef.current?.recipeName ??
                  "";
                merged += `\n\n${recipeName} 재료 목록입니다:\n${result.recipe.fullIngredients.join("\n")}`;
              }

              if (cookingStartedRef.current) {
                merged += `\n\n"다음"이라고 말하면 다음 단계로 넘어갈게요!`;
              } else {
                merged += `\n\n빠진 재료가 있으면 말해주세요!\n\n요리를 바로 시작할까요?`;
              }
              addMessage(merged.trim(), "assistant");
            } catch {
              addMessage(
                "레시피 업데이트에 실패했어요. 다시 시도해주세요.",
                "assistant"
              );
            }
            return;
          }

          // 일부 그룹 미선택 → 남은 그룹만 다시 물어보기
          setReplacementMode((prev) =>
            prev ? { ...prev, groups: unansweredGroups } : null
          );
          const unansweredNames = unansweredGroups
            .map((g) => `• ${g.groupName}`)
            .join("\n");
          addMessage(
            `다음 재료들의 선택을 못 알아들었어요:\n${unansweredNames}\n번호나 재료명을 말씀해 주세요.`,
            "assistant"
          );
          return;
        }

        // ── 단일 그룹 모드 ──
        let selected: string | null = null;

        // 1) 번호로 고른 경우
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

        // 2) 재료 이름으로 고른 경우 (완전 일치 → 정규화 일치)
        if (!selected && replacementMode.options) {
          selected =
            replacementMode.options.find((opt) => {
              if (user.includes(opt)) return true;
              const norm = normalizeOptionForMatch(opt);
              return norm.length >= 4 && user.includes(norm);
            }) ?? null;
        }

        if (selected) {
          setAwaitingReplacementChoice(false);
          const savedMode = replacementMode;
          setReplacementMode(null);

          let followupText: string;

          if (savedMode?.contextType === 'substitution') {
            const isRemoveOption =
              selected.includes("없이") ||
              selected.includes("빼고") ||
              selected.includes("제거");
            followupText = isRemoveOption
              ? `${savedMode.missing ?? ""} 없이 만들게 해줘`
              : `${savedMode.missing ?? ""}를 ${selected}로 대체해줘`;
          } else {
            followupText = selected;
          }

          try {
            const result: FollowupResult = await askCookingFollowup(
              recipeInfoRef.current,
              followupText,
              userProfile
            );

            setRecipeInfo(result.recipe);

            const ingredientsChanged =
              JSON.stringify(result.recipe?.fullIngredients ?? []) !==
              JSON.stringify(recipeInfoRef.current?.fullIngredients ?? []);

            // GPT가 assistantMessage 안에 재료 목록을 직접 넣는 경우 제거 (클라이언트가 통일 처리)
            let merged = (result.assistantMessage ?? "")
              .replace(/요리를 바로 시작할까요[^\n]*/g, "")
              .replace(/\n+[^\n]*재료 목록입니다:[\s\S]*/g, "")
              .trim();

            if (ingredientsChanged && result.recipe?.fullIngredients?.length) {
              const recipeName =
                result.recipe.recipeName ??
                recipeInfoRef.current?.recipeName ??
                "";
              merged += `\n\n${recipeName} 재료 목록입니다:\n${result.recipe.fullIngredients.join("\n")}`;
            }

            if (savedMode?.contextType === 'substitution') {
              if (cookingStartedRef.current) {
                merged += `\n\n"다음"이라고 말하면 다음 단계로 넘어갈게요!`;
              } else {
                merged += `\n\n빠진 재료가 있으면 말해주세요!\n\n요리를 바로 시작할까요?`;
              }
            }

            addMessage(merged.trim(), "assistant");
          } catch {
            addMessage(
              "레시피 업데이트에 실패했어요. 다시 시도해주세요.",
              "assistant"
            );
          }

          return;
        }

        // 번호/이름도 못 알아들었을 때
        addMessage(
          `알아듣기 어려워요.\n번호나 재료명을 다시 알려주세요.\n예: "1번", "쪽파로 대체해줘", "없이 만들기"`,
          "assistant"
        );
        return;
        } // ← 탈출구 else 블록 닫기
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

    // ===== 1) 처음 레시피 생성 (또는 인사/일반 대화) =====
    if (!recipeInfoLocal) {
      // 추천 요청 인터셉트: 특정 요리 없이 "뭐 먹을까" 류 → 목록 먼저 보여주기
      if (isRecommendationIntent(text)) {
        try {
          const result = await getRecipeRecommendations(userProfile);
          const list: { name: string; description: string }[] = result.recommendations ?? [];
          if (list.length > 0) {
            setRecommendationList(list);
            setAwaitingRecommendationChoice(true);
            const listText = list
              .map((r, i) => `${i + 1}) ${r.name}\n   ${r.description}`)
              .join("\n\n");
            addMessage(
              `오늘 만들기 좋은 요리를 추천해드릴게요!\n번호를 말씀해 주세요:\n\n${listText}`,
              "assistant"
            );
            return;
          }
        } catch {
          // 추천 실패 시 일반 GPT 경로로 폴백
        }
      }

      // "응", "해줘", "웅" 같은 짧은 확인 응답 + 이전에 레시피 쿼리가 있으면 재시도
      const isSimpleConfirmation =
        text.replace(/\s/g, "").length <= 6 &&
        ["응", "웅", "네", "예", "해줘", "해봐", "ㅇㅇ", "맞아", "그래", "좋아", "ok"].some(
          w => text.replace(/\s/g, "").toLowerCase().includes(w)
        );

      const queryToUse =
        isSimpleConfirmation && lastRecipeQuery ? lastRecipeQuery : text;

      try {
        const json = await askGPT_raw({ message: queryToUse, profile: userProfile });
        const info = JSON.parse(json);

        // 레시피가 없는 응답 (인사, 요리 외 거절, 일반 요리 Q&A)
        const hasRecipe =
          info.recipeName &&
          Array.isArray(info.steps) && info.steps.length > 0 &&
          Array.isArray(info.fullIngredients) && info.fullIngredients.length > 0;
        const hasMessage =
          typeof info.assistantMessage === "string" &&
          info.assistantMessage.trim().length > 0;

        if (!hasRecipe) {
          if (hasMessage) {
            // 레시피/추천 요청처럼 보이는 경우에만 재시도용 쿼리 저장
            // (인사, 단순 Q&A는 저장 안 함 → "응 해줘" 시 "안녕"으로 재시도하는 오류 방지)
            const looksLikeRecipeRequest =
              text.length > 4 &&
              !["안녕", "반가워", "처음이에요", "뭐 할 수 있어", "도와줘"].some((g) =>
                text.replace(/\s/g, "").includes(g.replace(/\s/g, ""))
              );
            if (looksLikeRecipeRequest) setLastRecipeQuery(text);
            addMessage(info.assistantMessage, "assistant");
          } else {
            addMessage(
              "요리 관련 질문을 해주세요!\n예: '김치볶음밥 알려줘', '오늘 요리 추천해줘', '냉장고에 달걀이랑 감자 있어'",
              "assistant"
            );
          }
          return;
        }

        setLastRecipeQuery(null);

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
        addMessage("레시피를 불러오지 못했어요! 다시 시도해주세요.", "assistant");
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

    // ===== 2) 재료 체크 단계 =====
    if (!ingredientsChecked) {
      const readyKeywords = [
        "다 있어", "다있어", "재료 다 있어", "재료다있어",
        "다 있어요", "다있어요", "다 준비됐어", "다준비됐어",
        "다 준비됐어요", "다준비됐어요", "준비 완료", "준비완료",
        "다 갖고 있어", "다갖고있어", "모두 있어", "모두있어",
      ];
      if (readyKeywords.some((k) => text.replace(/\s/g, "").includes(k.replace(/\s/g, "")))) {
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
        handleStepStart(nowRecipe.steps?.[0] ?? "");
        return;
      }
      try {
        const result: FollowupResult = await askCookingFollowup(
          nowRecipe,
          text,
          userProfile
        );
        setRecipeInfo(result.recipe);

        // AI 응답에서 번호형 대체 옵션 파싱 (새 형식: "1) 재료 — 이유")
        const msgLines = result.assistantMessage.split("\n");
        const numberedLines = msgLines.filter(line => /^\d+\)/.test(line.trim()));
        const hasSubstitutionOptions = numberedLines.length > 0;

        // 재료 변경 감지: 대체 선택지 없이 재료가 바뀐 경우 → 목록 즉시 표시
        const ingredientsChanged =
          JSON.stringify(result.recipe?.fullIngredients ?? []) !==
          JSON.stringify(nowRecipe?.fullIngredients ?? []);

        // GPT가 assistantMessage 안에 재료 목록을 직접 넣는 경우 제거 (클라이언트가 통일 처리)
        let msg = (result.assistantMessage ?? "")
          .replace(/요리를 바로 시작할까요[^\n]*/g, "")
          .replace(/\n+[^\n]*재료 목록입니다:[\s\S]*/g, "")
          .trim();

        if (ingredientsChanged && !hasSubstitutionOptions && result.recipe?.fullIngredients?.length) {
          const recipeName = result.recipe.recipeName ?? nowRecipe.recipeName ?? "";
          msg += `\n\n${recipeName} 재료 목록입니다:\n${result.recipe.fullIngredients.join("\n")}`;
        }

        addMessage(msg, "assistant");

        if (hasSubstitutionOptions) {
          const parsedGroups = parseSubstitutionGroups(result.assistantMessage ?? "");
          if (parsedGroups.length > 1) {
            // 복수 재료 그룹: 다중 선택 모드 (각 그룹이 자체 contextType 보유)
            setReplacementMode({
              missing: null,
              options: null,
              groups: parsedGroups,
              contextType: 'substitution', // multi-group에서는 groups[i].contextType 사용
            });
          } else {
            // 단일 그룹: 기존 동작
            const options = numberedLines.map(line =>
              line.replace(/^\d+\)\s*/, "").split(/\s*[—–\-]\s*/)[0].trim()
            );
            const missing = text
              .replace(/없어|없는데|없음|없다|이 없어|가 없어/g, "")
              .trim();
            const isSubstitutionContext = options[options.length - 1]?.includes("없이");
            setReplacementMode({
              missing: isSubstitutionContext ? (missing || null) : null,
              options,
              groups: null,
              contextType: isSubstitutionContext ? 'substitution' : 'action',
            });
          }
          setAwaitingReplacementChoice(true);
        }
      } catch {
        addMessage("빠진 재료가 있을까요?", "assistant");
      }
      return;
    }


    // ===== 3) 요리 시작 전 (재료 확인 완료, 아직 시작 안 한 상태) =====
    if (!cookingStarted) {
      if (isStartIntent(text) || isNextIntent(text)) {
        setCookingStarted(true);
        setCurrentStepIndex(0);
        addMessage(buildStepMessage(0, nowRecipe.steps || []), "assistant");
        handleStepStart(nowRecipe.steps?.[0] ?? "");
        return;
      }
      // 시작 의도 외 질문/요청은 GPT로 처리 (재료 변경, 요리 질문 등)
      try {
        const result: FollowupResult = await askCookingFollowup(nowRecipe, text, userProfile);
        setRecipeInfo(result.recipe);
        const ing3Changed = JSON.stringify(result.recipe?.fullIngredients ?? []) !== JSON.stringify(nowRecipe?.fullIngredients ?? []);
        const msgLines3 = (result.assistantMessage ?? "").split("\n");
        const numLines3 = msgLines3.filter((l) => /^\d+\)/.test(l.trim()));
        const hasOpts3 = numLines3.length > 0;
        // GPT가 assistantMessage 안에 재료 목록을 직접 넣는 경우 제거 (클라이언트가 통일 처리)
        let msg3 = (result.assistantMessage ?? "")
          .replace(/요리를 바로 시작할까요[^\n]*/g, "")
          .replace(/\n+[^\n]*재료 목록입니다:[\s\S]*/g, "")
          .trim();
        if (ing3Changed && !hasOpts3 && result.recipe?.fullIngredients?.length) {
          const rn3 = result.recipe.recipeName ?? nowRecipe.recipeName ?? "";
          msg3 += `\n\n${rn3} 재료 목록입니다:\n${result.recipe.fullIngredients.join("\n")}`;
        }
        addMessage(msg3, "assistant");
        if (hasOpts3) {
          const pg3 = parseSubstitutionGroups(result.assistantMessage ?? "");
          if (pg3.length > 1) {
            setReplacementMode({ missing: null, options: null, groups: pg3, contextType: 'substitution' });
          } else {
            const opts3 = numLines3.map((l) => l.replace(/^\d+\)\s*/, "").split(/\s*[—–\-]\s*/)[0].trim());
            const isSub3 = opts3[opts3.length - 1]?.includes("없이");
            setReplacementMode({ missing: isSub3 ? (text.replace(/없어|없는데|없음|없다|이 없어|가 없어/g, "").trim() || null) : null, options: opts3, groups: null, contextType: isSub3 ? 'substitution' : 'action' });
          }
          setAwaitingReplacementChoice(true);
        }
      } catch {
        addMessage(`요리를 시작하려면 "시작해"라고 말해주세요!`, "assistant");
      }
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

      const msgLines5 = (result.assistantMessage ?? "").split("\n");
      const numLines5 = msgLines5.filter((l) => /^\d+\)/.test(l.trim()));
      const hasOpts5 = numLines5.length > 0;

      const ingredientsChanged =
        JSON.stringify(result.recipe?.fullIngredients ?? []) !==
        JSON.stringify(nowRecipe?.fullIngredients ?? []);

      let msg = result.assistantMessage ?? "";

      if (ingredientsChanged && !hasOpts5 && result.recipe?.fullIngredients?.length) {
        const recipeName = result.recipe.recipeName ?? nowRecipe.recipeName ?? "";
        msg += `\n\n${recipeName} 재료 목록입니다:\n${result.recipe.fullIngredients.join("\n")}`;
      }

      addMessage(msg, "assistant");

      // 요리 중에도 대체재/수량 선택지가 나오면 awaitingReplacementChoice 진입
      if (hasOpts5) {
        const pg5 = parseSubstitutionGroups(result.assistantMessage ?? "");
        if (pg5.length > 1) {
          setReplacementMode({ missing: null, options: null, groups: pg5, contextType: 'substitution' });
        } else {
          const opts5 = numLines5.map((l) => l.replace(/^\d+\)\s*/, "").split(/\s*[—–\-]\s*/)[0].trim());
          const isSub5 = opts5[opts5.length - 1]?.includes("없이");
          setReplacementMode({ missing: isSub5 ? (text.replace(/없어|없는데|없음|없다|이 없어|가 없어/g, "").trim() || null) : null, options: opts5, groups: null, contextType: isSub5 ? 'substitution' : 'action' });
        }
        setAwaitingReplacementChoice(true);
      }
    } catch {
      addMessage("다시 설명해줄래요?", "assistant");
    }
  }

  // ===============================
  // 텍스트 입력
  // ===============================
  const sendText = async () => {
    if (!textInput.trim()) return;
    const displayText = textInput.trim();     // 채팅창에 표시: 원본 유지 (?!., 보존)
    const clean = normalizeText(textInput);   // 처리용: !., 제거
    setTextInput("");
    setIsProcessing(true);

    // 1. 사용자 질문을 먼저 화면에 추가 (순서 보장)
    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, type: "user", text: displayText, timestamp: new Date() }
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

  {/* TTS 제어 행: 음소거 토글 + 설정 */}
  <div className="flex items-center gap-2">
    {/* 음성 ON/OFF 토글 */}
    <button
      type="button"
      onClick={() => {
        if (ttsEnabled) {
          stopSpeaking();
          setIsSpeaking(false);
        }
        setTtsEnabled((v) => !v);
      }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
        ttsEnabled
          ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
          : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
      }`}
    >
      {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
      {ttsEnabled ? "음성 켜짐" : "음성 꺼짐"}
    </button>

    {/* 설정 패널 열기 */}
    <button
      type="button"
      onClick={() => setShowTtsSettings((v) => !v)}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:bg-muted transition-colors"
    >
      <Settings className="w-3.5 h-3.5" />
      목소리 설정
      {showTtsSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
    </button>

    {/* 말하기 멈추기 (말하는 중일 때만) */}
    {isSpeaking && (
      <button
        type="button"
        onClick={() => { stopSpeaking(); setIsSpeaking(false); }}
        className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:bg-muted transition-colors"
      >
        ⏹ 멈추기
      </button>
    )}
  </div>

  {/* 설정 패널 */}
  {showTtsSettings && (
    <div className="rounded-xl border border-border bg-background p-4 flex flex-col gap-4 text-sm">
      {/* 목소리 선택 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">목소리 선택</label>
        {availableVoices.length === 0 ? (
          <p className="text-xs text-muted-foreground">사용 가능한 한국어 목소리를 불러오는 중...</p>
        ) : (
          <select
            value={selectedVoiceName}
            onChange={(e) => setSelectedVoiceName(e.target.value)}
            className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">기본 목소리</option>
            {availableVoices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 말하기 속도 */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">말하기 속도</label>
          <span className="text-xs font-mono text-primary">{ttsRate.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={ttsRate}
          onChange={(e) => setTtsRate(parseFloat(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>느리게 0.5x</span>
          <span>보통 1.0x</span>
          <span>빠르게 2.0x</span>
        </div>
      </div>

      {/* 미리 듣기 */}
      <button
        type="button"
        onClick={() => {
          const voice = availableVoices.find((v) => v.name === selectedVoiceName) ?? null;
          speakText("안녕하세요! 저는 두콩 요리 도우미예요. 이 목소리로 안내해드릴게요.", {
            lang: "ko-KR",
            rate: ttsRate,
            pitch: 1.0,
            voice,
            onStart: () => setIsSpeaking(true),
            onEnd: () => setIsSpeaking(false),
          });
        }}
        className="w-full rounded-lg border border-primary/30 bg-primary/10 py-2 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
      >
        🔊 미리 듣기
      </button>
    </div>
  )}

  {/* isSpeaking 기존 UI 제거 (위 버튼으로 통합됨) */}
  {false && isSpeaking && (
    <div className="flex justify-end">
      <Button variant="outline" size="sm" onClick={() => { stopSpeaking(); setIsSpeaking(false); }}>
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