import { useState } from "react";
import { Star, Upload, Home, Send, PartyPopper, X } from "lucide-react";
import { motion } from "motion/react";

interface Recipe {
  id: string;
  name: string;
  category: string;
  difficulty?: string | null;
  cookingTime?: number | string | null;
  image?: string | null;
  description?: string | null;
}

interface RecipeReviewProps {
  recipe: Recipe;
  onSubmit: () => void;
  onSkip: () => void;
}

export function RecipeReview({ recipe, onSubmit, onSkip }: RecipeReviewProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setUploadedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (rating === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const currentUser = sessionStorage.getItem("cooking_assistant_current_user");
      const user = currentUser ? JSON.parse(currentUser) : { name: "익명" };
      const token = sessionStorage.getItem("cooking_assistant_auth_token");

      const res = await fetch("/api/community", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          recipeId: recipe.id,
          recipeName: recipe.name,
          rating,
          review: review.trim() === "" ? "맛있게 먹었습니다!" : review,
          imageUrl: uploadedImage ?? recipe.image ?? null,
          userName: user.name,
          userInitial: user.name[0],
        }),
      });

      if (!res.ok) throw new Error("커뮤니티 저장 실패");
      onSubmit();
    } catch (err) {
      console.error("❌ 리뷰 저장 실패:", err);
      alert("리뷰 저장에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const ratingLabels = ["", "별로예요", "그저 그래요", "괜찮아요", "맛있어요", "최고예요!"];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: "60vh", padding: "0 16px" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>

        {/* 축하 헤더 */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45 }}
          style={{ textAlign: "center", marginBottom: 32 }}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            style={{ display: "inline-block", marginBottom: 12 }}
          >
            <div style={{ width: 80, height: 80, borderRadius: 24, background: "linear-gradient(135deg,#fff3e0,#ffe0b2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", boxShadow: "0 4px 20px rgba(230,126,34,0.2)" }}>
              <PartyPopper style={{ width: 40, height: 40, color: "#e07a5f" }} />
            </div>
          </motion.div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111827", letterSpacing: "-0.5px", marginBottom: 6 }}>
            요리 완성! 🎉
          </h1>
          <p style={{ fontSize: 15, color: "#6b7280" }}>
            <span style={{ color: "#465940", fontWeight: 600 }}>{recipe.name}</span>을(를) 성공적으로 완성했어요
          </p>
        </motion.div>

        {/* 리뷰 카드 */}
        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #f3f4f6", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", overflow: "hidden", marginBottom: 20 }}>

          {/* 별점 섹션 */}
          <div style={{ padding: "28px 28px 24px", borderBottom: "1px solid #f9fafb" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 16, textAlign: "center" }}>
              이번 요리는 어떠셨나요? *
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              {[1,2,3,4,5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, transition: "transform 0.1s" }}
                  onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.9)"; }}
                  onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.15)"; setTimeout(() => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }, 150); }}
                >
                  <Star
                    style={{
                      width: 44, height: 44,
                      fill: star <= (hoveredRating || rating) ? "#f59e0b" : "#e5e7eb",
                      color: star <= (hoveredRating || rating) ? "#f59e0b" : "#e5e7eb",
                      filter: star <= (hoveredRating || rating) ? "drop-shadow(0 2px 6px rgba(245,158,11,0.4))" : "none",
                      transition: "all 0.15s",
                    }}
                  />
                </button>
              ))}
            </div>
            {(hoveredRating || rating) > 0 && (
              <p style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: "#f59e0b", marginTop: 8, minHeight: 20 }}>
                {ratingLabels[hoveredRating || rating]}
              </p>
            )}
          </div>

          {/* 후기 텍스트 */}
          <div style={{ padding: "20px 28px", borderBottom: "1px solid #f9fafb" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>후기 작성 (선택)</p>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="요리 과정이나 맛에 대한 솔직한 후기를 남겨주세요..."
              maxLength={500}
              style={{ width: "100%", minHeight: 110, padding: "12px 14px", borderRadius: 12, border: "1.5px solid #e5e7eb", fontSize: 14, color: "#374151", resize: "none", outline: "none", fontFamily: "inherit", lineHeight: 1.6, transition: "border-color 0.15s", boxSizing: "border-box" }}
              onFocus={(e) => { e.target.style.borderColor = "#465940"; }}
              onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; }}
            />
            <p style={{ fontSize: 12, color: "#d1d5db", textAlign: "right", marginTop: 4 }}>{review.length}/500</p>
          </div>

          {/* 사진 업로드 */}
          <div style={{ padding: "20px 28px" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>사진 추가 (선택)</p>
            {uploadedImage ? (
              <div style={{ position: "relative", borderRadius: 12, overflow: "hidden" }}>
                <img src={uploadedImage} alt="업로드된 사진" style={{ width: "100%", maxHeight: 240, objectFit: "cover", display: "block" }} />
                <button
                  onClick={() => setUploadedImage(null)}
                  style={{ position: "absolute", top: 10, right: 10, width: 30, height: 30, borderRadius: "50%", background: "rgba(0,0,0,0.55)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </div>
            ) : (
              <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: 120, borderRadius: 12, border: "2px dashed #e5e7eb", cursor: "pointer", background: "#fafafa", transition: "border-color 0.15s, background 0.15s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#a7c49a"; (e.currentTarget as HTMLElement).style.background = "#f7fbf5"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLElement).style.background = "#fafafa"; }}
              >
                <Upload style={{ width: 26, height: 26, color: "#9ca3af", marginBottom: 8 }} />
                <p style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>클릭하여 사진 업로드</p>
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
              </label>
            )}
          </div>
        </div>

        {/* 버튼 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={handleSubmit}
            disabled={!rating || isSubmitting}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "14px 0", borderRadius: 14, background: rating ? "linear-gradient(135deg,#465940,#5a7050)" : "#e5e7eb", color: rating ? "#fff" : "#9ca3af", fontSize: 15, fontWeight: 700, border: "none", cursor: rating && !isSubmitting ? "pointer" : "not-allowed", boxShadow: rating ? "0 4px 14px rgba(70,89,64,0.3)" : "none", transition: "all 0.15s" }}
          >
            <Send style={{ width: 17, height: 17 }} />
            {isSubmitting ? "등록 중..." : "커뮤니티에 후기 올리기"}
          </button>

          <button
            onClick={onSkip}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "13px 0", borderRadius: 14, background: "#fff", color: "#6b7280", fontSize: 14, fontWeight: 500, border: "1.5px solid #e5e7eb", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f9fafb"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}
          >
            <Home style={{ width: 16, height: 16 }} />
            다음에 작성하고 홈으로
          </button>
        </div>

      </div>
    </div>
  );
}
