import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Settings, LogOut, ArrowLeft } from "lucide-react";

interface TopNavBarProps {
  isAuthenticated: boolean;
  userName?: string;
  onLogout: () => void;
  onProfileClick: () => void;
  onLogoClick: () => void;
  onSearch?: (query: string) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

export function TopNavBar({
  isAuthenticated,
  userName,
  onLogout,
  onProfileClick,
  showBackButton = false,
  onBackClick,
}: TopNavBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 h-16 flex items-center px-6 shrink-0">
      {/* 왼쪽: 뒤로가기 */}
      <div className="flex items-center gap-2">
        {showBackButton && onBackClick && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackClick}
            className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">뒤로</span>
          </Button>
        )}
      </div>

      <div className="flex-1" />

      {/* 오른쪽: 유저 메뉴 */}
      <div className="flex items-center gap-3">
        {isAuthenticated && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 h-9 px-3 rounded-xl hover:bg-gray-100"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-[#465940] text-white text-xs rounded-lg">
                    {userName?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-gray-700">{userName}</span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onProfileClick}>
                <Settings className="mr-2 h-4 w-4" />
                프로필 설정
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-red-500 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
