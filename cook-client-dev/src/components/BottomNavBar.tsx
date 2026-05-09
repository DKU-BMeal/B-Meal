import { Home, BookOpen, Bot, Refrigerator, User } from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode | null;
  onClick: () => void;
}

interface BottomNavBarProps {
  activeTab: string;
  onHomeClick: () => void;
  onRecipeClick: () => void;
  onAIClick: () => void;
  onIngredientsClick: () => void;
  onMyPageClick: () => void;
}

export function BottomNavBar({
  activeTab,
  onHomeClick,
  onRecipeClick,
  onAIClick,
  onIngredientsClick,
  onMyPageClick,
}: BottomNavBarProps) {
  const navItems: NavItem[] = [
    {
      id: "home",
      label: "홈",
      icon: <Home className="w-5 h-5" />,
      onClick: onHomeClick,
    },
    {
      id: "recipe",
      label: "레시피",
      icon: <BookOpen className="w-5 h-5" />,
      onClick: onRecipeClick,
    },
    {
      id: "ai",
      label: "AI",
      icon: null, // 중앙 Floating 버튼
      onClick: onAIClick,
    },
    {
      id: "ingredients",
      label: "냉장고",
      icon: <Refrigerator className="w-5 h-5" />,
      onClick: onIngredientsClick,
    },
    {
      id: "mypage",
      label: "MY",
      icon: <User className="w-5 h-5" />,
      onClick: onMyPageClick,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-sm"
      style={{
        background:
          "linear-gradient(0deg, #FDFBF0 0%, #FDFBF0 85%, rgba(253, 251, 240, 0.95) 100%)",
        boxShadow:
          "0 -4px 12px rgba(70, 89, 64, 0.08), 0 -8px 24px rgba(70, 89, 64, 0.05)",
        borderTop: "1px solid rgba(70, 89, 64, 0.15)",
      }}
    >
      <div className="h-20 px-2 flex items-center justify-around max-w-lg mx-auto relative">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;

          /* ---------------- AI 중앙 Floating 버튼 ---------------- */
          if (item.id === "ai") {
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className="flex flex-col items-center justify-center -mt-10"
              >
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all border-4 border-card relative ${
                    isActive ? "scale-110" : "hover:scale-105"
                  }`}
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, #465940 0%, #5a6b4e 100%)"
                      : "linear-gradient(135deg, #5a6b4e 0%, #6a7d5e 100%)",
                    boxShadow: isActive
                      ? "0 8px 16px rgba(70, 89, 64, 0.35), 0 16px 32px rgba(70, 89, 64, 0.2), inset 0 2px 4px rgba(255,255,255,0.2)"
                      : "0 6px 12px rgba(70, 89, 64, 0.25), 0 12px 24px rgba(70, 89, 64, 0.15), inset 0 2px 4px rgba(255,255,255,0.15)",
                  }}
                >
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-full" />
                  <Bot
                    className="w-8 h-8 text-white relative z-10"
                    style={{
                      filter:
                        "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))",
                    }}
                  />
                </div>
                <span
                  className={`text-[10px] mt-1 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          }

          /* ---------------- 일반 네비 버튼 ---------------- */
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className="flex flex-col items-center justify-center gap-1 px-3 min-w-[60px] -translate-y-5"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative ${
                  isActive
                    ? "text-primary scale-110"
                    : "text-muted-foreground hover:scale-105"
                }`}
                style={
                  isActive
                    ? {
                        background:
                          "linear-gradient(135deg, #e8f2dd 0%, #d4e5c8 100%)",
                        boxShadow:
                          "0 2px 6px rgba(70, 89, 64, 0.15), inset 0 -1px 2px rgba(70, 89, 64, 0.1)",
                      }
                    : {}
                }
              >
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent rounded-t-xl" />
                )}
                <div
                  className="relative z-10"
                  style={{
                    filter: isActive
                      ? "drop-shadow(0 1px 2px rgba(70, 89, 64, 0.25)) drop-shadow(0 2px 3px rgba(70, 89, 64, 0.15))"
                      : "none",
                  }}
                >
                  {item.icon}
                </div>
              </div>

              <span
                className={`text-[10px] transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
