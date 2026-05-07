import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  Star, MessageCircle, Trophy, Bookmark, Send, Trash2,
} from "lucide-react";
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

export function CommunityPage({ onRefreshSaved }: CommunityPageProps) {
  const [reviews, setReviews] = useState<CommunityReview[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"all" | "popular" | "ranking">("all");
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const currentUser = JSON.parse(
    sessionStorage.getItem("cooking_assistant_current_user") || "{}"
  );

  useEffect(() => {
    loadCommunity();
    loadSaved();
  }, []);

  useEffect(() => {
    const openIds = Object.entries(showComments)
      .filter(([, open]) => open)
      .map(([id]) => id);
    if (openIds.length === 0) return;
    const interval = setInterval(() => {
      openIds.forEach(loadComments);
    }, 5000);
    return () => clearInterval(interval);
  }, [showComments]);

  const loadCommunity = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("cooking_assistant_auth_token");
      const res = await fetch("/api/community", {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (reviewId: string) => {
    const token = sessionStorage.getItem("cooking_assistant_auth_token");
    const res = await fetch(`/api/community/${reviewId}/comments`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
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

    setComments((prev) => ({
      ...prev,
      [reviewId]: [...(prev[reviewId] || []), {
        id: "temp-" + Date.now(), review_id: reviewId,
        user_name: user.name, user_initial: user.name?.slice(0, 1) ?? "?",
        text, created_at: new Date().toISOString(),
      }],
    }));
    setCommentInput((prev) => ({ ...prev, [reviewId]: "" }));

    await fetch(`/api/community/${reviewId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text, userName: user.name, userInitial: user.name?.slice(0, 1) ?? "?" }),
    });
    await loadComments(reviewId);
    setReviews((prev) => prev.map((r) =>
      r.id === reviewId ? { ...r, comment_count: (r.comment_count ?? 0) + 1 } : r
    ));
  };

  const handleDeleteComment = async (reviewId: string, commentId: string) => {
    if (!confirm("이 댓글을 삭제할까요?")) return;
    const token = sessionStorage.getItem("cooking_assistant_auth_token");
    await fetch(`/api/community/${reviewId}/comments/${commentId}`, {
      method: "DELETE",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    await loadComments(reviewId);
    setReviews((prev) => prev.map((r) =>
      r.id === reviewId ? { ...r, comment_count: Math.max((r.comment_count ?? 1) - 1, 0) } : r
    ));
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("정말 이 게시글을 삭제할까요?")) return;
    const token = sessionStorage.getItem("cooking_assistant_auth_token");
    const res = await fetch(`/api/community/${reviewId}`, {
      method: "DELETE",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (res.ok) setReviews((prev) => prev.filter((r) => r.id !== reviewId));
  };

  const handleSaveRecipe = async (review: CommunityReview) => {
    try {
      const alreadySaved = savedRecipeIds.has(review.recipe_id);
      setReviews((prev) => prev.map((r) =>
        r.recipe_id === review.recipe_id
          ? { ...r, bookmark_count: alreadySaved ? (r.bookmark_count ?? 1) - 1 : (r.bookmark_count ?? 0) + 1 }
          : r
      ));
      if (alreadySaved) {
        await removeSavedRecipe(review.recipe_id);
      } else {
        let img: string | null = null;
        try {
          const res = await getCompletedRecipeById(review.recipe_id);
          img = res?.recipe?.image ?? res?.image ?? null;
        } catch {}
        await saveRecipe({
          recipe_id: review.recipe_id, name: review.recipe_name,
          category: "기타", image: img, difficulty: null,
          cooking_time: null, description: review.review ?? null,
          ingredients: [], steps: [],
        });
      }
      await loadSaved();
      onRefreshSaved?.();
      window.dispatchEvent(new Event("savedRecipesUpdated"));
    } catch {}
  };

  const calculateRankings = (): RecipeRanking[] => {
    const map = new Map<string, CommunityReview[]>();
    reviews.forEach((r) => map.set(r.recipe_id, [...(map.get(r.recipe_id) || []), r]));
    return [...map.entries()]
      .map(([recipeId, rs]) => ({
        recipeId, recipeName: rs[0].recipe_name,
        reviewCount: rs.length,
        averageRating: rs.reduce((s, r) => s + r.rating, 0) / rs.length,
        rank: 0,
      }))
      .sort((a, b) => b.averageRating - a.averageRating)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  };

  const filteredReviews = [...reviews].sort((a, b) => {
    if (filter === "popular") return (b.bookmark_count ?? 0) - (a.bookmark_count ?? 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const rankings = calculateRankings();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>커뮤니티</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>요리 후기와 꿀팁을 공유해보세요</p>
        </div>
        <p style={{ fontSize: 12, color: "#9ca3af", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px" }}>
          AI 요리를 완료하면 후기 작성이 가능합니다
        </p>
      </div>

      {/* 필터 */}
      <div style={{ display: "flex", gap: 8 }}>
        {([
          { key: "all",     label: "최신순" },
          { key: "popular", label: "인기순" },
          { key: "ranking", label: "레시피 랭킹" },
        ] as const).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: "8px 16px", borderRadius: 50, fontSize: 13, fontWeight: 500,
              cursor: "pointer", transition: "all 0.15s",
              background: filter === f.key ? "linear-gradient(135deg,#465940,#5a7050)" : "#fff",
              color: filter === f.key ? "#fff" : "#374151",
              border: filter === f.key ? "none" : "1px solid #e5e7eb",
              boxShadow: filter === f.key ? "0 2px 8px rgba(70,89,64,0.3)" : "none",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>

        {/* 메인 피드 */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>

          {loading && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af", fontSize: 14 }}>
              불러오는 중...
            </div>
          )}

          {!loading && filter === "ranking" && (
            rankings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af", fontSize: 14 }}>
                <Trophy style={{ width: 32, height: 32, margin: "0 auto 12px", color: "#d1d5db" }} />
                아직 랭킹이 없습니다
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {rankings.map((r) => (
                  <div key={r.recipeId} style={{
                    background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb",
                    padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <span style={{ fontSize: 20, fontWeight: 700, width: 28, textAlign: "center", color: r.rank <= 3 ? "#f59e0b" : "#9ca3af" }}>
                        {r.rank}
                      </span>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{r.recipeName}</p>
                        <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>리뷰 {r.reviewCount}개</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Star style={{ width: 14, height: 14, fill: "#f59e0b", color: "#f59e0b" }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{r.averageRating.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {!loading && filter !== "ranking" && (
            filteredReviews.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af", fontSize: 14 }}>
                아직 작성된 후기가 없습니다
              </div>
            ) : (
              filteredReviews.map((review) => {
                const reviewComments = comments[review.id] || [];
                const isCommentsOpen = showComments[review.id];
                const displayImage = review.image_url ?? review.recipe_image ?? null;
                const isSaved = savedRecipeIds.has(review.recipe_id);
                const isOwner = review.user_name === currentUser?.name;

                return (
                  <div key={review.id} style={{
                    background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden",
                  }}>
                    {/* 카드 상단 */}
                    <div style={{ padding: "20px 20px 12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar style={{ width: 40, height: 40 }}>
                            <AvatarFallback style={{ background: "#e8f2dd", color: "#465940", fontWeight: 700 }}>
                              {review.user_initial}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{review.user_name}</p>
                            <p style={{ fontSize: 12, color: "#9ca3af" }}>{getTimeAgo(review.created_at)}</p>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 2 }}>
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} style={{
                              width: 14, height: 14,
                              fill: i < review.rating ? "#f59e0b" : "none",
                              color: i < review.rating ? "#f59e0b" : "#d1d5db",
                            }} />
                          ))}
                        </div>
                      </div>

                      <span style={{
                        display: "inline-block", padding: "4px 12px", borderRadius: 50,
                        background: "#e8f2dd", color: "#3a5c3d", fontSize: 12, fontWeight: 500, marginBottom: 10,
                      }}>
                        {review.recipe_name}
                      </span>

                      <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>{review.review}</p>
                    </div>

                    {/* 이미지 */}
                    {displayImage && (
                      <img
                        src={displayImage} alt="review"
                        style={{ width: "100%", maxHeight: 280, objectFit: "cover", display: "block" }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    )}

                    {/* 액션 바 */}
                    <div style={{ padding: "12px 20px", borderTop: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 20 }}>
                      <button
                        onClick={() => toggleComments(review.id)}
                        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}
                      >
                        <MessageCircle style={{ width: 16, height: 16 }} />
                        댓글 {review.comment_count ?? reviewComments.length}
                      </button>

                      <button
                        onClick={() => handleSaveRecipe(review)}
                        style={{
                          display: "flex", alignItems: "center", gap: 6, fontSize: 13,
                          color: isSaved ? "#465940" : "#6b7280",
                          background: "none", border: "none", cursor: "pointer", fontWeight: isSaved ? 600 : 400,
                        }}
                      >
                        <Bookmark style={{ width: 16, height: 16, fill: isSaved ? "#465940" : "none", color: isSaved ? "#465940" : "#6b7280" }} />
                        저장 {review.bookmark_count ?? 0}
                      </button>

                      {isOwner && (
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#ef4444", background: "none", border: "none", cursor: "pointer", marginLeft: "auto" }}
                        >
                          <Trash2 style={{ width: 14, height: 14 }} /> 삭제
                        </button>
                      )}
                    </div>

                    {/* 댓글 영역 */}
                    {isCommentsOpen && (
                      <div style={{ padding: "12px 20px 16px", borderTop: "1px solid #f3f4f6", background: "#fafafa", display: "flex", flexDirection: "column", gap: 10 }}>
                        {reviewComments.map((c) => (
                          <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <Avatar style={{ width: 32, height: 32, flexShrink: 0 }}>
                              <AvatarFallback style={{ background: "#f3f4f6", color: "#6b7280", fontSize: 12 }}>
                                {c.user_initial}
                              </AvatarFallback>
                            </Avatar>
                            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 12px", flex: 1 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{c.user_name}</span>
                                {c.user_name === currentUser?.name && (
                                  <button
                                    onClick={() => handleDeleteComment(review.id, c.id)}
                                    style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}
                                  >
                                    삭제
                                  </button>
                                )}
                              </div>
                              <p style={{ fontSize: 13, color: "#374151", whiteSpace: "pre-wrap" }}>{c.text}</p>
                            </div>
                          </div>
                        ))}

                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          <input
                            value={commentInput[review.id] || ""}
                            placeholder="댓글을 입력하세요..."
                            onChange={(e) => setCommentInput((prev) => ({ ...prev, [review.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(review.id); } }}
                            style={{
                              flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 13,
                              border: "1px solid #d1d5db", outline: "none", background: "#fff",
                            }}
                          />
                          <button
                            onClick={() => addComment(review.id)}
                            style={{
                              padding: "8px 12px", borderRadius: 8, background: "#465940",
                              color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center",
                            }}
                          >
                            <Send style={{ width: 14, height: 14 }} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )
          )}
        </div>

        {/* 사이드바 랭킹 */}
        {filter !== "ranking" && rankings.length > 0 && (
          <div style={{ width: 260, flexShrink: 0 }}>
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden", position: "sticky", top: 16 }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
                <Trophy style={{ width: 14, height: 14, color: "#f59e0b" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>레시피 랭킹 TOP 5</span>
              </div>
              {rankings.slice(0, 5).map((r) => (
                <div key={r.recipeId} style={{ padding: "12px 16px", borderBottom: "1px solid #f9fafb", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, width: 22, textAlign: "center", flexShrink: 0, color: r.rank <= 3 ? "#f59e0b" : "#9ca3af" }}>
                    {r.rank}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.recipeName}</p>
                    <p style={{ fontSize: 11, color: "#9ca3af" }}>리뷰 {r.reviewCount}개</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                    <Star style={{ width: 11, height: 11, fill: "#f59e0b", color: "#f59e0b" }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{r.averageRating.toFixed(1)}</span>
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
