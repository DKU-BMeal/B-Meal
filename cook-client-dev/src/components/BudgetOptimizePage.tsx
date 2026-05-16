import { useState, useEffect } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { ChefHat, ShoppingCart, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import {
  getIngredients,
  getCompletedRecipes,
  generateMealPlan,
  getWasteTips,
  searchShopProducts,
  type ShopProduct,
} from "../utils/api";

const PURCHASE_SEP = "---구매목록---";

const CATEGORY_AVG_PRICE: Record<string, number> = {
  채소: 2500, 육류: 9000, 수산물: 6000, 유제품: 3500, 기타: 3000,
};

function parsePurchaseItems(mealPlan: string) {
  if (!mealPlan.includes(PURCHASE_SEP)) return [];
  const part = mealPlan.split(PURCHASE_SEP)[1] || "";
  return part
    .split("\n")
    .filter(l => l.trim() && l.includes(":"))
    .map(l => {
      const colonIdx = l.lastIndexOf(":");
      const name = l.slice(0, colonIdx).replace(/^[\s\-•]+/, "").trim();
      const priceStr = l.slice(colonIdx + 1);
      const price = parseInt(priceStr.replace(/[^0-9]/g, ""), 10);
      return { name, price: isNaN(price) ? null : price };
    })
    .filter(item => item.name.length > 0 && item.name.length < 20);
}

export function BudgetOptimizePage() {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [completedRecipes, setCompletedRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [budget, setBudget] = useState(() => localStorage.getItem("budget_input") || "");
  const [mealPlan, setMealPlan] = useState(() => localStorage.getItem("budget_meal_plan") || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFullPlan, setShowFullPlan] = useState(false);
  const [showPurchaseList, setShowPurchaseList] = useState(false);
  const [useFridge, setUseFridge] = useState(true);
  const [useCheap, setUseCheap] = useState(false);
  const [useProtein, setUseProtein] = useState(false);
  const [useSimple, setUseSimple] = useState(false);
  const [useLowCalorie, setUseLowCalorie] = useState(false);
  const [useVegetarian, setUseVegetarian] = useState(false);
  const [servings, setServings] = useState(1);

  const [wasteTips, setWasteTips] = useState<Array<{ title: string; desc: string }>>([]);
  const [isLoadingTips, setIsLoadingTips] = useState(false);

  const [shopQuery, setShopQuery] = useState("");
  const [shopResults, setShopResults] = useState<ShopProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [ingRes, recipes] = await Promise.all([getIngredients(), getCompletedRecipes()]);
        const normalized = (ingRes.ingredients || []).map((ing: any) => ({
          ...ing,
          expiryDate: ing.expiryDate || ing.expiry_date || null,
        }));
        setIngredients(normalized);
        setCompletedRecipes(recipes || []);
        if (normalized.length === 0) setUseFridge(false);

        const expired = normalized.filter((ing: any) => {
          if (!ing.expiryDate) return false;
          return differenceInDays(parseISO(ing.expiryDate), new Date()) < 0;
        });
        const expiring = normalized.filter((ing: any) => {
          if (!ing.expiryDate) return false;
          const d = differenceInDays(parseISO(ing.expiryDate), new Date());
          return d >= 0 && d <= 7;
        });
        if (expired.length > 0 || expiring.length > 0) {
          setIsLoadingTips(true);
          getWasteTips(expired, expiring)
            .then(tips => setWasteTips(tips))
            .catch(() => {})
            .finally(() => setIsLoadingTips(false));
        }
      } catch {
        toast.error("데이터를 불러오지 못했습니다");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const now = new Date();

  const expiredIngredients = ingredients.filter(ing => {
    if (!ing.expiryDate) return false;
    return differenceInDays(parseISO(ing.expiryDate), now) < 0;
  });

  const expiringIngredients = ingredients.filter(ing => {
    if (!ing.expiryDate) return false;
    const d = differenceInDays(parseISO(ing.expiryDate), now);
    return d >= 0 && d <= 7;
  });

  const recipeCounts = completedRecipes.reduce<Record<string, number>>((acc, r) => {
    if (r.name) acc[r.name] = (acc[r.name] || 0) + 1;
    return acc;
  }, {});
  const topRecipeEntry = Object.entries(recipeCounts).sort((a, b) => b[1] - a[1])[0];

  const getCategory = (name: string) => {
    if (/양파|마늘|대파|파|배추|시금치|당근|감자|고추|호박|토마토|오이|버섯|브로콜리/.test(name)) return "채소";
    if (/돼지|닭|소고기|삼겹|다짐|베이컨|햄|불고기/.test(name)) return "육류";
    if (/생선|연어|고등어|새우|오징어|조개|게|참치/.test(name)) return "수산물";
    if (/우유|계란|치즈|버터|요거트|크림/.test(name)) return "유제품";
    return "기타";
  };

  const expiredByCategory: Record<string, any[]> = {};
  expiredIngredients.forEach(ing => {
    const cat = getCategory(ing.name);
    if (!expiredByCategory[cat]) expiredByCategory[cat] = [];
    expiredByCategory[cat].push(ing);
  });

  const estimatedWasteCost = expiredIngredients.reduce((sum, ing) => {
    return sum + (CATEGORY_AVG_PRICE[getCategory(ing.name)] || 3000);
  }, 0);

  const categoryTotals = ingredients.reduce<Record<string, number>>((acc, ing) => {
    const cat = getCategory(ing.name);
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const wastePattern = Object.entries(expiredByCategory).map(([cat, items]) => ({
    cat,
    expired: items.length,
    total: categoryTotals[cat] || items.length,
  })).sort((a, b) => b.expired - a.expired);

  // 구매목록 파싱
  const planBody = (mealPlan.includes(PURCHASE_SEP)
    ? mealPlan.split(PURCHASE_SEP)[0].trimEnd()
    : mealPlan).replace(/\*\*/g, "").replace(/\*/g, "");
  const purchaseItems = parsePurchaseItems(mealPlan);

  const handleGenerateMealPlan = async () => {
    if (!budget.trim()) { toast.error("예산을 입력해주세요"); return; }
    setIsGenerating(true);
    setMealPlan("");
    setShowFullPlan(false);
    setShowPurchaseList(false);
    try {
      const reply = await generateMealPlan(budget, useFridge ? ingredients : [], { useCheap, useProtein, useSimple, useLowCalorie, useVegetarian, servings });
      setMealPlan(reply);
      localStorage.setItem("budget_meal_plan", reply);
      localStorage.setItem("budget_input", budget);
    } catch {
      toast.error("식단 생성에 실패했습니다");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShopSearch = async (q?: string) => {
    const query = q ?? shopQuery;
    if (!query.trim()) { toast.error("검색어를 입력해주세요"); return; }
    if (q !== undefined) setShopQuery(q);
    setIsSearching(true);
    setShopResults([]);
    try {
      const res = await searchShopProducts(query);
      setShopResults(res.items);
      if (res.items.length === 0) toast.error("검색 결과가 없습니다");
    } catch {
      toast.error("가격 검색에 실패했습니다");
    } finally {
      setIsSearching(false);
    }
  };

  const card = { background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e5e7eb" };

  const iconBox = (gradient: string) => ({
    width: 36, height: 36, borderRadius: 10, background: gradient,
    display: "flex", alignItems: "center", justifyContent: "center",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 헤더 */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>식비 최적화</h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>식비를 분석하고 예산에 맞는 식단을 계획하세요</p>
      </div>

      {/* 1. 요약 카드 */}
      {loading ? (
        <div style={{ ...card, padding: 32, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>불러오는 중...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          <div style={{ background: "#f4f8f1", borderRadius: 14, padding: "16px 18px" }}>
            <p style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>집밥 실천 횟수</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: "#465940", lineHeight: 1.2, marginTop: 6 }}>
              {completedRecipes.length}<span style={{ fontSize: 14, fontWeight: 500 }}>회</span>
            </p>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>누적</p>
          </div>
          <div style={{ background: "#f4f8f1", borderRadius: 14, padding: "16px 18px" }}>
            <p style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>보유 식재료</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: "#465940", lineHeight: 1.2, marginTop: 6 }}>
              {ingredients.length}<span style={{ fontSize: 14, fontWeight: 500 }}>개</span>
            </p>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>현재</p>
          </div>
          <div style={{ background: (expiredIngredients.length + expiringIngredients.length) > 0 ? "#fdf2ef" : "#f4f8f1", borderRadius: 14, padding: "16px 18px" }}>
            <p style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>만료/임박 재료</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: (expiredIngredients.length + expiringIngredients.length) > 0 ? "#b85c4a" : "#465940", lineHeight: 1.2, marginTop: 6 }}>
              {expiredIngredients.length + expiringIngredients.length}<span style={{ fontSize: 14, fontWeight: 500 }}>개</span>
            </p>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>주의 필요</p>
          </div>
          <div style={{ background: "#f4f8f1", borderRadius: 14, padding: "16px 18px" }}>
            <p style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>가장 많이 만든 요리</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#465940", lineHeight: 1.4, marginTop: 6, wordBreak: "keep-all" }}>
              {topRecipeEntry ? topRecipeEntry[0] : "아직 없어요"}
            </p>
            {topRecipeEntry && (
              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{topRecipeEntry[1]}회</p>
            )}
          </div>
        </div>
      )}

      {/* 3. 음식물 낭비 분석 */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={iconBox("linear-gradient(135deg,#f5e8e4,#edcfc8)")}>
            <Trash2 style={{ width: 18, height: 18, color: "#b85c4a" }} />
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>음식물 낭비 분석</h2>
        </div>
        {loading ? (
          <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center" }}>불러오는 중...</p>
        ) : (
          <>
            {/* 낭비 비용 추정 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 20 }}>
              <div style={{ padding: "14px 16px", background: expiredIngredients.length > 0 ? "#fdf2ef" : "#f9fafb", borderRadius: 12, border: `1px solid ${expiredIngredients.length > 0 ? "#f5d5cc" : "#e5e7eb"}` }}>
                <p style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>예상 낭비 금액</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: expiredIngredients.length > 0 ? "#b85c4a" : "#374151", lineHeight: 1.2, marginTop: 6 }}>
                  약 {estimatedWasteCost.toLocaleString()}<span style={{ fontSize: 13, fontWeight: 500 }}>원</span>
                </p>
                <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>만료 재료 시세 기준</p>
              </div>
              <div style={{ padding: "14px 16px", background: "#f9fafb", borderRadius: 12, border: "1px solid #e5e7eb" }}>
                <p style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>만료 재료</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: expiredIngredients.length > 0 ? "#b85c4a" : "#374151", lineHeight: 1.2, marginTop: 6 }}>
                  {expiredIngredients.length}<span style={{ fontSize: 13, fontWeight: 500 }}>개</span>
                </p>
                <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>전체 {ingredients.length}개 중</p>
              </div>
            </div>

            {/* 카테고리별 낭비 패턴 */}
            {wastePattern.length > 0 ? (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>카테고리별 낭비 패턴</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {wastePattern.map(({ cat, expired, total }) => {
                    const rate = Math.round((expired / total) * 100);
                    return (
                      <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, color: "#374151", width: 52, flexShrink: 0 }}>{cat}</span>
                        <div style={{ flex: 1, height: 10, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${rate}%`, background: rate >= 50 ? "#b85c4a" : "#e0956e", borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 12, color: "#6b7280", width: 72, textAlign: "right", flexShrink: 0 }}>
                          {expired}/{total}개 ({rate}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* 만료 재료 태그 */}
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  {Object.entries(expiredByCategory).map(([cat, items]) => (
                    <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#fdf2ef", borderRadius: 9, border: "1px solid #f5d5cc" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#b85c4a", width: 52, flexShrink: 0 }}>{cat}</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, flex: 1 }}>
                        {items.map((ing: any, j: number) => (
                          <span key={j} style={{ fontSize: 12, color: "#374151", background: "#fff", border: "1px solid #f5d5cc", borderRadius: 6, padding: "2px 8px" }}>{ing.name}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "12px 0 20px", color: "#6b7280", fontSize: 13 }}>
                현재 만료된 재료가 없어요! 잘 관리하고 계시네요.
              </div>
            )}

            {/* 낭비 줄이는 팁 */}
            {(isLoadingTips || wasteTips.length > 0) && (
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>낭비 줄이는 방법</p>
                {isLoadingTips ? (
                  <p style={{ fontSize: 13, color: "#9ca3af", padding: "8px 0" }}>AI가 맞춤 팁을 생성하고 있어요...</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {wasteTips.map((tip, i) => (
                      <div key={i} style={{ padding: "12px 14px", background: "#f9fafb", borderRadius: 10, borderLeft: "3px solid #c6ddb8" }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{tip.title}</p>
                        <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{tip.desc}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 4. 예산 식단 생성 */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={iconBox("linear-gradient(135deg,#e0ede8,#c2d8ce)")}>
            <ChefHat style={{ width: 18, height: 18, color: "#2d6a55" }} />
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>예산 기반 식단 생성</h2>
        </div>

        {/* 분량 선택 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: "#6b7280", flexShrink: 0 }}>분량</span>
          <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 10, padding: 3, gap: 2 }}>
            {[{ label: "1인", value: 1 }, { label: "2인", value: 2 }, { label: "3~4인", value: 4 }].map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setServings(value)}
                style={{
                  padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: servings === value ? 600 : 400,
                  background: servings === value ? "#fff" : "transparent",
                  color: servings === value ? "#465940" : "#6b7280",
                  border: "none", cursor: "pointer",
                  boxShadow: servings === value ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 옵션 칩 */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {[
              {
                label: "냉장고 재료 우선",
                active: useFridge,
                disabled: ingredients.length === 0,
                toggle: () => {
                  if (ingredients.length === 0) { toast.error("냉장고에 재료가 없어요. 먼저 재료를 추가해주세요."); return; }
                  setUseFridge(v => !v);
                },
              },
              { label: "저렴한 재료 위주", active: useCheap, disabled: false, toggle: () => setUseCheap(v => !v) },
              { label: "단백질 균형", active: useProtein, disabled: false, toggle: () => setUseProtein(v => !v) },
              { label: "간편 조리 위주", active: useSimple, disabled: false, toggle: () => setUseSimple(v => !v) },
              { label: "저칼로리", active: useLowCalorie, disabled: false, toggle: () => setUseLowCalorie(v => !v) },
              { label: "채식 위주", active: useVegetarian, disabled: false, toggle: () => setUseVegetarian(v => !v) },
            ].map(({ label, active, disabled, toggle }) => (
              <button
                key={label}
                onClick={toggle}
                disabled={disabled}
                style={{
                  padding: "6px 13px", borderRadius: 20, fontSize: 12,
                  cursor: disabled ? "not-allowed" : "pointer",
                  fontWeight: active ? 600 : 400,
                  background: disabled ? "#f3f4f6" : active ? "#465940" : "#fff",
                  color: disabled ? "#9ca3af" : active ? "#fff" : "#374151",
                  border: `1.5px solid ${disabled ? "#e5e7eb" : active ? "#465940" : "#d1d5db"}`,
                  opacity: disabled ? 0.6 : 1,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 냉장고 재료 목록 표시 */}
        {useFridge && ingredients.length > 0 && (
          <div style={{ marginBottom: 14, padding: "10px 14px", background: "#f4f8f1", borderRadius: 10, border: "1px solid #d4e5c8" }}>
            <p style={{ fontSize: 12, color: "#465940", fontWeight: 600, marginBottom: 8 }}>
              냉장고 재료 {ingredients.length}개 반영
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ingredients.slice(0, 10).map((ing, i) => (
                <span key={i} style={{ fontSize: 12, color: "#374151", background: "#fff", border: "1px solid #c6ddb8", borderRadius: 8, padding: "2px 9px" }}>
                  {ing.name}
                  {ing.quantity ? ` ${ing.quantity}${ing.unit || ""}` : ""}
                </span>
              ))}
              {ingredients.length > 10 && (
                <span style={{ fontSize: 12, color: "#9ca3af", padding: "2px 0" }}>+{ingredients.length - 10}개</span>
              )}
            </div>
          </div>
        )}

        {/* 예산 입력 */}
        <div style={{ display: "flex", gap: 8, marginBottom: mealPlan ? 16 : 0 }}>
          <input
            value={budget}
            onChange={e => setBudget(e.target.value.replace(/[^0-9]/g, ""))}
            onKeyDown={e => { if (e.key === "Enter") handleGenerateMealPlan(); }}
            placeholder="주간 예산 입력 (예: 50000)"
            style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, outline: "none" }}
          />
          <span style={{ display: "flex", alignItems: "center", fontSize: 14, color: "#374151", fontWeight: 500 }}>원</span>
          <button
            onClick={handleGenerateMealPlan}
            disabled={isGenerating}
            style={{ padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: "#465940", color: "#fff", border: "none", cursor: isGenerating ? "default" : "pointer", opacity: isGenerating ? 0.7 : 1, flexShrink: 0 }}
          >
            {isGenerating ? "생성 중..." : "식단 짜기"}
          </button>
        </div>

        {isGenerating && (
          <p style={{ fontSize: 13, color: "#6b7280", textAlign: "center", padding: "12px 0" }}>AI가 식단을 생성하고 있어요...</p>
        )}

        {/* 식단 결과 */}
        {mealPlan && !isGenerating && (
          <div>
            {/* 요약 카드 */}
            <div style={{ padding: "12px 16px", background: "#f4f8f1", borderRadius: 12, border: "1px solid #c6ddb8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#465940" }}>식단 생성 완료</p>
                <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>예산 {Number(budget).toLocaleString()}원 · 7일 식단</p>
              </div>
              <button
                onClick={() => setShowFullPlan(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "#465940", color: "#fff", border: "none", cursor: "pointer" }}
              >
                {showFullPlan ? "접기" : "자세히 보기"}
                {showFullPlan ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
              </button>
            </div>

            {showFullPlan && (
              <div style={{ marginTop: 10, padding: 16, borderRadius: 12, background: "#f9fafb", border: "1px solid #e5e7eb", fontSize: 13, color: "#374151", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                {planBody}
              </div>
            )}

            {/* 구매 필요 재료 목록 */}
            {purchaseItems.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div
                  onClick={() => setShowPurchaseList(v => !v)}
                  style={{ padding: "12px 16px", background: "#f9fafb", borderRadius: 12, border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                >
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>구매 필요 재료 ({purchaseItems.length}개)</p>
                  {showPurchaseList ? <ChevronUp style={{ width: 15, height: 15, color: "#6b7280" }} /> : <ChevronDown style={{ width: 15, height: 15, color: "#6b7280" }} />}
                </div>
                {showPurchaseList && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                    {purchaseItems.map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: "#f9fafb", borderRadius: 9, border: "1px solid #e5e7eb" }}>
                        <span style={{ fontSize: 13, color: "#374151" }}>{item.name}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {item.price !== null && (
                            <span style={{ fontSize: 12, color: "#6b7280" }}>약 {item.price.toLocaleString()}원</span>
                          )}
                          <button
                            onClick={() => {
                              handleShopSearch(item.name);
                              document.getElementById("shop-section")?.scrollIntoView({ behavior: "smooth" });
                            }}
                            style={{ padding: "3px 10px", borderRadius: 7, fontSize: 12, fontWeight: 500, background: "#465940", color: "#fff", border: "none", cursor: "pointer" }}
                          >
                            마트 확인
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. 마트 가격 비교 */}
      <div id="shop-section" style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={iconBox("linear-gradient(135deg,#e8ede0,#d0d9c4)")}>
            <ShoppingCart style={{ width: 18, height: 18, color: "#4a5e3a" }} />
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>마트 가격 비교</h2>
        </div>

        {expiringIngredients.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>임박 재료 빠른 검색</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {expiringIngredients.slice(0, 5).map((ing, i) => (
                <button
                  key={i}
                  onClick={() => handleShopSearch(ing.name)}
                  style={{ padding: "5px 12px", borderRadius: 16, fontSize: 12, fontWeight: 500, background: "#fff", color: "#374151", border: "1.5px solid #d4e5c8", cursor: "pointer" }}
                >
                  {ing.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: shopResults.length > 0 ? 16 : 0 }}>
          <input
            value={shopQuery}
            onChange={e => setShopQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleShopSearch(); }}
            placeholder="재료명 검색 (예: 양파, 삼겹살)"
            style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, outline: "none" }}
          />
          <button
            onClick={() => handleShopSearch()}
            disabled={isSearching}
            style={{ padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: "#465940", color: "#fff", border: "none", cursor: isSearching ? "default" : "pointer", opacity: isSearching ? 0.7 : 1, flexShrink: 0 }}
          >
            {isSearching ? "검색 중..." : "검색"}
          </button>
        </div>

        {shopResults.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {shopResults.slice(0, 5).map((item, i) => (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: "#f9fafb", border: "1px solid #e5e7eb", textDecoration: "none" }}
              >
                {item.image && (
                  <img src={item.image} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: "#111827", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} dangerouslySetInnerHTML={{ __html: item.title }} />
                  <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{item.mall}</p>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#465940", flexShrink: 0 }}>
                  {item.price}원
                </p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
