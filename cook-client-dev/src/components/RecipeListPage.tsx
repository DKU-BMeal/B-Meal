import { useEffect, useRef, useState, useCallback } from "react";
import { getPublicRecipes } from "../utils/api";
import {
  Bookmark, Soup, UtensilsCrossed, CookingPot, Salad,
  Utensils, CakeSlice, Star, Search, ChevronDown,
  ChevronLeft, ChevronRight,
} from "lucide-react";

export interface Recipe {
  id: string;
  recipe_id?: string;
  name: string;
  category: string | null;
  cooking_method: string | null;
  hashtags: string | null;
  ingredients_count: number;
  ingredients_details?: string | null;
  image?: string;
}

interface Props {
  initialCategory?: string;
  savedRecipes: Recipe[];
  onToggleSave: (recipe: Recipe) => void;
  onRecipeClick: (id: string) => void;
}

const CATEGORY_LIST = [
  { name: "전체",    icon: Soup },
  { name: "반찬",    icon: UtensilsCrossed },
  { name: "국&찌개", icon: CookingPot },
  { name: "일품",    icon: Salad },
  { name: "밥",      icon: Utensils },
  { name: "후식",    icon: CakeSlice },
  { name: "기타",    icon: Star },
];

const CAROUSEL_SIZE = 6;  // 추천 섹션에 사용할 레시피 수
const GRID_PAGE = 12;     // 그리드 한 번에 표시할 수

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function RecipeListPage({ savedRecipes, onToggleSave, onRecipeClick, initialCategory = "전체" }: Props) {
  const [carousel, setCarousel]   = useState<Recipe[]>([]);  // 추천 (겹치지 않음)
  const [grid, setGrid]           = useState<Recipe[]>([]);   // 전체 그리드
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [gridOffset, setGridOffset] = useState(0);
  const [hasMore, setHasMore]     = useState(true);

  // 카테고리/검색 변경 시: 추천 따로, 그리드 따로 fetch
  const fetchAll = useCallback(async (cat: string, q: string) => {
    try {
      setLoading(true); setError(null);
      const params = {
        category: cat === "전체" ? undefined : cat,
        search: q || undefined,
      };

      // 추천용 - 충분히 가져와서 셔플
      const carouselRes = await getPublicRecipes({ ...params, limit: 30, offset: 0 });
      const all: Recipe[] = carouselRes.recipes || [];
      const picked = shuffle(all).slice(0, CAROUSEL_SIZE);
      const pickedIds = new Set(picked.map(r => r.id));
      setCarousel(picked);

      // 그리드 - 추천과 겹치지 않게 필터
      const gridRes = await getPublicRecipes({ ...params, limit: GRID_PAGE + CAROUSEL_SIZE, offset: 0 });
      const gridAll: Recipe[] = gridRes.recipes || [];
      const filtered = gridAll.filter(r => !pickedIds.has(r.id)).slice(0, GRID_PAGE);
      setGrid(filtered);
      setGridOffset(GRID_PAGE + CAROUSEL_SIZE);
      setHasMore(filtered.length === GRID_PAGE);
    } catch {
      setError("레시피 목록을 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMore = useCallback(async (cat: string, q: string, off: number, pickedIds: Set<string>) => {
    try {
      setLoadingMore(true);
      const res = await getPublicRecipes({
        category: cat === "전체" ? undefined : cat,
        search: q || undefined,
        limit: GRID_PAGE,
        offset: off,
      });
      const fetched: Recipe[] = (res.recipes || []).filter((r: Recipe) => !pickedIds.has(r.id));
      setGrid(prev => [...prev, ...fetched]);
      setGridOffset(off + GRID_PAGE);
      setHasMore(fetched.length === GRID_PAGE);
    } catch {} finally {
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(selectedCategory, search);
  }, [selectedCategory, search]);

  const handleLoadMore = () => {
    const pickedIds = new Set(carousel.map(r => r.id));
    fetchMore(selectedCategory, search, gridOffset, pickedIds);
  };

  const isSaved = (id: string) => savedRecipes.some((r) => r.id === id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>레시피</h1>
        <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }} style={{ display: "flex" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
            borderRadius: "10px 0 0 10px", background: "#fff",
            border: "1px solid #e5e7eb", borderRight: "none",
          }}>
            <Search style={{ width: 14, height: 14, color: "#9ca3af" }} />
            <input
              type="text" placeholder="레시피 검색..."
              value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              style={{ outline: "none", fontSize: 13, color: "#374151", background: "transparent", width: 180 }}
            />
          </div>
          <button type="submit" style={{
            padding: "8px 16px", borderRadius: "0 10px 10px 0",
            background: "#465940", color: "#fff", border: "none",
            fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}>검색</button>
        </form>
      </div>

      {/* 카테고리 */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {CATEGORY_LIST.map(({ name, icon: Icon }) => {
          const sel = selectedCategory === name;
          return (
            <button key={name} onClick={() => setSelectedCategory(name)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 16px",
              borderRadius: 50, fontSize: 13, fontWeight: 500, cursor: "pointer",
              background: sel ? "linear-gradient(135deg,#465940,#5a7050)" : "#fff",
              color: sel ? "#fff" : "#374151",
              border: sel ? "none" : "1px solid #e5e7eb",
              boxShadow: sel ? "0 2px 8px rgba(70,89,64,0.3)" : "none",
              transition: "all 0.15s",
            }}>
              <Icon style={{ width: 13, height: 13 }} />{name}
            </button>
          );
        })}
      </div>

      {/* 오늘의 추천 */}
      {!loading && carousel.length > 0 && (
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{
              padding: "2px 10px", borderRadius: 50, fontSize: 11, fontWeight: 700,
              background: "linear-gradient(135deg,#465940,#5a7050)", color: "#fff",
            }}>TODAY</span>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>오늘의 추천 레시피</h2>
          </div>
          <SpotlightCarousel
            recipes={carousel}
            isSaved={isSaved}
            onToggleSave={onToggleSave}
            onRecipeClick={onRecipeClick}
          />
        </section>
      )}

      {!loading && carousel.length > 0 && (
        <div style={{ borderTop: "1px solid #f0f0f0" }} />
      )}

      {/* 전체 레시피 그리드 */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 16 }}>
          전체 레시피
          {selectedCategory !== "전체" && (
            <span style={{ fontSize: 13, fontWeight: 400, color: "#6b7280", marginLeft: 8 }}>
              · {selectedCategory}
            </span>
          )}
        </h2>

        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af", fontSize: 14 }}>
            불러오는 중...
          </div>
        )}
        {error && <p style={{ color: "#ef4444", fontSize: 14 }}>{error}</p>}
        {!loading && !error && grid.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af", fontSize: 14 }}>
            해당 조건의 레시피가 없습니다.
          </div>
        )}

        {!loading && grid.length > 0 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              {grid.map((recipe) => (
                <GridCard
                  key={recipe.id} recipe={recipe}
                  saved={isSaved(recipe.id)}
                  onToggleSave={onToggleSave}
                  onRecipeClick={onRecipeClick}
                />
              ))}
            </div>
            {hasMore && (
              <div style={{ textAlign: "center", marginTop: 24 }}>
                <button onClick={handleLoadMore} disabled={loadingMore} style={{
                  padding: "10px 28px", borderRadius: 10, background: "#fff",
                  border: "1px solid #e5e7eb", fontSize: 13, fontWeight: 500,
                  color: "#374151", cursor: loadingMore ? "default" : "pointer",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  opacity: loadingMore ? 0.6 : 1,
                }}>
                  {loadingMore ? "불러오는 중..." : <><ChevronDown style={{ width: 14, height: 14 }} />더 불러오기</>}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

// ─── 캐러셀 ──────────────────────────────────────────────────
const CARD_H = 300;
const GAP    = 14;

function SpotlightCarousel({ recipes, isSaved, onToggleSave, onRecipeClick }: {
  recipes: Recipe[];
  isSaved: (id: string) => boolean;
  onToggleSave: (r: Recipe) => void;
  onRecipeClick: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);
  const [index, setIndex]           = useState(0);
  const [animated, setAnimated]     = useState(true);
  const [descCache, setDescCache]   = useState<Record<string, string | undefined>>({});
  const total = recipes.length;

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setContainerW(containerRef.current.offsetWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // 전체 캐러셀 레시피 설명 일괄 pre-fetch (마운트 시 동시 요청)
  useEffect(() => {
    if (!recipes.length) return;
    recipes.forEach((recipe) => {
      if (recipe.id in descCache) return;
      fetch(`/api/recipes/describe/${recipe.id}`)
        .then(r => r.json())
        .then(data => setDescCache(prev => ({ ...prev, [recipe.id]: data.description || "" })))
        .catch(() => setDescCache(prev => ({ ...prev, [recipe.id]: "" })));
    });
  }, [recipes]);

  const cardW = containerW > 0 ? Math.round(containerW * 0.70) : 600;
  const step  = cardW + GAP;
  const trackOffset = (containerW - cardW) / 2 - index * step;

  const goTo = useCallback((newIdx: number) => {
    const wrapped = (newIdx + total) % total;
    const dist = Math.abs(newIdx - index);
    const isWrap = dist > total / 2;
    if (isWrap) {
      setAnimated(false);
      setIndex(wrapped);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimated(true)));
    } else {
      setAnimated(true);
      setIndex(wrapped);
    }
  }, [index, total]);

  useEffect(() => {
    const t = setInterval(() => goTo(index + 1), 8000);
    return () => clearInterval(t);
  }, [index, goTo]);

  return (
    <div style={{ userSelect: "none" }}>
      <div
        ref={containerRef}
        style={{ overflow: "hidden", borderRadius: 16, position: "relative", height: CARD_H }}
      >
        {/* 트랙 */}
        <div style={{
          display: "flex", gap: GAP,
          transform: `translateX(${trackOffset}px)`,
          transition: animated ? "transform 0.5s cubic-bezier(0.4,0,0.2,1)" : "none",
          height: "100%",
        }}>
          {recipes.map((recipe, i) => {
            const dist    = Math.min(Math.abs(i - index), total - Math.abs(i - index));
            const isActive = dist === 0;
            const opacity = isActive ? 1 : dist === 1 ? 0.5 : 0.25;
            const desc = descCache[recipe.id];

            return (
              <div
                key={recipe.id}
                onClick={() => isActive ? onRecipeClick(recipe.id) : goTo(i)}
                style={{
                  flex: `0 0 ${cardW}px`,
                  borderRadius: 14,
                  overflow: "hidden",
                  position: "relative",
                  opacity,
                  cursor: "pointer",
                  transition: "opacity 0.5s ease",
                  boxShadow: isActive ? "0 8px 28px rgba(0,0,0,0.22)" : "none",
                  display: "flex",
                  background: "#1a2e1c",
                }}
              >
                {/* 왼쪽: 이미지 (50%) */}
                <div style={{ flex: "0 0 50%", position: "relative", overflow: "hidden" }}>
                  {recipe.image ? (
                    <img
                      src={recipe.image} alt={recipe.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#253d27,#3a5c3d)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Utensils style={{ width: 44, height: 44, color: "#4a6b44" }} />
                    </div>
                  )}
                </div>

                {/* 오른쪽: 설명 패널 (50%) */}
                <div style={{
                  flex: "0 0 50%", padding: "26px 28px",
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                  background: "#1a2e1c",
                }}>
                  <div>
                    {/* 카테고리 배지 */}
                    <span style={{
                      display: "inline-block", padding: "3px 11px", borderRadius: 50,
                      fontSize: 11, fontWeight: 600,
                      background: "rgba(70,89,64,0.9)", color: "#c8e6c4", marginBottom: 12,
                    }}>
                      {recipe.category || "기타"}{recipe.cooking_method ? ` · ${recipe.cooking_method}` : ""}
                    </span>

                    {/* 요리 이름 */}
                    <p style={{
                      fontSize: 17, fontWeight: 700, color: "#ffffff",
                      lineHeight: 1.35, marginBottom: 12,
                      display: "-webkit-box", WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {recipe.name}
                    </p>

                    {/* 설명 - 문장별 줄바꿈 */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, overflow: "hidden", maxHeight: 110 }}>
                      {(desc || "").split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 3).map((sentence, si) => (
                        <p key={si} style={{
                          fontSize: 12.5, color: "#c8dfc4", lineHeight: 1.6, margin: 0,
                          paddingLeft: 10, borderLeft: "2px solid rgba(150,200,140,0.35)",
                        }}>
                          {sentence}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* 하단: 재료 수 + 북마크 */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <span style={{ fontSize: 12, color: "#6b9468", fontWeight: 500 }}>
                      재료 {recipe.ingredients_count}개
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleSave(recipe); }}
                      style={{
                        width: 34, height: 34, borderRadius: "50%",
                        background: isSaved(recipe.id) ? "#465940" : "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                      }}
                    >
                      <Bookmark style={{ width: 14, height: 14 }}
                        fill={isSaved(recipe.id) ? "#fff" : "none"} stroke={isSaved(recipe.id) ? "#fff" : "#a5c9a0"} />
                    </button>
                  </div>
                </div>

                {/* 비활성 오버레이 */}
                {!isActive && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.32)", borderRadius: 14 }} />
                )}
              </div>
            );
          })}
        </div>

        {/* 화살표 */}
        <button onClick={() => goTo(index - 1)} style={{
          position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
          width: 34, height: 34, borderRadius: "50%", zIndex: 10,
          background: "rgba(255,255,255,0.88)", border: "none",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}>
          <ChevronLeft style={{ width: 16, height: 16, color: "#374151" }} />
        </button>
        <button onClick={() => goTo(index + 1)} style={{
          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
          width: 34, height: 34, borderRadius: "50%", zIndex: 10,
          background: "rgba(255,255,255,0.88)", border: "none",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}>
          <ChevronRight style={{ width: 16, height: 16, color: "#374151" }} />
        </button>
      </div>

      {/* 도트 */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12 }}>
        {recipes.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} style={{
            width: i === index ? 22 : 6, height: 6, borderRadius: 3,
            border: "none", cursor: "pointer",
            background: i === index ? "#465940" : "#d1d5db",
            transition: "all 0.25s",
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── 그리드 카드 ─────────────────────────────────────────────
function GridCard({ recipe, saved, onToggleSave, onRecipeClick }: {
  recipe: Recipe; saved: boolean;
  onToggleSave: (r: Recipe) => void; onRecipeClick: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => onRecipeClick(recipe.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 12, overflow: "hidden", cursor: "pointer",
        background: "#fff", border: "1px solid #f0f0f0",
        boxShadow: hovered ? "0 5px 18px rgba(0,0,0,0.1)" : "0 1px 4px rgba(0,0,0,0.05)",
        transform: hovered ? "translateY(-3px)" : "none",
        transition: "box-shadow 0.2s, transform 0.2s",
      }}
    >
      <div style={{ position: "relative", width: "100%", paddingBottom: "65%", overflow: "hidden" }}>
        {recipe.image ? (
          <img src={recipe.image} alt={recipe.name} style={{
            position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
            transform: hovered ? "scale(1.05)" : "scale(1)", transition: "transform 0.3s",
          }} />
        ) : (
          <div style={{
            position: "absolute", inset: 0, background: "linear-gradient(135deg,#e8f2dd,#d4e5c8)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Utensils style={{ width: 26, height: 26, color: "#a3b899" }} />
          </div>
        )}
        <button onClick={(e) => { e.stopPropagation(); onToggleSave(recipe); }} style={{
          position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%",
          background: saved ? "rgba(70,89,64,0.85)" : "rgba(0,0,0,0.35)",
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", opacity: hovered || saved ? 1 : 0, transition: "opacity 0.2s",
        }}>
          <Bookmark style={{ width: 12, height: 12 }} fill={saved ? "#fff" : "none"} stroke="#fff" />
        </button>
      </div>
      <div style={{ padding: "11px 13px 13px" }}>
        <p style={{
          fontSize: 13, fontWeight: 600, color: "#111827", lineHeight: 1.45, marginBottom: 7,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          overflow: "hidden", minHeight: 37,
        }}>{recipe.name}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 50, background: "#e8f2dd", color: "#3a5c3d", fontWeight: 500 }}>
            {recipe.category || "기타"}
          </span>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>재료 {recipe.ingredients_count}개</span>
        </div>
      </div>
    </div>
  );
}
