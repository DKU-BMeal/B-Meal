import { Avatar, AvatarFallback } from "./ui/avatar";
import { Settings, ChefHat, Bookmark, UserCog, ChevronRight } from "lucide-react";

interface MyPageProps {
  userName?: string;
  onProfileEdit: () => void;
  onAccountSettings?: () => void;
  onSavedRecipes?: () => void;
  onCompletedRecipes?: () => void;
  completedRecipesCount?: number;
  savedRecipesCount?: number;
}

export function MyPage({
  userName = "사용자",
  onProfileEdit, onAccountSettings, onSavedRecipes, onCompletedRecipes,
  completedRecipesCount = 0, savedRecipesCount = 0,
}: MyPageProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* 프로필 헤더 */}
      <div style={{
        borderRadius: 20,
        background: "linear-gradient(135deg,#1c2b1e 0%,#2d4a30 55%,#3a5c3d 100%)",
        padding: "36px 40px",
        display: "flex", alignItems: "center", gap: 28,
      }}>
        <Avatar style={{ width: 72, height: 72, flexShrink: 0 }}>
          <AvatarFallback style={{
            background: "rgba(255,255,255,0.18)", color: "#fff",
            fontSize: 28, fontWeight: 700, borderRadius: "50%",
          }}>
            {userName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div style={{ flex: 1 }}>
          <p style={{ color: "#86efac", fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", marginBottom: 4 }}>
            쿠킹메이트 회원
          </p>
          <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 14 }}>{userName}</h2>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "프로필 수정", onClick: onProfileEdit,     Icon: Settings },
              { label: "계정 설정",   onClick: onAccountSettings, Icon: UserCog  },
            ].map(({ label, onClick, Icon }) => (
              <button key={label} onClick={onClick} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: "rgba(255,255,255,0.13)", color: "#fff",
                border: "1px solid rgba(255,255,255,0.22)", cursor: "pointer",
              }}>
                <Icon style={{ width: 13, height: 13 }} />{label}
              </button>
            ))}
          </div>
        </div>

        {/* 통계 */}
        <div style={{ display: "flex", gap: 0, flexShrink: 0 }}>
          {[
            { label: "완료한 요리",   value: completedRecipesCount, onClick: onCompletedRecipes },
            { label: "저장한 레시피", value: savedRecipesCount,     onClick: onSavedRecipes },
          ].map(({ label, value, onClick }, i) => (
            <button
              key={label}
              onClick={onClick}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "14px 32px", cursor: "pointer", background: "none", border: "none",
                borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.15)" : "none",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <p style={{ fontSize: 32, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 6 }}>{label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 나의 활동 + 설정 — 전체 너비 리스트 */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>

        {/* 섹션 타이틀 */}
        <div style={{ padding: "16px 22px 10px", borderBottom: "1px solid #f3f4f6" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.06em" }}>나의 활동</p>
        </div>

        {[
          { label: "완료한 요리",   desc: `${completedRecipesCount}개`, Icon: ChefHat,  action: onCompletedRecipes },
          { label: "저장한 레시피", desc: `${savedRecipesCount}개`,     Icon: Bookmark, action: onSavedRecipes     },
        ].map(({ label, desc, Icon, action }) => (
          <button
            key={label}
            onClick={action}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 14,
              padding: "16px 22px", textAlign: "left", background: "none",
              borderBottom: "1px solid #f3f4f6", cursor: "pointer",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(135deg,#e8f2dd,#d4e5c8)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon style={{ width: 17, height: 17, color: "#465940" }} />
            </div>
            <p style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "#111827" }}>{label}</p>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginRight: 8 }}>{desc}</span>
            <ChevronRight style={{ width: 15, height: 15, color: "#d1d5db" }} />
          </button>
        ))}

        {/* 설정 타이틀 */}
        <div style={{ padding: "16px 22px 10px", borderBottom: "1px solid #f3f4f6" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.06em" }}>설정</p>
        </div>

        {[
          { label: "프로필 수정",  desc: "취향·요리 도구 설정", Icon: Settings, action: onProfileEdit      },
          { label: "계정 설정",    desc: "개인정보 및 보안",     Icon: UserCog,  action: onAccountSettings },
        ].map(({ label, desc, Icon, action }, i, arr) => (
          <button
            key={label}
            onClick={action}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 14,
              padding: "16px 22px", textAlign: "left", background: "none",
              borderBottom: i < arr.length - 1 ? "1px solid #f3f4f6" : "none",
              cursor: "pointer",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(135deg,#e8f2dd,#d4e5c8)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon style={{ width: 16, height: 16, color: "#465940" }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>{label}</p>
              <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{desc}</p>
            </div>
            <ChevronRight style={{ width: 15, height: 15, color: "#d1d5db" }} />
          </button>
        ))}
      </div>

    </div>
  );
}
