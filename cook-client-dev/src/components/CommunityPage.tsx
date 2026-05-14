import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Star, MessageCircle, Trophy, Bookmark, Send, Trash2, TrendingUp, Clock } from "lucide-react";
import { getSavedRecipes, saveRecipe, removeSavedRecipe, getCompletedRecipeById } from "../utils/api";

export interface CommunityReview {
  id: string;
  recipe_id: string;
  recipe_name: string;
  rating: number;
  review: string;
  image_url: string | null;
  user_name: string;
  user_initial: string;
  created_at: string;
  bookmark_count?: number;
  recipe_image?: string | null;
  comment_count?: number;
}

interface Comment {
  id: string;
  review_id: string;
  user_name: string;
  user_initial: string;
  text: string;
  created_at: string;
}

interface RecipeRanking {
  recipeId: string;
  recipeName: string;
  reviewCount: number;
  averageRating: number;
  rank: number;
}

interface CommunityPageProps {
  onGoToSaved?: () => void;
  onRefreshSaved?: () => void;
}

const parseApiDate = (value: string) => {
  if (!value) return new Date(NaN);
  if (/[zZ]|[+\-]\d{2}:\d{2}$/.test(value)) return new Date(value);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value))
    return new Date(value.replace(" ", "T") + "Z");
  return new Date(value);
};

const getTimeAgo = (dateString: string) => {
  const diffSec = Math.floor((Date.now() - parseApiDate(dateString).getTime()) / 1000);
  if (Number.isNaN(diffSec)) return "";
  if (diffSec < 30) return "방금 전";
  if (diffSec < 60) return `${diffSec}초 전`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return "어제";
  if (diffDay < 7) return `${diffDay}일 전`;
  return parseApiDate(dateString).toLocaleDateString("ko-KR");
};

const StarDisplay = ({ rating, size = 14 }: { rating: number; size?: number }) => (
  <div style={{ display: "flex", gap: 2 }}>
    {[1,2,3,4,5].map((i) => (
      <Star key={i} style={{ width: size, height: size, fill: i <= rating ? "#f59e0b" : "#e5e7eb", color: i <= rating ? "#f59e0b" : "#e5e7eb" }} />
    ))}
  </div>
);

export function CommunityPage({ onRefreshSaved }: CommunityPageProps) {
  const [reviews, setReviews] = useState<CommunityReview[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"all" | "popular" | "ranking">("all");
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const currentUser = JSON.parse(sessionStorage.getItem("cooking_assistant_current_user") || "{}");

  useEffect(() => { loadCommunity(); loadSaved(); }, []);

  useEffect(() => {
    const openIds = Object.entries(showComments).filter(([, v]) => v).map(([id]) => id);
    if (!openIds.length) return;
    const iv = setInterval(() => openIds.forEach(loadComments), 5000);
    return () => clearInterval(iv);
  }, [showComments]);

  const loadCommunity = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("cooking_assistant_auth_token");
      const res = await fetch("/api/community", { headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch { setReviews([]); } finally { setLoading(false); }
  };

  const loadComments = async (reviewId: string) => {
    const token = sessionStorage.getItem("cooking_assistant_auth_token");
    const res = await fetch(`/api/community/${reviewId}/comments`, { headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    const data = await res.json();
    setComments((prev) => ({ ...prev, [reviewId]: Array.isArray(data) ? data : [] }));
  };

  const loadSaved = async () => {
    try {
      const list = await getSavedRecipes();
      setSavedRecipeIds(new Set<string>(list.map((r: { recipe_id: string }) => r.recipe_id)));
    } catch {}
  };

  const toggleComments = async (id: string) => {
    setShowComments((prev) => ({ ...prev, [id]: !prev[id] }));
    if (!comments[id]) await loadComments(id);
  };

  const addComment = async (reviewId: string) => {
    const text = commentInput[reviewId];
    if (!text?.trim()) return;
    const token = sessionStorage.getItem("cooking_assistant_auth_token");
    const user = JSON.parse(sessionStorage.getItem("cooking_assistant_current_user") || "{}");
    setComments((prev) => ({ ...prev, [reviewId]: [...(prev[reviewId] || []), { id: "temp-" + Date.now(), review_id: reviewId, user_name: user.name, user_initial: user.name?.slice(0, 1) ?? "?", text, created_at: new Date().toISOString() }] }));
    setCommentInput((prev) => ({ ...prev, [reviewId]: "" }));
    await fetch(`/api/community/${reviewId}/comments`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ text, userName: user.name, userInitial: user.name?.slice(0, 1) ?? "?" }) });
    await loadComments(reviewId);
    setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, comment_count: (r.comment_count ?? 0) + 1 } : r));
  };

  const handleDeleteComment = async (reviewId: string, commentId: string) => {
    if (!confirm("이 댓글을 삭제할까요?")) return;
    const token = sessionStorage.getItem("cooking_assistant_auth_token");
    await fetch(`/api/community/${reviewId}/comments/${commentId}`, { method: "DELETE", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    await loadComments(reviewId);
    setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, comment_count: Math.max((r.comment_count ?? 1) - 1, 0) } : r));
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("정말 이 게시글을 삭제할까요?")) return;
    const token = sessionStorage.getItem("cooking_assistant_auth_token");
    const res = await fetch(`/api/community/${reviewId}`, { method: "DELETE", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    if (res.ok) setReviews((prev) => prev.filter((r) => r.id !== reviewId));
  };

  const handleSaveRecipe = async (review: CommunityReview) => {
    if (savingIds.has(review.recipe_id)) return;
    setSavingIds((prev) => new Set(prev).add(review.recipe_id));
    try {
      const alreadySaved = savedRecipeIds.has(review.recipe_id);
      setReviews((prev) => prev.map((r) => r.recipe_id === review.recipe_id ? { ...r, bookmark_count: alreadySaved ? (r.bookmark_count ?? 1) - 1 : (r.bookmark_count ?? 0) + 1 } : r));
      if (alreadySaved) {
        await removeSavedRecipe(review.recipe_id);
      } else {
        let img: string | null = null;
        try { const res = await getCompletedRecipeById(review.recipe_id); img = res?.recipe?.image ?? res?.image ?? null; } catch {}
        await saveRecipe({ recipe_id: review.recipe_id, name: review.recipe_name, category: "기타", image: img ?? review.image_url ?? null, difficulty: null, cooking_time: null, description: review.review ?? null, ingredients: [], steps: [] });
      }
      await loadSaved();
      onRefreshSaved?.();
      window.dispatchEvent(new Event("savedRecipesUpdated"));
    } catch {} finally {
      setSavingIds((prev) => { const s = new Set(prev); s.delete(review.recipe_id); return s; });
    }
  };

  const calculateRankings = (): RecipeRanking[] => {
    const map = new Map<string, CommunityReview[]>();
    reviews.forEach((r) => map.set(r.recipe_id, [...(map.get(r.recipe_id) || []), r]));
    return [...map.entries()].map(([recipeId, rs]) => ({ recipeId, recipeName: rs[0].recipe_name, reviewCount: rs.length, averageRating: rs.reduce((s, r) => s + r.rating, 0) / rs.length, rank: 0 })).sort((a, b) => b.averageRating - a.averageRating).map((r, i) => ({ ...r, rank: i + 1 }));
  };

  const filteredReviews = [...reviews].sort((a, b) => filter === "popular" ? (b.bookmark_count ?? 0) - (a.bookmark_count ?? 0) : new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const rankings = calculateRankings();

  const rankColors = ["#f59e0b", "#9ca3af", "#cd7c4f"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: "-0.5px" }}>커뮤니티</h1>
          <p style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>요리 후기와 레시피를 공유해보세요</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fef9e7", border: "1px solid #fde68a", borderRadius: 10, padding: "8px 14px" }}>
          <Star style={{ width: 14, height: 14, fill: "#f59e0b", color: "#f59e0b" }} />
          <span style={{ fontSize: 12, color: "#92400e", fontWeight: 500 }}>AI 요리 완료 후 후기를 작성해보세요</span>
        </div>
      </div>

      {/* 필터 탭 */}
      <div style={{ display: "flex", gap: 4, background: "#f3f4f6", borderRadius: 12, padding: 4, width: "fit-content" }}>
        {([
          { key: "all", label: "최신순", icon: <Clock style={{ width: 13, height: 13 }} /> },
          { key: "popular", label: "인기순", icon: <TrendingUp style={{ width: 13, height: 13 }} /> },
          { key: "ranking", label: "랭킹", icon: <Trophy style={{ width: 13, height: 13 }} /> },
        ] as const).map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 16px", borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.15s", background: filter === f.key ? "#fff" : "transparent", color: filter === f.key ? "#465940" : "#6b7280", border: "none", boxShadow: filter === f.key ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
            {f.icon}{f.label}
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>

        {/* 메인 피드 */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {loading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              {[1,2].map((i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 16, border: "1px solid #f3f4f6", overflow: "hidden" }}>
                  <div style={{ padding: 20 }}>
                    <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#f3f4f6" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 12, width: 80, background: "#f3f4f6", borderRadius: 6, marginBottom: 6 }} />
                        <div style={{ height: 10, width: 60, background: "#f3f4f6", borderRadius: 6 }} />
                      </div>
                    </div>
                    <div style={{ height: 14, background: "#f3f4f6", borderRadius: 6, marginBottom: 8 }} />
                    <div style={{ height: 14, width: "70%", background: "#f3f4f6", borderRadius: 6 }} />
                  </div>
                  <div style={{ height: 200, background: "#f9fafb" }} />
                </div>
              ))}
            </div>
          )}

          {/* 랭킹 뷰 */}
          {!loading && filter === "ranking" && (
            rankings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#9ca3af" }}>
                <Trophy style={{ width: 40, height: 40, margin: "0 auto 12px", color: "#e5e7eb" }} />
                <p style={{ fontSize: 15, fontWeight: 500 }}>아직 랭킹이 없습니다</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>요리 후기를 남기면 랭킹에 반영됩니다</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {rankings.map((r) => (
                  <div key={r.recipeId} style={{ background: "#fff", borderRadius: 14, border: "1px solid #f3f4f6", padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, boxShadow: r.rank <= 3 ? "0 2px 12px rgba(245,158,11,0.1)" : "none" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: r.rank <= 3 ? "#fef9e7" : "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: r.rank <= 3 ? rankColors[r.rank - 1] : "#9ca3af" }}>{r.rank}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.recipeName}</p>
                      <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>리뷰 {r.reviewCount}개</p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <StarDisplay rating={Math.round(r.averageRating)} size={13} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>{r.averageRating.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* 피드 뷰 */}
          {!loading && filter !== "ranking" && (
            filteredReviews.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#9ca3af" }}>
                <MessageCircle style={{ width: 40, height: 40, margin: "0 auto 12px", color: "#e5e7eb" }} />
                <p style={{ fontSize: 15, fontWeight: 500 }}>아직 작성된 후기가 없습니다</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>첫 번째 후기를 남겨보세요!</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              {filteredReviews.map((review) => {
                const reviewComments = comments[review.id] || [];
                const isOpen = showComments[review.id];
                const displayImage = review.image_url ?? review.recipe_image ?? null;
                const isSaved = savedRecipeIds.has(review.recipe_id);
                const isOwner = review.user_name === currentUser?.name;
                const isSaving = savingIds.has(review.recipe_id);

                return (
                  <div key={review.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #f3f4f6", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)", transition: "box-shadow 0.2s" }}>

                    {/* 포스트 헤더 */}
                    <div style={{ padding: "12px 14px 10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <Avatar style={{ width: 32, height: 32 }}>
                            <AvatarFallback style={{ background: "linear-gradient(135deg,#e8f2dd,#c8e0b8)", color: "#3a5c3d", fontWeight: 700, fontSize: 12 }}>
                              {review.user_initial}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{review.user_name}</p>
                            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{getTimeAgo(review.created_at)}</p>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <StarDisplay rating={review.rating} size={12} />
                          <span style={{ fontSize: 11, color: "#9ca3af" }}>{review.rating}.0</span>
                        </div>
                      </div>

                      {/* 레시피 태그 */}
                      <div style={{ marginTop: 8 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 50, background: "linear-gradient(135deg,#e8f2dd,#d4e9c4)", color: "#3a5c3d", fontSize: 11, fontWeight: 600 }}>
                          🍳 {review.recipe_name}
                        </span>
                      </div>

                      {/* 리뷰 텍스트 */}
                      {review.review && (
                        <p style={{ marginTop: 7, fontSize: 13, color: "#374151", lineHeight: 1.55 }}>{review.review}</p>
                      )}
                    </div>

                    {/* 이미지 */}
                    {displayImage && (
                      <div style={{ position: "relative", paddingBottom: "65%", overflow: "hidden" }}>
                        <img src={displayImage} alt="review" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={(e) => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = "none"; }} />
                      </div>
                    )}

                    {/* 액션 바 */}
                    <div style={{ padding: "8px 14px", borderTop: "1px solid #f9fafb", display: "flex", alignItems: "center", gap: 2 }}>
                      <button onClick={() => toggleComments(review.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, fontSize: 12, color: isOpen ? "#465940" : "#6b7280", background: isOpen ? "#e8f2dd" : "transparent", border: "none", cursor: "pointer", fontWeight: isOpen ? 600 : 400, transition: "all 0.15s" }}>
                        <MessageCircle style={{ width: 13, height: 13 }} />
                        댓글 {review.comment_count ?? reviewComments.length}
                      </button>

                      <button onClick={() => handleSaveRecipe(review)} disabled={isSaving} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, fontSize: 12, color: isSaved ? "#465940" : "#6b7280", background: isSaved ? "#e8f2dd" : "transparent", border: "none", cursor: "pointer", fontWeight: isSaved ? 600 : 400, transition: "all 0.15s", opacity: isSaving ? 0.6 : 1 }}>
                        <Bookmark style={{ width: 13, height: 13, fill: isSaved ? "#465940" : "none", color: isSaved ? "#465940" : "#6b7280" }} />
                        {isSaved ? "저장됨" : "저장"} {review.bookmark_count ? `${review.bookmark_count}` : ""}
                      </button>

                      {isOwner && (
                        <button onClick={() => handleDeleteReview(review.id)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, fontSize: 12, color: "#ef4444", background: "transparent", border: "none", cursor: "pointer", marginLeft: "auto", transition: "background 0.15s" }}>
                          <Trash2 style={{ width: 12, height: 12 }} /> 삭제
                        </button>
                      )}
                    </div>

                    {/* 댓글 영역 */}
                    {isOpen && (
                      <div style={{ borderTop: "1px solid #f3f4f6", background: "#fafafa" }}>
                        {reviewComments.length > 0 && (
                          <div style={{ padding: "10px 14px 0", display: "flex", flexDirection: "column", gap: 8 }}>
                            {reviewComments.map((c) => (
                              <div key={c.id} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                                <Avatar style={{ width: 24, height: 24, flexShrink: 0 }}>
                                  <AvatarFallback style={{ background: "#f3f4f6", color: "#6b7280", fontSize: 10, fontWeight: 600 }}>{c.user_initial}</AvatarFallback>
                                </Avatar>
                                <div style={{ flex: 1, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "7px 11px" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{c.user_name}</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      <span style={{ fontSize: 10, color: "#d1d5db" }}>{getTimeAgo(c.created_at)}</span>
                                      {c.user_name === currentUser?.name && (
                                        <button onClick={() => handleDeleteComment(review.id, c.id)} style={{ fontSize: 10, color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: 0 }}>삭제</button>
                                      )}
                                    </div>
                                  </div>
                                  <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>{c.text}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {reviewComments.length === 0 && (
                          <div style={{ padding: "12px 14px 0", textAlign: "center" }}>
                            <p style={{ fontSize: 12, color: "#d1d5db" }}>첫 번째 댓글을 남겨보세요</p>
                          </div>
                        )}

                        <div style={{ padding: "8px 14px 12px", display: "flex", gap: 7 }}>
                          <Avatar style={{ width: 26, height: 26, flexShrink: 0 }}>
                            <AvatarFallback style={{ background: "linear-gradient(135deg,#e8f2dd,#c8e0b8)", color: "#3a5c3d", fontSize: 10, fontWeight: 700 }}>{currentUser?.name?.slice(0,1) ?? "?"}</AvatarFallback>
                          </Avatar>
                          <div style={{ flex: 1, display: "flex", gap: 6 }}>
                            <input
                              value={commentInput[review.id] || ""}
                              placeholder="댓글 달기..."
                              onChange={(e) => setCommentInput((prev) => ({ ...prev, [review.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(review.id); } }}
                              style={{ flex: 1, padding: "7px 12px", borderRadius: 10, fontSize: 12, border: "1.5px solid #e5e7eb", outline: "none", background: "#fff", transition: "border-color 0.15s" }}
                              onFocus={(e) => { e.target.style.borderColor = "#465940"; }}
                              onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; }}
                            />
                            <button onClick={() => addComment(review.id)} style={{ width: 32, height: 32, borderRadius: 10, background: commentInput[review.id]?.trim() ? "#465940" : "#e5e7eb", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s", flexShrink: 0 }}>
                              <Send style={{ width: 13, height: 13 }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            )
          )}
        </div>

        {/* 사이드바 */}
        {filter !== "ranking" && rankings.length > 0 && (
          <div style={{ width: 256, flexShrink: 0 }}>
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f3f4f6", overflow: "hidden", position: "sticky", top: 16, boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: "#fef9e7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Trophy style={{ width: 13, height: 13, color: "#f59e0b" }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>레시피 랭킹</span>
              </div>
              {rankings.slice(0, 5).map((r, idx) => (
                <div key={r.recipeId} style={{ padding: "12px 16px", borderBottom: idx < Math.min(rankings.length, 5) - 1 ? "1px solid #f9fafb" : "none", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, width: 20, textAlign: "center", flexShrink: 0, color: r.rank <= 3 ? rankColors[r.rank - 1] : "#d1d5db" }}>{r.rank}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.recipeName}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                      <Star style={{ width: 10, height: 10, fill: "#f59e0b", color: "#f59e0b" }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#f59e0b" }}>{r.averageRating.toFixed(1)}</span>
                      <span style={{ fontSize: 11, color: "#d1d5db" }}>·</span>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>리뷰 {r.reviewCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
