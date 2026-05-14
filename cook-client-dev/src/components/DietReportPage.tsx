import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { ChefHat, RefreshCw, Utensils, BarChart3, User } from "lucide-react";

interface DailyData {
  date: string;
  energy: number;
  carb: number;
  protein: number;
  fat: number;
  sodium: number;
  count: number;
}

interface CategoryData { name: string; count: number; }

interface RecentRecipe { name: string; category: string; energy: number; }

interface StatsData {
  daily: DailyData[];
  categories: CategoryData[];
  avg: Record<string, number>;
  totalCooks: number;       // 선택 기간
  totalCooksAll: number;    // 누적 전체
  totalEnergyAll: number;   // 누적 총 칼로리
  period: number;
  recentRecipes: RecentRecipe[];
  prevAvgEnergy: number | null;
}

interface RecipeRec {
  id: number;
  name: string;
  category: string;
  info_energy: string;
  image_small: string | null;
}

interface RecsData {
  hasProfile: boolean;
  recommendations: RecipeRec[];
  context?: {
    isHighBloodPressure: boolean;
    isDiabetes: boolean;
    isVeganOrVeg: boolean;
    allergies: string[];
  };
}

const fmt = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

export function DietReportPage({
  onStartCooking,
  onMyPageClick,
}: {
  onStartCooking?: () => void;
  onMyPageClick?: () => void;
}) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [stats, setStats] = useState<StatsData | null>(null);
  const [recs, setRecs]   = useState<RecsData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => { load(); }, [period]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem("cooking_assistant_auth_token");
      const h: Record<string, string> = { "Content-Type": "application/json" };
      if (token) h["Authorization"] = `Bearer ${token}`;

      const [statsRes, recsRes] = await Promise.all([
        fetch(`/api/diet-report/stats?period=${period}`, { headers: h }),
        fetch("/api/diet-report/recommendations",        { headers: h }),
      ]);

      if (!statsRes.ok) throw new Error((await statsRes.json().catch(() => ({}))).message || "조회 실패");
      const statsData: StatsData = await statsRes.json();
      if (!Array.isArray(statsData.daily)) throw new Error("잘못된 데이터");
      setStats(statsData);

      const recsData: RecsData = recsRes.ok ? await recsRes.json() : { hasProfile: false, recommendations: [] };
      setRecs(recsData);
    } catch (e: any) {
      setError(e.message ?? "데이터를 불러오지 못했어요");
    } finally {
      setLoading(false);
    }
  };

  const totalCooks      = stats?.totalCooks    ?? 0;
  const totalCooksAll   = stats?.totalCooksAll ?? 0;
  const totalEnergyPeriod = stats?.daily.reduce((s, d) => s + d.energy, 0) ?? 0;
  const avgEnergy       = stats?.avg?.energy   ?? 0;
  const prevAvg       = stats?.prevAvgEnergy ?? null;
  const trendPct      = prevAvg && prevAvg > 0
    ? Math.round(((avgEnergy - prevAvg) / prevAvg) * 100)
    : null;
  const topCategory   = stats?.categories?.[0]?.name ?? null;

  // ── 공통 헤더 ──
  const header = (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: "-0.5px" }}>식생활 리포트</h1>
        <p style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>나만의 요리 기록을 한눈에 확인해요</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 10, padding: 3, gap: 2 }}>
          {(["week", "month"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "none",
                cursor: "pointer", background: period === p ? "#fff" : "transparent",
                color: period === p ? "#465940" : "#6b7280",
                boxShadow: period === p ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s" }}>
              {p === "week" ? "7일" : "30일"}
            </button>
          ))}
        </div>
        <button onClick={load}
          style={{ width: 34, height: 34, borderRadius: 9, background: "#f3f4f6", border: "none",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <RefreshCw style={{ width: 14, height: 14, color: "#6b7280" }} />
        </button>
      </div>
    </div>
  );

  // ── 누적 통계 배너 ──
  const cumulativeBanner = (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", borderRadius: 14,
        border: "1px solid #bbf7d0", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "#e8f2dd",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ChefHat style={{ width: 18, height: 18, color: "#465940" }} />
        </div>
        <div>
          <p style={{ fontSize: 11, color: "#4a7c52", fontWeight: 500, marginBottom: 2 }}>지금까지 총 요리 횟수</p>
          <p style={{ fontSize: 19, fontWeight: 800, color: "#1a3d1c" }}>{totalCooksAll}가지 🍳</p>
        </div>
      </div>
      <div style={{ background: "linear-gradient(135deg,#fffbeb,#fef3c7)", borderRadius: 14,
        border: "1px solid #fde68a", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fef9c3",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <BarChart3 style={{ width: 18, height: 18, color: "#d97706" }} />
        </div>
        <div>
          <p style={{ fontSize: 11, color: "#92400e", fontWeight: 500, marginBottom: 2 }}>
            이번 {period === "week" ? "7일" : "30일"} 총 섭취 칼로리
          </p>
          <p style={{ fontSize: 19, fontWeight: 800, color: "#78350f" }}>
            {totalEnergyPeriod > 0 ? `${totalEnergyPeriod.toLocaleString()} kcal` : "기록 없음"}
          </p>
        </div>
      </div>
    </div>
  );

  // ── 추천 섹션 ──
  const recommendationsSection = recs && (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f3f4f6", padding: 20, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>맞춤 레시피 추천</p>
        {recs.context && (
          <div style={{ display: "flex", gap: 4 }}>
            {recs.context.isHighBloodPressure && (
              <span style={{ padding: "2px 8px", borderRadius: 50, fontSize: 11, background: "#fee2e2", color: "#dc2626", fontWeight: 600 }}>고혈압</span>
            )}
            {recs.context.isDiabetes && (
              <span style={{ padding: "2px 8px", borderRadius: 50, fontSize: 11, background: "#fef3c7", color: "#d97706", fontWeight: 600 }}>당뇨</span>
            )}
            {recs.context.isVeganOrVeg && (
              <span style={{ padding: "2px 8px", borderRadius: 50, fontSize: 11, background: "#d1fae5", color: "#059669", fontWeight: 600 }}>채식</span>
            )}
          </div>
        )}
      </div>

      {!recs.hasProfile ? (
        <div style={{ textAlign: "center", padding: "28px 0" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#f3f4f6",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <User style={{ width: 22, height: 22, color: "#9ca3af" }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
            마이페이지에서 프로필을 설정하면
          </p>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
            나에게 맞는 맞춤 식단을 추천해드려요
          </p>
          <button onClick={onMyPageClick}
            style={{ padding: "8px 20px", borderRadius: 10, background: "#465940", color: "#fff",
              border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            마이페이지로 이동
          </button>
        </div>
      ) : recs.recommendations.length === 0 ? (
        <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "20px 0" }}>
          조건에 맞는 추천 레시피를 찾지 못했어요
        </p>
      ) : (
        <>
          {recs.context && (() => {
            const ctx = recs.context!;
            const reasons: string[] = [];
            if (ctx.isHighBloodPressure) reasons.push("고혈압 관리를 위해 나트륨이 낮아서 추천드려요!");
            if (ctx.isDiabetes)          reasons.push("당뇨 관리를 위해 탄수화물이 적어서 추천드려요!");
            if (ctx.isVeganOrVeg)        reasons.push("채식 식단에 맞는 요리라서 추천드려요!");
            if (ctx.allergies?.length)   reasons.push(`알레르기 재료(${ctx.allergies.join(", ")})를 제외해서 추천드려요!`);
            return reasons.length > 0 ? (
              <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 4 }}>
                {reasons.map((r, i) => (
                  <p key={i} style={{ fontSize: 13, color: "#4a7c52", fontWeight: 500 }}>
                    - {r}
                  </p>
                ))}
              </div>
            ) : null;
          })()}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {recs.recommendations.map((r) => (
              <div key={r.id} style={{ borderRadius: 12, border: "1px solid #f3f4f6", overflow: "hidden", background: "#fafafa" }}>
                {r.image_small && (
                  <div style={{ position: "relative", paddingBottom: "60%", overflow: "hidden" }}>
                    <img src={r.image_small} alt={r.name}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
                <div style={{ padding: "10px 12px" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 2 }}>{r.name}</p>
                  <p style={{ fontSize: 11, color: "#9ca3af" }}>{r.category}</p>
                  {r.info_energy && <p style={{ fontSize: 12, color: "#465940", fontWeight: 600, marginTop: 4 }}>{r.info_energy} kcal</p>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  // ── 로딩 ──
  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {header}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {[1,2,3,4].map((i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 16, border: "1px solid #f3f4f6", padding: 24, height: 160 }}>
            <div style={{ height: 12, width: 100, background: "#f3f4f6", borderRadius: 6, marginBottom: 12 }} />
            <div style={{ height: 90, background: "#f9fafb", borderRadius: 10 }} />
          </div>
        ))}
      </div>
    </div>
  );

  // ── 에러 ──
  if (error) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {header}
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 6 }}>데이터를 불러오지 못했어요</p>
        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>{error}</p>
        <button onClick={load}
          style={{ padding: "8px 20px", borderRadius: 10, background: "#465940", color: "#fff",
            border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          다시 시도
        </button>
      </div>
    </div>
  );

  // ── 완전 빈 상태 (누적도 0) ──
  if (totalCooksAll === 0) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {header}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", textAlign: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: "#e8f2dd",
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <ChefHat style={{ width: 36, height: 36, color: "#465940" }} />
        </div>
        <p style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>아직 완료한 요리가 없어요</p>
        <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, marginBottom: 28 }}>
          요리를 완료하면 나만의 식생활 리포트를<br />볼 수 있어요!
        </p>
        <button onClick={onStartCooking}
          style={{ padding: "12px 28px", borderRadius: 12,
            background: "linear-gradient(135deg,#465940,#5a7050)", color: "#fff",
            border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8 }}>
          <Utensils style={{ width: 16, height: 16 }} /> 요리 시작하기
        </button>
      </div>
      {recommendationsSection}
    </div>
  );

  // ── 기간 내 0개지만 누적 있음 ──
  if (totalCooks === 0) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {header}
      {cumulativeBanner}
      <div style={{ background: "#f9fafb", borderRadius: 14, border: "1px solid #f3f4f6",
        padding: "24px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
        선택한 기간에 요리 기록이 없어요 🍽️
      </div>
      {recommendationsSection}
    </div>
  );

  // ── 미니멀 (기간 내 1~4개) ──
  if (totalCooks < 5) {
    const totalEnergy = stats!.recentRecipes.reduce((s, r) => s + r.energy, 0);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {header}
        {cumulativeBanner}
        <div style={{ background: "linear-gradient(135deg,#f0fdf4,#e8f5e9)", borderRadius: 16,
          border: "1px solid #bbf7d0", padding: "18px 22px" }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#1a3d1c", lineHeight: 1.6 }}>
            이번 기간 {totalCooks}가지 요리를 완료했어요!
            {topCategory ? ` 주로 ${topCategory} 카테고리를 즐기시네요 🍽️` : " 멋져요 🎉"}
          </p>
          <p style={{ fontSize: 13, color: "#4a7c52", marginTop: 4 }}>
            {5 - totalCooks}가지 요리를 더 완료하면 자세한 패턴 분석을 볼 수 있어요
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>
          {stats!.recentRecipes.map((r, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 14, border: "1px solid #f3f4f6",
              padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 4 }}>{r.name}</p>
              <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: r.energy > 0 ? 8 : 0 }}>{r.category}</p>
              {r.energy > 0 && <p style={{ fontSize: 13, fontWeight: 600, color: "#465940" }}>{r.energy} kcal</p>}
            </div>
          ))}
        </div>
        {totalEnergy > 0 && (
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f3f4f6",
            padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, color: "#374151", fontWeight: 600 }}>이번 기간 총 칼로리</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: "#465940" }}>{totalEnergy.toLocaleString()} kcal</span>
          </div>
        )}
        {recommendationsSection}
      </div>
    );
  }

  // ── 본격 분석 (기간 내 5개+) ──
  const trendWarning = trendPct !== null && Math.abs(trendPct) >= 50
    ? (trendPct > 0
        ? `지난 기간보다 칼로리가 ${trendPct}% 늘었어요. 식사 패턴이 조금 불규칙해요 🌿`
        : `지난 기간보다 칼로리가 ${Math.abs(trendPct)}% 줄었어요. 식사 패턴이 조금 불규칙해요 🌿`)
    : null;

  const nutrientMax: Record<string, number> = {
    energy:  Math.max(...stats!.daily.map(d => d.energy),  1),
    carb:    Math.max(...stats!.daily.map(d => d.carb),    1),
    protein: Math.max(...stats!.daily.map(d => d.protein), 1),
    fat:     Math.max(...stats!.daily.map(d => d.fat),     1),
  };

  const summaryCards = [
    { label: "이번 기간 요리",    value: `${totalCooks}가지`,     color: "#465940", bg: "#e8f2dd" },
    { label: "하루 평균 칼로리",  value: `${avgEnergy} kcal`,     color: "#d97706", bg: "#fef3c7" },
    { label: "자주 만든 카테고리", value: topCategory ?? "—",      color: "#7c3aed", bg: "#f5f3ff" },
    trendPct !== null
      ? { label: "지난 기간 대비", value: trendPct > 0 ? `+${trendPct}%` : `${trendPct}%`, color: "#3b82f6", bg: "#eff6ff" }
      : { label: "기록 기간",     value: period === "week" ? "7일" : "30일",                color: "#3b82f6", bg: "#eff6ff" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {header}
      {cumulativeBanner}

      {/* 칼로리 트렌드 경고만 */}
      {trendWarning && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "#fefce8",
          border: "1px solid #fde047", fontSize: 13, color: "#92400e", fontWeight: 500 }}>
          {trendWarning}
        </div>
      )}

      {/* 요약 카드 4개 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {summaryCards.map((card) => (
          <div key={card.label} style={{ background: "#fff", borderRadius: 14, border: "1px solid #f3f4f6",
            padding: "16px 18px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: card.bg,
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <BarChart3 style={{ width: 16, height: 16, color: card.color }} />
            </div>
            <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, marginBottom: 4 }}>{card.label}</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* 2열 차트 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* 일별 칼로리 */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f3f4f6", padding: 20, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 4 }}>일별 칼로리</p>
          <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>하루 기록된 칼로리 합계</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats!.daily} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tickFormatter={fmt} style={{ fontSize: 11 }} tick={{ fill: "#9ca3af" }} />
              <YAxis style={{ fontSize: 11 }} tick={{ fill: "#9ca3af" }} />
              <Tooltip
                formatter={(v: number) => [`${v} kcal`, "칼로리"]}
                labelFormatter={fmt}
                contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
              />
              <Bar dataKey="energy" radius={[4,4,0,0]}>
                {stats!.daily.map((entry, i) => (
                  <Cell key={i} fill={entry.energy > 0 ? "#465940" : "#e5e7eb"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 카테고리 분포 */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f3f4f6", padding: 20, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 4 }}>자주 만든 카테고리</p>
          <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>요리 횟수 기준</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {stats!.categories.slice(0, 5).map((cat, i) => {
              const pct = Math.round((cat.count / totalCooks) * 100);
              const colors = ["#465940","#5a7a4e","#6b8f5e","#86a878","#a8c49a"];
              return (
                <div key={cat.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{cat.name}</span>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>{cat.count}회 ({pct}%)</span>
                  </div>
                  <div style={{ height: 7, background: "#f3f4f6", borderRadius: 50 }}>
                    <div style={{ height: "100%", borderRadius: 50, background: colors[i] || "#9ca3af", width: `${pct}%`, transition: "width 0.5s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 내 평균 영양소 */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f3f4f6", padding: 20, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 4 }}>내 평균 영양소</p>
          <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>기록된 하루 평균 섭취량</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { key: "energy",  label: "칼로리",  unit: "kcal", color: "#f59e0b" },
              { key: "carb",    label: "탄수화물", unit: "g",    color: "#3b82f6" },
              { key: "protein", label: "단백질",   unit: "g",    color: "#10b981" },
              { key: "fat",     label: "지방",     unit: "g",    color: "#f97316" },
            ].map(({ key, label, unit, color }) => {
              const avg = stats!.avg[key] ?? 0;
              const pct = nutrientMax[key] > 0 ? Math.min(Math.round((avg / nutrientMax[key]) * 100), 100) : 0;
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</span>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>{avg} {unit}</span>
                  </div>
                  <div style={{ height: 7, background: "#f3f4f6", borderRadius: 50, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 50, background: color, width: `${pct}%`, transition: "width 0.5s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 최근 완료 요리 */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f3f4f6", padding: 20, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 4 }}>최근 완료한 요리</p>
          <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>최근 5가지</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stats!.recentRecipes.slice(-5).reverse().map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 10px", borderRadius: 10, background: "#f9fafb" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{r.name}</p>
                  <p style={{ fontSize: 11, color: "#9ca3af" }}>{r.category}</p>
                </div>
                {r.energy > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#465940", flexShrink: 0, marginLeft: 8 }}>
                    {r.energy} kcal
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {recommendationsSection}
    </div>
  );
}
