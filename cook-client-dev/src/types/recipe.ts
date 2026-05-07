export interface Recipe {
  // AI 전용 필드
  recipeName?: string;           // GPT가 줄 때 name 대신 씀
  fullIngredients?: string[];    // GPT가 줄 때 전체 재료 텍스트 배열

  // 공통 필드
  id: string;
  name: string;
  description?: string | null;
  image?: string | null;

  category?: string | null;

  // 요리 정보 (AI/DB 모두 optional)
  cookingTime?: number | string | null;
  servings?: number | string | null;
  difficulty?: string | null;

  // DB용 (optional로 변경)
  calories?: number | null;

  // 재료
  ingredients?: { 
    name: string; 
    amount: string; 
    hasIt?: boolean;        // AI/DB 차이 해결: optional로 변경
  }[];

  // 조리 단계
  steps?: string[];

  // 팁
  tips?: string[];

  // 영양 정보 (optional로 변경)
  nutrition?: { 
    protein?: number; 
    carbs?: number; 
    fat?: number; 
  };
}

// ✅ 완료한 레시피 (DB에서 내려오는 형태)
export interface CompletedRecipe {
  id: string;

  // 기본 정보
  name: string;
  recipeName?: string;        // AI 레시피 호환
  description?: string | null;
  image?: string | null;
  category?: string | null;

  // 요리 정보
  cookingTime?: number | string | null;
  servings?: number | string | null;
  difficulty?: string | null;

  // 🔥 DB 필드 (지금 App.tsx에서 쓰고 있음)
  cooking_method?: string | null;
  hashtags?: string | null;

  // 재료 / 단계
  ingredients?: {
    name: string;
    amount: string;
  }[];
  steps?: string[];

  // 완료 시간
  completedAt: string;
}

// ✅ 완료 레시피 저장용 Payload (addCompletedRecipe에서 사용)
export interface CompletedRecipePayload {
  id: string;
  name: string;
  image: string | null;
  description: string | null;
  category: string | null;

  cooking_method: string | null;
  hashtags: string | null;

  ingredients: {
    name: string;
    amount: string;
  }[];

  steps: string[];
  completedAt: string;

  cookingTime?: string | null;
  servings?: string | null;
  difficulty?: string | null;
}
