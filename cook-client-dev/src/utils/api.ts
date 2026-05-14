// ========================================
// 🟩 utils/api.ts — 배포 최종 안정화 버전
// 규칙:
// 1) DEV에서는 localhost 사용
// 2) PROD(EC2)에서는 무조건 /api (Nginx 프록시)
// 3) 모든 JSON API 호출은 apiCall()만 사용
// 4) fetch 직접 사용은 FormData(파일 업로드)만 예외
// ========================================

// ❌ 조건 분기 전부 제거
const API_BASE_URL = "/api";


// ===============================
// AUTH TOKEN
// ===============================
function getAuthToken(): string | null {
  return sessionStorage.getItem("cooking_assistant_auth_token");
}

export function setAuthToken(token: string) {
  sessionStorage.setItem("cooking_assistant_auth_token", token);
}

export function removeAuthToken() {
  sessionStorage.removeItem("cooking_assistant_auth_token");
}

// ===============================
// 공통 API 호출 (JSON 전용)
// ===============================
async function apiCall(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth: boolean = false
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (requiresAuth) {
    const token = getAuthToken();
    if (!token) throw new Error("로그인이 필요합니다.");
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let data: any = {};
  try {
    data = await response.json();
  } catch {}

  if (!response.ok) {
    const error: any = new Error(
      data.error || data.message || "API 요청 실패"
    );
    error.status = response.status; // ⭐ 핵심
    throw error;
  }


  return data;
}

// ===============================
// AUTH
// ===============================
export async function signUp(email: string, password: string, name: string) {
  return apiCall(
    "/auth/signup",
    { method: "POST", body: JSON.stringify({ email, password, name }) },
    false
  );
}

export async function login(email: string, password: string) {
  return apiCall(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
    false
  );
}

/* ===============================
   ✅ OTP 인증 (회원가입 전)
   =============================== */
export async function sendVerification(email: string) {
  return apiCall(
    "/auth/send-verification",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
    false
  );
}

export async function verifyOtp(email: string, code: string) {
  return apiCall(
    "/auth/verify-otp",
    {
      method: "POST",
      body: JSON.stringify({ email, code }),
    },
    false
  );
}



// ===============================
// PROFILE
// ===============================
export async function getProfile() {
  return apiCall("/profile", {}, true);
}

export async function updateProfile(data: {
  name?: string;
  allergies?: string[];
  preferences?: any;
}) {
  return apiCall(
    "/profile",
    { method: "PUT", body: JSON.stringify(data) },
    true
  );
}

export async function getCurrentUser() {
  const res = await getProfile();
  const profile = res.profile;

  return {
    user: {
      id: profile.id,
      email: profile.email,
      name: profile.name,
    },
    profile,
  };
}

export async function deleteAccount() {
  return apiCall("/profile", { method: "DELETE" }, true);
}


// ===============================
// INGREDIENTS
// ===============================
export async function getIngredients() {
  const res = await apiCall("/ingredients", {}, true);
  return { ingredients: res.ingredients || res.data || [] };
}

export async function addIngredient(data: any) {
  const res = await apiCall(
    "/ingredients",
    { method: "POST", body: JSON.stringify(data) },
    true
  );
  return { ingredient: res.ingredient || res.data };
}

export async function updateIngredient(id: string, data: any) {
  const res = await apiCall(
    `/ingredients/${id}`,
    { method: "PUT", body: JSON.stringify(data) },
    true
  );
  return { ingredient: res.ingredient || res.data };
}

export async function deleteIngredient(id: string) {
  return apiCall(`/ingredients/${id}`, { method: "DELETE" }, true);
}

// ===============================
// RECEIPT OCR (FormData 예외)
// ===============================
export async function parseReceiptImage(formData: FormData) {
  const token = getAuthToken();

  const res = await fetch(`${API_BASE_URL}/receipt/parse`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "영수증 분석 실패");
  }

  return res.json();
}

// ===============================
// SAVED / COMPLETED RECIPES
// ===============================
export async function getSavedRecipes() {
  const res = await apiCall("/recipes", {}, true);
  return res.recipes || [];
}

export async function saveRecipe(recipeData: any) {
  const payload = { ...recipeData, category: recipeData.category ?? "기타" };
  const res = await apiCall(
    "/recipes",
    { method: "POST", body: JSON.stringify(payload) },
    true
  );
  return res;
}

export async function removeSavedRecipe(id: string) {
  return apiCall(`/recipes/${id}`, { method: "DELETE" }, true);
}

export async function getCompletedRecipeById(id: string) {
  return apiCall(`/completed-recipes/${id}`, {}, true);
}

export async function addCompletedRecipe(payload: any) {
  return apiCall(
    "/completed-recipes",
    { method: "POST", body: JSON.stringify(payload) },
    true
  );
}

export async function getCompletedRecipes() {
  const res = await apiCall("/completed-recipes", {}, true);

  return (res.recipes || []).map((r: any) => ({
    // 🔥 기준 ID 통일: recipe_id
    id: r.recipe_id,
    name: r.name,
    image: r.image,
    description: r.description,
    category: r.category,
    cooking_method: r.cooking_method,
    hashtags: r.hashtags,

    ingredients: Array.isArray(r.ingredients_json)
      ? r.ingredients_json
      : typeof r.ingredients_json === "string"
      ? JSON.parse(r.ingredients_json)
      : [],

    steps: Array.isArray(r.steps_json)
      ? r.steps_json
      : typeof r.steps_json === "string"
      ? JSON.parse(r.steps_json)
      : [],

    cookingTime: r.cooking_time,
    servings: r.servings,
    difficulty: r.difficulty,

    // 🔥🔥🔥 이 한 줄이 모든 문제의 원인
    completedAt: r.completed_at,
  }));
}


// ===============================
// PUBLIC RECIPES
// ===============================
export async function getPublicRecipes(params: any) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/recipes/public?${query}`, {}, false);
}

export async function getRecipeDetail(id: string) {
  const res = await apiCall(`/recipes/detail/${id}`, {}, false);
  return res.recipe;
}

export async function getFullRecipeDetail(id: string) {
  const res = await apiCall(`/recipes/full/${id}`, {}, false);
  return res.recipe;
}

// ===============================
// GPT / VOICE
// ===============================
export async function askGPT_raw(data: any) {
  const res = await apiCall(
    "/ai/chat",
    { method: "POST", body: JSON.stringify(data) },
    true
  );
  return res.reply;
}

export async function askCookingFollowup(recipe: any, question: string, profile: any) {
  return apiCall(
    "/ai/followup",
    { method: "POST", body: JSON.stringify({ recipe, question, profile }) },
    true
  );
}

export async function detectStartIntent(text: string) {
  const res = await apiCall(
    "/ai/intent",
    { method: "POST", body: JSON.stringify({ text }) },
    false
  );
  return res.intent;
}

export async function speechToText(audioBlob: Blob) {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append("audio", audioBlob);

  const res = await fetch(`${API_BASE_URL}/voice/stt`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function textToSpeech(text: string) {
  return apiCall(
    "/ai/voice/tts",
    { method: "POST", body: JSON.stringify({ text }) },
    true
  );
}

// ===============================
// SHOP SEARCH
// ===============================
export interface ShopProduct {
  title: string;
  price: string;
  image: string;
  link: string;
  mall: string;
}

export async function searchShopProducts(query: string): Promise<ShopProduct[]> {
  const res = await apiCall(`/shop-search?q=${encodeURIComponent(query)}`, {}, false);
  return res.items as ShopProduct[];
}

// ===============================
// HEALTH
// ===============================
export async function healthCheck() {
  return apiCall("/health");
}
