import { useEffect, useState } from "react";
import {
  Mic, Users, UserCircle, Sparkles,
  CookingPot, Soup, UtensilsCrossed, CakeSlice, Star, Utensils, Salad,
  ChevronRight, BookOpen,
} from "lucide-react";
import { UserProfile } from "./ProfileSetup";
import { getPublicRecipes } from "../utils/api";

interface HomePageProps {
  onGetStarted: () => void;
  onVoiceAssistant: () => void;
  onLogout?: () => void;
  userName?: string;
  onCommunityClick?: () => void;
  userProfile?: UserProfile | null;
  onCategoryClick?: (category: string) => void;
  onIngredientsClick?: () => void;
  onRecipeClick?: (id: string) => void;
}

interface Recipe {
  id: string;
  name: string;
  category: string | null;
  cooking_method: string | null;
  hashtags: string | null;
  ingredients_count: number;
  image?: string;
}

const categories = [
  { icon: Soup,            name: "전체" },
  { icon: CookingPot,      name: "국&찌개" },
  { icon: UtensilsCrossed, name: "반찬" },
  { icon: Utensils,        name: "밥" },
  { icon: Salad,           name: "일품" },
  { icon: CakeSlice,       name: "후식" },
  { icon: Star,            name: "기타" },
];

export function HomePage({
  onGetStarted, onVoiceAssistant, userName,
  onCommunityClick, userProfile, onCategoryClick, onIngredientsClick,
  onRecipeClick,
}: HomePageProps) {
  const hasProfile = userProfile && (
    userProfile.preferredCuisines.length > 0 || userProfile.availableTools.length > 0
  );

  const [selectedCategory, setSelectedCategory] = useState<string>("전체");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await getPublicRecipes({
          category: selectedCategory === "전체" ? undefined : selectedCategory,
          limit: 4, offset: 0,
        });
        if (!cancelled) setRecipes(res.recipes || []);
      } catch {
        if (!cancelled) setRecipes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [selectedCategory]);

  const handleCategoryClick = (name: string) => {
    setSelectedCategory(name);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

      {/* 히어로 배너 */}
      <div style={{
        borderRadius: "16px", overflow: "hidden",
        background: "linear-gradient(135deg, #1c2b1e 0%, #2d4a30 55%, #3a5c3d 100%)",
        padding: "48px", position: "relative", minHeight: "240px",
        display: "flex", alignItems: "center",
      }}>
        <div style={{ position: "absolute", right: "-40px", top: "-40px", width: "300px", height: "300px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: "80px", bottom: "-60px", width: "200px", height: "200px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, flex: 1 }}>
          <p style={{ color: "#86efac", fontSize: "13px", fontWeight: 500, marginBottom: "12px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            CookingMate
          </p>
          <h1 style={{ color: "#ffffff", fontSize: "32px", fontWeight: 700, lineHeight: 1.3, marginBottom: "10px" }}>
            {userName ? `${userName}님, 안녕하세요!` : "안녕하세요!"}
          </h1>
          <p style={{ color: "#bbf7d0", fontSize: "16px", marginBottom: "28px", opacity: 0.9 }}>
            오늘은 어떤 요리를 해볼까요?
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={onVoiceAssistant}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "10px 20px", borderRadius: "10px",
                background: "rgba(255,255,255,0.18)", color: "#fff",
                border: "1px solid rgba(255,255,255,0.3)",
                fontSize: "14px", fontWeight: 600, cursor: "pointer",
              }}
            >
              <Mic style={{ width: 16, height: 16 }} /> AI 요리 시작
            </button>
            <button
              onClick={() => onCategoryClick?.("전체")}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "10px 20px", borderRadius: "10px",
                background: "transparent", color: "rgba(255,255,255,0.75)",
                border: "1px solid rgba(255,255,255,0.2)",
                fontSize: "14px", fontWeight: 500, cursor: "pointer",
              }}
            >
              레시피 보기 <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      </div>

      {/* 빠른 메뉴 */}
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", marginBottom: "16px" }}>빠른 메뉴</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          {[
            {
              icon: <Mic style={{ width: 24, height: 24, color: "#fff" }} />,
              label: "AI 음성 요리", desc: "실시간 요리 가이드",
              onClick: onVoiceAssistant, accent: true,
            },
            {
              icon: <BookOpen style={{ width: 24, height: 24, color: "#465940" }} />,
              label: "레시피 탐색", desc: "1,000여 가지 레시피",
              onClick: () => onCategoryClick?.("전체"), accent: false,
            },
            {
              icon: <Sparkles style={{ width: 24, height: 24, color: "#465940" }} />,
              label: "냉장고 관리", desc: "식재료 유통기한 체크",
              onClick: onIngredientsClick, accent: false,
            },
            {
              icon: hasProfile
                ? <Users style={{ width: 24, height: 24, color: "#465940" }} />
                : <UserCircle style={{ width: 24, height: 24, color: "#d97706" }} />,
              label: hasProfile ? "커뮤니티" : "프로필 설정",
              desc: hasProfile ? "요리 후기 공유" : "맞춤 레시피 받기",
              onClick: hasProfile ? onCommunityClick : onGetStarted,
              accent: false, highlight: !hasProfile,
            },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              style={{
                display: "flex", alignItems: "center", gap: "16px",
                padding: "20px", borderRadius: "12px", textAlign: "left",
                cursor: "pointer", transition: "all 0.15s",
                background: item.accent
                  ? "linear-gradient(135deg, #465940, #5a7050)"
                  : "#ffffff",
                border: (item as any).highlight ? "2px solid #fde68a" : item.accent ? "none" : "1px solid #e5e7eb",
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: item.accent ? "rgba(255,255,255,0.18)" : "linear-gradient(135deg,#e8f2dd,#d4e5c8)",
              }}>
                {item.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "14px", fontWeight: 600, color: item.accent ? "#fff" : "#111827", marginBottom: 4 }}>
                  {item.label}
                </p>
                <p style={{ fontSize: "12px", color: item.accent ? "rgba(255,255,255,0.7)" : (item as any).highlight ? "#d97706" : "#6b7280" }}>
                  {item.desc}
                </p>
              </div>
              <ChevronRight style={{ width: 16, height: 16, color: item.accent ? "rgba(255,255,255,0.5)" : "#d1d5db", flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>

      {/* 카테고리 */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827" }}>카테고리별 레시피</h2>
          <button
            onClick={() => onCategoryClick?.("전체")}
            style={{ fontSize: "13px", color: "#465940", fontWeight: 500, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", background: "none", border: "none" }}
          >
            전체보기 <ChevronRight style={{ width: 14, height: 14 }} />
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.name;
            return (
              <button
                key={idx}
                onClick={() => handleCategoryClick(cat.name)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "10px 18px", borderRadius: "50px",
                  background: isActive ? "linear-gradient(135deg,#465940,#5a7050)" : "#ffffff",
                  border: isActive ? "none" : "1px solid #e5e7eb",
                  fontSize: "13px", fontWeight: 500,
                  color: isActive ? "#fff" : "#374151",
                  cursor: "pointer",
                  boxShadow: isActive ? "0 2px 8px rgba(70,89,64,0.3)" : "none",
                  transition: "all 0.15s",
                }}
              >
                <Icon style={{ width: 15, height: 15, color: isActive ? "#fff" : "#465940" }} />
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* 미리보기 레시피 */}
        <div style={{ marginTop: "20px" }}>
          {loading ? (
            <div style={{ padding: "24px 0", color: "#9ca3af", fontSize: 13 }}>불러오는 중...</div>
          ) : recipes.length === 0 ? (
            <div style={{ padding: "24px 0", color: "#9ca3af", fontSize: 13 }}>해당 카테고리의 레시피가 없습니다.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              {recipes.slice(0, 4).map((recipe) => (
                <div
                  key={recipe.id}
                  onClick={() => onRecipeClick?.(recipe.id)}
                  style={{
                    background: "#fff", borderRadius: 12,
                    border: "1px solid #f3f4f6", overflow: "hidden",
                    cursor: "pointer", transition: "box-shadow 0.15s, transform 0.15s",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 14px rgba(0,0,0,0.09)";
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                    (e.currentTarget as HTMLDivElement).style.transform = "none";
                  }}
                >
                  <div style={{ position: "relative", width: "100%", paddingBottom: "60%", background: "#f3f4f6", overflow: "hidden" }}>
                    {recipe.image ? (
                      <img
                        src={recipe.image} alt={recipe.name}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#e8f2dd,#d4e5c8)" }}>
                        <Utensils style={{ width: 24, height: 24, color: "#9ca3af" }} />
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <p style={{
                      fontSize: 13, fontWeight: 600, color: "#111827", lineHeight: 1.4,
                      marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {recipe.name}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 50, background: "#e8f2dd", color: "#3a5c3d", fontWeight: 500 }}>
                        {recipe.category || "기타"}
                      </span>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>재료 {recipe.ingredients_count}개</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => onCategoryClick?.(selectedCategory)}
            style={{
              marginTop: 14, width: "100%", padding: "10px",
              borderRadius: 8, border: "1px solid #e5e7eb",
              background: "#fff", fontSize: 13, color: "#465940",
              fontWeight: 500, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", gap: 4,
            }}
          >
            {selectedCategory === "전체" ? "전체" : selectedCategory} 레시피 더 보기
            <ChevronRight style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

    </div>
  );
}
