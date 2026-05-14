import { useState, useEffect } from "react";
import { Auth } from "./components/Auth";
import { HomePage } from "./components/HomePage";
import { ProfileSetup, UserProfile } from "./components/ProfileSetup";
import { ProfileComplete } from "./components/ProfileComplete";
import { VoiceAssistant } from "./components/VoiceAssistant";
import { RecipeReview } from "./components/RecipeReview";
import { TopNavBar } from "./components/TopNavBar";
import { SidebarNav } from "./components/SidebarNav";
import { RecipeListPage, type Recipe as RecipeListRecipe } from "./components/RecipeListPage";
import { SavedPage } from "./components/SavedPage";
import { MyPage } from "./components/MyPage";
import { IngredientsManagement } from "./components/IngredientsManagement";
import { AccountSettings } from "./components/AccountSettings";
import { CommunityPage } from "./components/CommunityPage";
import { CompletedRecipesPage } from "./components/CompletedRecipesPage";
import { DietReportPage } from "./components/DietReportPage";
import type { Recipe as AiRecipe } from "./types/recipe";

//import { EmailVerified } from "./components/EmailVerified";


// ⭐ FoodRecipe / FullRecipe (첫 번째 코드에서 사용)
import { FoodRecipe, FullRecipe } from "./components/FoodRecipe";


//import { getSavedRecipeById } from "./utils/api";

import {
  getCurrentUser,
  removeAuthToken,
  updateProfile,
  saveRecipe,
  removeSavedRecipe,
  getSavedRecipes,
  getCompletedRecipes,
  addCompletedRecipe,
  getCompletedRecipeById 
} from "./utils/api";
import type { CompletedRecipe } from "./types/recipe";
import type { CompletedRecipePayload } from "./types/recipe";


type AppStep =
  | "auth"
  | "home"
  | "profile"
  | "profile-complete"
  | "ingredients"
  | "recommendations"
  | "recipe"
  | "feedback"
  | "voice-assistant"
  | "ingredient-check"
  | "cooking-in-progress"
  | "recipe-list"
  | "saved"
  | "mypage"
  | "ingredients-management"
  | "account-settings"
  | "recipe-review"
  | "community"
  | "completed-recipes"
  | "full-recipe"
  | "diet-report";

interface RecipeDetailData {
  id: string;
  name: string;
  image: string | null;
  description: string | null;
  category: string;

  cooking_method: string | null | undefined;
  hashtags: string | null | undefined;

  cookingTime?: string | null;
  difficulty?: string | null;

  ingredients: { name: string; amount: string }[];
  steps: string[];
}


// 레시피 제목으로 대표 이미지 URL 만들기 (Unsplash)
const buildImageFromTitle = (title: string) => {
  const query = encodeURIComponent(`${title}, 음식, 요리, food, dish`);
  return `https://source.unsplash.com/featured/?${query}`;
};




// ✅ 같은 메뉴 이름(name) 기준으로 최신 기록만 남기기
function dedupeCompletedRecipes(list: CompletedRecipe[]): CompletedRecipe[] {
  const map = new Map<string, CompletedRecipe>();

  for (const item of list) {
    const key = item.name || item.id;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
    } else {
      const prevTime = new Date(existing.completedAt).getTime();
      const curTime = new Date(item.completedAt).getTime();

      // ✅ "더 최신 것만 유지"
      if (curTime > prevTime) {
        map.set(key, item);
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.completedAt).getTime() -
      new Date(a.completedAt).getTime()
  );
}



export default function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>("auth");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
    name: string;
  } | null>(null);

  const [voiceSessionKey, setVoiceSessionKey] = useState(1);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetailData | null>(
    null
  );

  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedFullRecipe, setSelectedFullRecipe] =
    useState<FullRecipe | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [pageHistory, setPageHistory] = useState<AppStep[]>([]);
  const [completedRecipes, setCompletedRecipes] = useState<CompletedRecipe[]>(
    []
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("전체");
  const [savedRecipes, setSavedRecipes] = useState<RecipeListRecipe[]>([]);
  const [initialAiRecipe, setInitialAiRecipe] = useState<AiRecipe | null>(null);

  // ⭐ 추가: 첫 로그인 온보딩 상태


  useEffect(() => {
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 0);
  }, [currentStep]);


  // ------------------------------
  //   세션 확인 로직
  // ------------------------------
  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedUser = sessionStorage.getItem(
          "cooking_assistant_current_user"
        );

        if (storedUser) {
          const cachedUser = JSON.parse(storedUser);

          try {
            const response = await getCurrentUser();

            if (response && response.user) {
              const user = { ...cachedUser, ...response.user };

              setCurrentUser(user);
              setIsAuthenticated(true);
              setCurrentStep("home");

              try {
                const list = await getSavedRecipes();

                // 👉 서버에서 온 데이터를 화면용 Recipe 형태로 변환
                const normalized = list.map((item: any) => ({
                id: item.recipe_id,              // ★ 실제 레시피 ID로 맞추기
                name: item.name,
                category: item.category ?? null,
                image: item.image ?? null,
              }));

setSavedRecipes(normalized);
localStorage.setItem(
  "cooking_assistant_saved_recipes",
  JSON.stringify(normalized)
);

              } catch (e) {
                console.error("Failed to load saved recipes:", e);
              }

              sessionStorage.setItem(
                "cooking_assistant_current_user",
                JSON.stringify(user)
              );
            }
          } catch (error) {
            sessionStorage.removeItem("cooking_assistant_current_user");
            removeAuthToken();
          }
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, []);


  // ------------------------------
  // ⏱ 로그인 1시간 자동 로그아웃
  // ------------------------------
  useEffect(() => {
    if (!isAuthenticated) return;

    const loginTime = localStorage.getItem("loginTime");
    if (!loginTime) return;

    const ONE_HOUR = 60 * 60 * 1000;
    const elapsed = Date.now() - Number(loginTime);

    // 이미 1시간 초과
    if (elapsed >= ONE_HOUR) {
      handleLogout();
      return;
    }

    // 남은 시간 후 자동 로그아웃
    const timeout = setTimeout(() => {
      handleLogout();
    }, ONE_HOUR - elapsed);

    return () => clearTimeout(timeout);
  }, [isAuthenticated]);


  

  // ✅ 완료한 요리 목록 서버에서 최초 1회 로딩
useEffect(() => {
  if (!isAuthenticated) return;

  getCompletedRecipes()
    .then((list) => {
      console.log("✅ completedRecipes 로드됨:", list);
      setCompletedRecipes(list);
    })
    .catch((e) => {
      console.error("❌ 완료한 요리 불러오기 실패:", e);
    });
}, [isAuthenticated]);


  // ------------------------------
  //   다크모드 / 프로필 / 저장데이터 로드
  // ------------------------------
  useEffect(() => {
    const savedDarkMode = localStorage.getItem("cooking_assistant_dark_mode");
    if (savedDarkMode === "true") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }

    const savedProfile = localStorage.getItem(
      "cooking_assistant_user_profile"
    );
    if (savedProfile) {
      try {
        setUserProfile(JSON.parse(savedProfile));
      } catch (error) {
        console.error("Failed to load user profile:", error);
      }
    }

    /*const savedCompleted = localStorage.getItem(
      "cooking_assistant_completed_recipes"
    );
    if (savedCompleted) {
      try {
        setCompletedRecipes(JSON.parse(savedCompleted));
      } catch (error) {
        console.error("Failed to load completed recipes:", error);
      }
    }*/

    const savedRecipesData = localStorage.getItem(
      "cooking_assistant_saved_recipes"
    );
    if (savedRecipesData) {
      try {
        setSavedRecipes(JSON.parse(savedRecipesData));
      } catch (error) {
        console.error("Failed to load saved recipes:", error);
      }
    }

    const handleSavedRecipesUpdate = () => {
      const data = localStorage.getItem("cooking_assistant_saved_recipes");
      if (data) {
        try {
          setSavedRecipes(JSON.parse(data));
        } catch (e) {
          console.error("Fail reload saved recipes:", e);
        }
      }
    };

    window.addEventListener("savedRecipesUpdated", handleSavedRecipesUpdate);
    return () => {
      window.removeEventListener(
        "savedRecipesUpdated",
        handleSavedRecipesUpdate
      );
    };
  }, []);

  const resetCookingContext = () => {
    setSelectedFullRecipe(null);
    setInitialAiRecipe(null);
  };

  // ------------------------------
  //   네비게이션 / 뒤로가기 처리
  // ------------------------------
  const navigateToStep = (newStep: AppStep, addToHistory = true) => {
    /* ✅ voice-assistant를 떠나는 순간 초기화
    if (currentStep === "voice-assistant" && newStep !== "voice-assistant") {
      resetCookingContext();
    }*/

    if (addToHistory && currentStep !== "auth" && currentStep !== newStep) {
      setPageHistory((prev) => [...prev, currentStep]);
    }
    setCurrentStep(newStep);
  };

  const handleBackNavigation = () => {
    if (pageHistory.length > 0) {
      const prev = pageHistory[pageHistory.length - 1];
      setPageHistory((prevHist) => prevHist.slice(0, -1));
      setCurrentStep(prev);
    } else {
      setCurrentStep("home");
    }
  };


  const refreshSavedRecipes = async () => {
    try {
      const list = await getSavedRecipes();

      const normalized = list.map((item: any) => ({
        id: item.recipe_id,
        name: item.name,
        category: item.category ?? null,
        image: item.image ?? null,
      }));

      setSavedRecipes(normalized);

      localStorage.setItem(
        "cooking_assistant_saved_recipes",
        JSON.stringify(normalized)
      );

      // ✅ 기존 이벤트 방식 유지 중이니까 이것도 같이 날려줌
      window.dispatchEvent(new Event("savedRecipesUpdated"));

    } catch (e) {
      console.error("Failed to refresh saved recipes:", e);
    }
  };

  // ------------------------------
  //   로그인 / 로그아웃
  // ------------------------------
  const handleAuthSuccess = async () => {
    const user = sessionStorage.getItem("cooking_assistant_current_user");
    if (user) setCurrentUser(JSON.parse(user));

    setIsAuthenticated(true);
    setPageHistory([]);
    setCurrentStep("home");

    try {
      const list = await getSavedRecipes();
      const normalized = list.map((item: any) => ({
      id: item.recipe_id,
      name: item.name,
      category: item.category ?? null,
      image: item.image ?? null,
    }));

    setSavedRecipes(normalized);
    localStorage.setItem(
    "cooking_assistant_saved_recipes",
    JSON.stringify(normalized)
  );
} catch (err) {
  console.error("Failed to load saved recipes:", err);
}
try {
  const completed = await getCompletedRecipes();
  const deduped = dedupeCompletedRecipes(completed);

  setCompletedRecipes(deduped);
  localStorage.setItem(
    "cooking_assistant_completed_recipes",
    JSON.stringify(deduped)
  );
} catch (e) {
  console.error("Failed to load completed recipes:", e);
}
  };

  const handleLogout = () => {
    sessionStorage.removeItem("cooking_assistant_current_user");
    localStorage.removeItem("cooking_assistant_user_profile");
    localStorage.removeItem("cooking_assistant_completed_recipes"); 
    localStorage.removeItem("loginTime"); // ⭐ 추가
    removeAuthToken();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUserProfile(null);
    setSelectedRecipe(null);
    setCompletedRecipes([]);
    setPageHistory([]);
    setCurrentStep("auth");
  };

  // ------------------------------
  //   프로필 완료
  // ------------------------------
  const handleProfileComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem(
      "cooking_assistant_user_profile",
      JSON.stringify(profile)
    );

    updateProfile({
      allergies: profile.allergies,
      preferences: profile,
    }).catch((err) => console.error("프로필 저장 실패:", err));

    handleBackNavigation();
  };



  const handleSavedRecipeClick = async (recipeId: string) => {
  try {
    // ✅ 1️⃣ 먼저 completed_recipes에서 조회 시도 (AI 레시피)
    try {
      const completedRes = await getCompletedRecipeById(recipeId);
      const completed = completedRes?.recipe;

      if (completed) {
        const aiRecipe: AiRecipe = {
          id: completed.id,
          name: completed.name,
          description: completed.description ?? undefined,
          image: completed.image ?? undefined,
          category: completed.category,
          cookingTime: completed.cookingTime ?? null,
          servings: completed.servings ?? null,
          difficulty: completed.difficulty ?? null,

          ingredients: completed.ingredients.map((i: any) => ({
            name: i.name,
            amount: i.amount,
          })),

          steps: completed.steps,

          fullIngredients: completed.ingredients.map((i: any) => {
            const amount = i.amount ? ` ${i.amount}` : "";
            return `• ${i.name}${amount}`;
          }),
        };

        setInitialAiRecipe(aiRecipe);
        navigateToStep("voice-assistant");
        return; // ✅ 여기서 끝 (AI 레시피)
      }
    } catch (e) {
      // ✅ completed_recipes에 없으면 그냥 일반 레시피로 처리
    }

    // ✅ 2️⃣ 일반 공개 레시피
    // ✅ 2️⃣ 일반 공개 레시피 (SavedPage에서 클릭한 경우)
    setInitialAiRecipe(null);
    setSelectedRecipeId(recipeId);
    setSelectedRecipe(null);
    setSelectedFullRecipe(null);
    navigateToStep("full-recipe");


  } catch (e) {
    console.error("❌ 저장 레시피 클릭 실패:", e);
    alert("레시피를 불러오지 못했습니다.");
  }
};





  // ------------------------------
  //   레시피 상세/전체 페이지
  // ------------------------------
  const handleRecipeClick = async (recipeId: string) => {
  // ✅ AI 레시피면 completed_recipes에서 직접 불러오기
  if (recipeId.startsWith("ai-")) {
    try {
      const completedRes = await getCompletedRecipeById(recipeId); // ✅ 1단계
      const completed = completedRes?.recipe;                     // ✅✅ 핵심

      if (!completed) {
        alert("완료된 AI 레시피를 찾을 수 없습니다.");
        return;
      }

      const aiRecipe: AiRecipe = {
        id: completed.id,
        name: completed.name,
        description: completed.description ?? undefined,
        image: completed.image ?? undefined,
        category: completed.category,
        cookingTime: completed.cookingTime ?? null,
        servings: completed.servings ?? null,
        difficulty: completed.difficulty ?? null,

        ingredients: completed.ingredients.map((i: any) => ({
          name: i.name,
          amount: i.amount,
        })),

        steps: completed.steps,

        fullIngredients: completed.ingredients.map((i: any) => {
          const amount = i.amount ? ` ${i.amount}` : "";
          return `• ${i.name}${amount}`;
        }),
      };

      setInitialAiRecipe(aiRecipe);
      navigateToStep("voice-assistant");
      return;
    } catch (e) {
      console.error("❌ AI 레시피 불러오기 실패:", e);
      alert("레시피를 불러오지 못했습니다.");
      return;
    }
  }

  // ✅ 일반 DB 레시피
  setInitialAiRecipe(null);
  setSelectedRecipeId(recipeId);
  setSelectedRecipe(null);
  setSelectedFullRecipe(null);
  navigateToStep("full-recipe");
};

const openVoiceAssistantFresh = () => {
  setSelectedFullRecipe(null);
  setInitialAiRecipe(null);
  navigateToStep("voice-assistant");
};



  const handleStartCookingAssistant = (recipe: FullRecipe) => {
    setVoiceSessionKey((k) => k + 1);
    setInitialAiRecipe(null);
    setSelectedFullRecipe(recipe);
    navigateToStep("voice-assistant");
  };

  // ------------------------------
  //   GPT로부터 선택된 레시피 처리
  // ------------------------------
  const handleVoiceRecipeSelect = async (recipe: any) => {
    const converted: RecipeDetailData = {
      id: recipe.id,
      name: recipe.recipeName ?? "AI 추천 레시피",
      image: null,
      description: recipe.description ?? null,
      category: "AI 추천",
      cooking_method: null,
      hashtags: null,
      ingredients:
        recipe.ingredients?.map((i: any) => ({
          name: i.name,
          amount: i.amount,
        })) ?? [],
      steps: recipe.steps ?? [],
    };

    setSelectedRecipe(converted);
    navigateToStep("recipe-review");
  };

  // ------------------------------
  //   레시피 완료/리뷰
  // ------------------------------
  /*const handleCookingComplete = () => {
    if (selectedRecipe) {
      const already = completedRecipes.some(
        (r) =>
          r.id === selectedRecipe.id &&
          new Date(r.completedAt).toDateString() ===
            new Date().toDateString()
      );

      if (!already) {
        const done: CompletedRecipe = {
          ...selectedRecipe,
          completedAt: new Date().toISOString(),
        };
        const updated = [done, ...completedRecipes];

        setCompletedRecipes(updated);
        localStorage.setItem(
          "cooking_assistant_completed_recipes",
          JSON.stringify(updated)
        );
      }
    }
    navigateToStep("feedback");
  };*/

  const handleReviewSubmit = () => {
    setSelectedRecipe(null);
    setSelectedFullRecipe(null);
    setPageHistory([]);
    setCurrentStep("home");
  };

  const handleReviewSkip = handleReviewSubmit;

  // ------------------------------
  //   레시피 저장 / 해제
  // ------------------------------
  const handleToggleSaveRecipe = async (recipe: RecipeListRecipe) => {
    const exists = savedRecipes.some((r) => r.id === recipe.id);
    let updated: RecipeListRecipe[];

    if (exists) {
      updated = savedRecipes.filter((r) => r.id !== recipe.id);
      await removeSavedRecipe(recipe.id);
    } else {
      updated = [recipe, ...savedRecipes];
      await saveRecipe({
        recipe_id: recipe.id,
        name: recipe.name,
        category: recipe.category ?? null,
        image: (recipe as any).image ?? null,
        difficulty: null,
        cooking_time: null,
        description: null,
        ingredients: null,
        steps: null,
      });
    }

    setSavedRecipes(updated);
    localStorage.setItem(
      "cooking_assistant_saved_recipes",
      JSON.stringify(updated)
    );
    window.dispatchEvent(new Event("savedRecipesUpdated"));
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle("dark", newMode);
    localStorage.setItem(
      "cooking_assistant_dark_mode",
      newMode ? "true" : "false"
    );
  };

  // ------------------------------
  //   네비게이션 바 / 하단바 표시 기준
  // ------------------------------
  const shouldShowNavigation =
    isAuthenticated && currentStep !== "auth";

  const getActiveBottomTab = () => {
    switch (currentStep) {
      case "home":
        return "home";
      case "recipe-list":
      case "full-recipe":
        return "recipe";
      case "voice-assistant":
      case "ingredient-check":
      case "cooking-in-progress":
        return "ai";
      case "ingredients-management":
        return "ingredients";
      case "mypage":
      case "profile":
      case "account-settings":
      case "saved":
      case "completed-recipes":
        return "mypage";
      case "community":
        return "community";
      case "diet-report":
        return "diet-report";
      default:
        return "home";
    }
  };

const handleCookingCompleteFromAI = async (recipe: AiRecipe) => {
  const recipeId =
  recipe.id && recipe.id.trim() !== ""
    ? recipe.id
    : String(Date.now());   // ✅ ai- 절대 붙이지 마라


  const completedAt = new Date().toISOString();

  // ✅ 제목 & 대표 이미지 URL 결정
  const titleForImage =
    recipe.name ?? recipe.recipeName ?? "이름 없는 레시피";
  const imageUrl =
  recipe.image && recipe.image.trim() !== ""
      ? recipe.image
      : buildImageFromTitle(titleForImage);

  // 🔥 여기서 ingredients를 "제대로" 뽑아서 DB에 넣어줄 거야
  let ingredients: { name: string; amount: string }[] = [];

  const fullLines: string[] =
    Array.isArray((recipe as any).fullIngredients)
      ? (recipe as any).fullIngredients
      : [];

  // 공통 파서: "· 고구마 500g" → { name: "고구마", amount: "500g" }
  const parseLine = (raw: string) => {
    const cleaned = raw
      .replace(/^[·•\-\*]\s*/, "") // 앞의 불릿 제거
      .trim();
    if (!cleaned) return { name: "", amount: "" };

    const [first, ...rest] = cleaned.split(/\s+/);
    return {
      name: first ?? "",
      amount: rest.join(" "),
    };
  };

  if (Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
    ingredients = recipe.ingredients.map((i: any, idx: number) => {
      // 1) 문자열 배열인 경우
      if (typeof i === "string") {
        const source =
          fullLines[idx] && typeof fullLines[idx] === "string"
            ? fullLines[idx]
            : i;
        return parseLine(source);
      }

      // 2) 객체인 경우
      const baseName =
        i.name ?? i.ingredient ?? i.ingredientName ?? "";
      const baseAmount =
        i.amount ?? i.quantity ?? i.qty ?? "";

      // amount가 이미 있으면 그대로 사용
      if (baseAmount && baseAmount.trim() !== "") {
        return {
          name: baseName,
          amount: baseAmount,
        };
      }

      // amount 가 비었으면 fullIngredients 같은 위치에서 보충
      let fromFull = { name: "", amount: "" };
      if (fullLines[idx] && typeof fullLines[idx] === "string") {
        fromFull = parseLine(fullLines[idx]);
      }

      return {
        name: baseName || fromFull.name,
        amount: fromFull.amount,
      };
    });
  } else if (fullLines.length > 0) {
    // ingredients 배열이 없고 fullIngredients만 있을 때
    ingredients = fullLines
      .filter((s) => typeof s === "string" && s.trim().length > 0)
      .map((s) => parseLine(s));
  }

  const steps = recipe.steps ?? [];

  const payload: CompletedRecipePayload = {
    id: recipeId,
    name: titleForImage,        // ✅ 제목 한 번만 정해서 사용
    image: imageUrl,            // ✅ 대표 이미지 URL 저장
    description: recipe.description ?? null,
    category: recipe.category ?? "AI 레시피",
    cooking_method: null,
    hashtags: null,
    ingredients,
    steps,
    completedAt,
    cookingTime:
      typeof recipe.cookingTime === "string"
        ? recipe.cookingTime
        : recipe.cookingTime != null
        ? String(recipe.cookingTime)
        : null,
    servings:
      typeof recipe.servings === "string"
        ? recipe.servings
        : recipe.servings != null
        ? String(recipe.servings)
        : null,
    difficulty: recipe.difficulty ?? null,
  };

  try {
    await addCompletedRecipe(payload);
    


    const newCompleted: CompletedRecipe = {
      id: recipeId,
      name: payload.name,
      image: payload.image,      // ✅ imageUrl 들어 있음
      description: payload.description,
      category: payload.category,
      cooking_method: payload.cooking_method,
      hashtags: payload.hashtags,
      ingredients,
      steps,
      completedAt,
      cookingTime: payload.cookingTime,
      servings: payload.servings,
      difficulty: payload.difficulty,
    };

    // 1) 완료한 요리 목록 업데이트 (중복 제거 + 가장 오래된 기록만 유지)
    setCompletedRecipes(prev => {
      const next = dedupeCompletedRecipes([newCompleted, ...prev]);
      localStorage.setItem("cooking_assistant_completed_recipes", JSON.stringify(next));
      return next;
    });

    // 2) 리뷰 화면에 보여줄 selectedRecipe 세팅
    const reviewRecipe: RecipeDetailData = {
      id: recipeId,
      name: payload.name,
      image: payload.image,      // ✅ 리뷰 화면에서도 같은 이미지
      description: payload.description,
      category: payload.category ?? "AI 레시피",
      cooking_method: payload.cooking_method,
      hashtags: payload.hashtags,
      ingredients,
      steps,
    };
    setSelectedRecipe(reviewRecipe);

    // 3) step 전환 → 리뷰 작성 화면
    navigateToStep("recipe-review");
  } catch (e) {
    console.error("Failed to save completed recipe:", e);
  }
};





const handleCompletedRecipeClick = async (recipe: CompletedRecipe) => {
  try {
    // 🔥 반드시 서버에서 다시 조회
    const res = await getCompletedRecipeById(recipe.id);
    const full = res?.recipe;

    if (!full || !full.steps || full.steps.length === 0) {
      throw new Error("레시피 데이터 없음");
    }

    const aiRecipe: AiRecipe = {
      id: full.id,
      name: full.name,
      description: full.description ?? undefined,
      image: full.image ?? undefined,
      category: full.category,
      cookingTime: full.cookingTime ?? null,
      servings: full.servings ?? null,
      difficulty: full.difficulty ?? null,

      ingredients: full.ingredients.map((i: any) => ({
        name: i.name,
        amount: i.amount,
      })),

      steps: full.steps,

      fullIngredients: full.ingredients.map((i: any) => {
        const amount = i.amount ? ` ${i.amount}` : "";
        return `• ${i.name}${amount}`;
      }),
    };

    setSelectedFullRecipe(null);
    setInitialAiRecipe(aiRecipe);
    navigateToStep("voice-assistant");
  } catch (e) {
    console.error("❌ 완료 레시피 불러오기 실패:", e);
    alert("레시피를 불러오지 못했습니다.");
  }
};



  const SIDEBAR_STEPS = new Set<AppStep>([
    "home", "auth", "recipe-list", "voice-assistant",
    "ingredients-management", "community", "diet-report", "mypage",
  ]);
  const shouldShowBackButton = !SIDEBAR_STEPS.has(currentStep);

  // ------------------------------
  //   렌더링
  // ------------------------------
  const pageContent = (
    <>
      {currentStep === "auth" && !isAuthenticated && (
        <Auth onAuthSuccess={handleAuthSuccess} />
      )}

      {currentStep === "home" && isAuthenticated && (
        <>
          <HomePage
            onGetStarted={() => navigateToStep("profile")}
            onVoiceAssistant={openVoiceAssistantFresh}
            onLogout={handleLogout}
            userName={currentUser?.name}
            onCommunityClick={() => navigateToStep("community")}
            userProfile={userProfile}
            onCategoryClick={(category) => {
              setSelectedCategory(category);
              navigateToStep("recipe-list");
            }}
            onIngredientsClick={() => navigateToStep("ingredients-management")}
            onRecipeClick={handleRecipeClick}
          />
        </>
      )}

      {currentStep === "voice-assistant" && isAuthenticated && (
        <VoiceAssistant
          onRecipeSelect={handleVoiceRecipeSelect}
          onBack={handleBackNavigation}
          userProfile={userProfile}
          initialRecipeContext={selectedFullRecipe}
          initialRecipe={initialAiRecipe}
          onCookingComplete={handleCookingCompleteFromAI}
          sessionKey={voiceSessionKey}
          onNewChat={() => {
            setVoiceSessionKey((k) => k + 1);
            setSelectedFullRecipe(null);
            setInitialAiRecipe(null);
          }}
        />
      )}

      {currentStep === "full-recipe" && selectedRecipeId && (
        <FoodRecipe
          recipeId={selectedRecipeId}
          onStartCookingAssistant={handleStartCookingAssistant}
          onBack={handleBackNavigation}
        />
      )}

      {currentStep === "profile" && isAuthenticated && (
        <ProfileSetup
          onComplete={handleProfileComplete}
          onBack={handleBackNavigation}
          initialProfile={userProfile}
        />
      )}

      {currentStep === "profile-complete" && userProfile && (
        <ProfileComplete
          profile={userProfile}
          onQuickRecommendation={() => navigateToStep("recommendations")}
          onDetailedRecommendation={() => navigateToStep("ingredients")}
          onBack={handleBackNavigation}
        />
      )}

      {currentStep === "recipe-list" && (
        <RecipeListPage
          onRecipeClick={handleRecipeClick}
          initialCategory={selectedCategory}
          savedRecipes={savedRecipes}
          onToggleSave={handleToggleSaveRecipe}
        />
      )}

      {currentStep === "saved" && (
        <SavedPage
          savedRecipes={savedRecipes}
          onRecipeClick={handleSavedRecipeClick}
          onRemoveSaved={handleToggleSaveRecipe}
        />
      )}

      {currentStep === "mypage" && (
        <MyPage
          userName={currentUser?.name}
          onProfileEdit={() => navigateToStep("profile")}
          onAccountSettings={() => navigateToStep("account-settings")}
          onSavedRecipes={() => navigateToStep("saved")}
          onCompletedRecipes={() => navigateToStep("completed-recipes")}
          completedRecipesCount={completedRecipes.length}
          savedRecipesCount={savedRecipes.length}
        />
      )}

      {currentStep === "ingredients-management" && <IngredientsManagement />}

      {currentStep === "account-settings" && (
        <AccountSettings
          onBack={handleBackNavigation}
          onAccountDeleted={handleLogout}
        />
      )}

      {currentStep === "recipe-review" && isAuthenticated && selectedRecipe && (
        <RecipeReview
          recipe={selectedRecipe}
          onSubmit={handleReviewSubmit}
          onSkip={handleReviewSkip}
        />
      )}

      {currentStep === "community" && (
        <CommunityPage
          onGoToSaved={() => navigateToStep("saved")}
          onRefreshSaved={refreshSavedRecipes}
        />
      )}

      {currentStep === "completed-recipes" && (
        <CompletedRecipesPage
          completedRecipes={completedRecipes}
          onRecipeClick={handleCompletedRecipeClick}
        />
      )}

      {currentStep === "diet-report" && isAuthenticated && (
        <DietReportPage
          onStartCooking={() => navigateToStep("voice-assistant")}
          onMyPageClick={() => navigateToStep("mypage")}
        />
      )}
    </>
  );

  // 로그인 전: 풀스크린 중앙 정렬
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        {pageContent}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* 사이드바 (fixed) */}
      {shouldShowNavigation && (
        <SidebarNav
          activeTab={getActiveBottomTab()}
          onHomeClick={() => { setPageHistory([]); setCurrentStep("home"); }}
          onRecipeClick={() => navigateToStep("recipe-list")}
          onAIClick={() => navigateToStep("voice-assistant")}
          onIngredientsClick={() => navigateToStep("ingredients-management")}
          onMyPageClick={() => navigateToStep("mypage")}
          onCommunityClick={() => navigateToStep("community")}
          onDietReportClick={() => navigateToStep("diet-report")}
          onLogoClick={() => { setPageHistory([]); setCurrentStep("home"); }}
        />
      )}

      {/* 메인 영역 — 사이드바 너비만큼 왼쪽 여백 */}
      <div
        style={{
          marginLeft: shouldShowNavigation ? "240px" : "0",
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        {/* 상단 헤더 */}
        {shouldShowNavigation && (
          <TopNavBar
            isAuthenticated={isAuthenticated}
            userName={currentUser?.name}
            onLogout={handleLogout}
            onProfileClick={() => navigateToStep("mypage")}
            onLogoClick={() => { setPageHistory([]); setCurrentStep("home"); }}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
            showBackButton={shouldShowBackButton}
            onBackClick={handleBackNavigation}
          />
        )}

        {/* 컨텐츠 */}
        <main style={{ flex: 1, background: "#f9fafb" }}>
          <div style={{ padding: "24px 28px" }}>
            {pageContent}
          </div>
        </main>
      </div>
    </div>
  );
}
