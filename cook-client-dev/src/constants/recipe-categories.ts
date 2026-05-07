/**
 * 식약처 레시피 카테고리 (확정)
 * 
 * 식약처 API RCP_PAT2 필드의 실제 값 6개:
 * - 국&찌개
 * - 기타
 * - 반찬
 * - 밥
 * - 일품
 * - 후식
 */

export interface RecipeCategory {
  id: string;        // DB 원본 값 (API 요청 시 사용)
  label: string;     // 프론트 표시용 이름
  icon?: string;     // 아이콘 (선택)
}

export const RECIPE_CATEGORIES: RecipeCategory[] = [
  { id: "국&찌개", label: "국 · 찌개" },
  { id: "반찬", label: "반찬" },
  { id: "밥", label: "밥" },
  { id: "일품", label: "일품요리" },
  { id: "후식", label: "후식" },
  { id: "기타", label: "기타" },
];

// 카테고리 ID로 라벨 찾기
export function getCategoryLabel(categoryId: string): string {
  const category = RECIPE_CATEGORIES.find(c => c.id === categoryId);
  return category?.label || categoryId;
}

// 카테고리 라벨로 ID 찾기
export function getCategoryId(categoryLabel: string): string {
  const category = RECIPE_CATEGORIES.find(c => c.label === categoryLabel);
  return category?.id || categoryLabel;
}
