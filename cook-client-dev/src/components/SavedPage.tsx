import { Bookmark, ChefHat, Trash2, UtensilsCrossed } from "lucide-react";
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

export function SavedPage({ savedRecipes = [], onRecipeClick, onRemoveSaved }: SavedPageProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: "-0.5px" }}>저장한 레시피</h1>
          <p style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>저장된 레시피로 AI 요리 가이드를 시작해보세요</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#e8f2dd", border: "1px solid #c8e0b8", borderRadius: 10, padding: "8px 14px" }}>
          <Bookmark style={{ width: 14, height: 14, fill: "#465940", color: "#465940" }} />
          <span style={{ fontSize: 13, color: "#3a5c3d", fontWeight: 600 }}>{savedRecipes.length}개 저장됨</span>
        </div>
      </div>

      {/* 빈 상태 */}
      {savedRecipes.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", background: "#fff", borderRadius: 18, border: "1px solid #f3f4f6" }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Bookmark style={{ width: 32, height: 32, color: "#d1d5db" }} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#374151" }}>저장한 레시피가 없습니다</p>
          <p style={{ fontSize: 14, color: "#9ca3af", marginTop: 6 }}>커뮤니티에서 마음에 드는 레시피를 저장해보세요</p>
        </div>
      )}

      {/* 그리드 */}
      {savedRecipes.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
          {savedRecipes.map((recipe) => {
            const title = recipe.name || "이름 없는 레시피";
            const hasImage = recipe.image && recipe.image.startsWith("http") && !isPlaceholderImage(recipe.image);

            return (
              <div
                key={recipe.id}
                style={{ background: "#fff", borderRadius: 18, border: "1px solid #f3f4f6", overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", transition: "box-shadow 0.2s, transform 0.2s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 24px rgba(0,0,0,0.10)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 8px rgba(0,0,0,0.04)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
              >
                {/* 이미지 */}
                <div style={{ position: "relative", paddingBottom: "62%", background: "linear-gradient(135deg, #e8f2dd, #d4e5c8)", overflow: "hidden", flexShrink: 0 }}>
                  {hasImage ? (
                    <img
                      src={recipe.image!}
                      alt={title}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ChefHat style={{ width: 40, height: 40, color: "#a7c49a", opacity: 0.7 }} />
                    </div>
                  )}

                  {/* 저장 뱃지 */}
                  <div style={{ position: "absolute", top: 10, right: 10, width: 30, height: 30, borderRadius: "50%", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
                    <Bookmark style={{ width: 14, height: 14, fill: "#facc15", color: "#facc15" }} />
                  </div>

                  {/* 카테고리 */}
                  {recipe.category && (
                    <div style={{ position: "absolute", bottom: 10, left: 10 }}>
                      <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 50, background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: 11, fontWeight: 500, backdropFilter: "blur(4px)" }}>
                        {recipe.category}
                      </span>
                    </div>
                  )}
                </div>

                {/* 내용 */}
                <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {title}
                  </h3>

                  {/* 버튼 그룹 */}
                  <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                    {/* 요리하기 버튼 */}
                    <button
                      onClick={() => onRecipeClick?.(String(recipe.id))}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", borderRadius: 12, background: "linear-gradient(135deg, #465940, #5a7050)", color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", transition: "opacity 0.15s, transform 0.15s", boxShadow: "0 2px 8px rgba(70,89,64,0.25)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; (e.currentTarget as HTMLElement).style.transform = "scale(1.02)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                    >
                      <UtensilsCrossed style={{ width: 14, height: 14 }} />
                      요리하기
                    </button>

                    {/* 삭제 버튼 */}
                    {onRemoveSaved && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemoveSaved(recipe); }}
                        title="저장 해제"
                        style={{ width: 38, height: 38, borderRadius: 12, background: "#fff3f3", color: "#ef4444", border: "1px solid #fee2e2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#fee2e2"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#fff3f3"; }}
                      >
                        <Trash2 style={{ width: 15, height: 15 }} />
                      </button>
                    )}
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
