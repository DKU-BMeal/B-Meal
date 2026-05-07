import { Bookmark, ChefHat, Utensils } from "lucide-react";
import type { Recipe } from "./RecipeListPage";

interface SavedPageProps {
  savedRecipes?: Recipe[];
  onRecipeClick?: (id: string) => void;
  onRemoveSaved?: (recipe: Recipe) => void;
}

const isPlaceholderImage = (url?: string) => {
  if (!url) return true;
  if (url.includes("photo-1604908176997-1251884b08a3")) return true;
  return false;
};

export function SavedPage({ savedRecipes = [], onRecipeClick }: SavedPageProps) {
  const buildImageFromTitle = (title: string) => {
    const query = encodeURIComponent(`${title}, 음식, 요리, food`);
    return `https://source.unsplash.com/featured/?${query}`;
  };

  return (
    <div className="space-y-6">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">저장한 레시피</h1>
          <p className="text-sm text-gray-500 mt-1">클릭하면 AI 요리 보조가 바로 시작됩니다</p>
        </div>
        <span className="px-4 py-1.5 rounded-full text-sm font-semibold" style={{ background:"#e8f2dd", color:"#3a5c3d" }}>
          {savedRecipes.length}개
        </span>
      </div>

      {/* 빈 상태 */}
      {savedRecipes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-gray-200">
          <Bookmark className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">저장한 레시피가 없습니다</p>
          <p className="text-gray-400 text-sm mt-1">마음에 드는 레시피를 저장해보세요</p>
        </div>
      )}

      {/* 그리드 */}
      {savedRecipes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {savedRecipes.map((recipe) => {
            const title = recipe.name || "이름 없는 레시피";
            const imageSrc =
              recipe.image && recipe.image.startsWith("http") && !isPlaceholderImage(recipe.image)
                ? recipe.image
                : buildImageFromTitle(title);

            return (
              <div
                key={recipe.id}
                onClick={() => onRecipeClick?.(String(recipe.id))}
                className="bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
              >
                {/* 이미지 */}
                <div className="relative w-full bg-gray-100" style={{ paddingBottom: "68%" }}>
                  <img
                    src={imageSrc}
                    alt={title}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background:"linear-gradient(135deg,#e8f2dd,#d4e5c8)" }}>
                    <Utensils className="w-8 h-8 text-gray-300" />
                  </div>
                  <div className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background:"rgba(0,0,0,0.4)" }}>
                    <Bookmark className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  </div>
                </div>

                {/* 정보 */}
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2 line-clamp-2">{title}</h3>
                  <div className="flex items-center gap-1.5">
                    <ChefHat className="w-3.5 h-3.5 text-[#465940]" />
                    <span className="text-xs text-gray-400">
                      {recipe.category || "저장된 레시피"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
