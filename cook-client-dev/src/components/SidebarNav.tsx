import { Home, BookOpen, Bot, Refrigerator, User, ChefHat, Users } from "lucide-react";

interface SidebarNavProps {
  activeTab: string;
  onHomeClick: () => void;
  onRecipeClick: () => void;
  onAIClick: () => void;
  onIngredientsClick: () => void;
  onMyPageClick: () => void;
  onLogoClick: () => void;
  onCommunityClick?: () => void;
}

const NAV_ITEMS = [
  { id: "home",        label: "홈",         icon: Home },
  { id: "recipe",      label: "레시피",     icon: BookOpen },
  { id: "ai",          label: "AI 요리",    icon: Bot },
  { id: "ingredients", label: "냉장고",     icon: Refrigerator },
  { id: "community",   label: "커뮤니티",   icon: Users },
  { id: "mypage",      label: "마이페이지", icon: User },
];

export function SidebarNav(props: SidebarNavProps) {
  const handlers: Record<string, () => void> = {
    home:        props.onHomeClick,
    recipe:      props.onRecipeClick,
    ai:          props.onAIClick,
    ingredients: props.onIngredientsClick,
    community:   props.onCommunityClick ?? (() => {}),
    mypage:      props.onMyPageClick,
  };

  return (
    <aside
      style={{
        position: "fixed",
        left: 0, top: 0,
        width: 240,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#1a2e1c",
        borderRight: "1px solid #253d27",
        zIndex: 50,
        overflowY: "auto",
      }}
    >
      {/* 로고 */}
      <button
        onClick={props.onLogoClick}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "0 20px", height: 64, flexShrink: 0,
          borderBottom: "1px solid #253d27",
          cursor: "pointer", background: "none", textAlign: "left",
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "#465940",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <ChefHat style={{ width: 18, height: 18, color: "#fff" }} />
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
          쿠킹메이트
        </span>
      </button>

      {/* 네비게이션 */}
      <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = props.activeTab === id;

          return (
            <button
              key={id}
              onClick={handlers[id]}
              style={{
                width: "100%",
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 8,
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#fff" : "#7fa87a",
                background: isActive ? "#465940" : "transparent",
                border: "none", cursor: "pointer",
                textAlign: "left",
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "#253d27";
                  e.currentTarget.style.color = "#c0d9bb";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#7fa87a";
                }
              }}
            >
              <Icon style={{ width: 17, height: 17, flexShrink: 0 }} />
              {label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
