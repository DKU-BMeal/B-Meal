import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";

interface DarkModeToggleProps {
  isDarkMode: boolean;
  onToggle: () => void;
}

export function DarkModeToggle({ isDarkMode, onToggle }: DarkModeToggleProps) {
  return (
    <Button
      onClick={onToggle}
      variant="ghost"
      size="icon"
      className="fixed top-4 right-4 z-50 rounded-full bg-card hover:bg-accent"
      aria-label="다크모드 토글"
    >
      {isDarkMode ? (
        <Sun className="h-5 w-5 text-foreground" />
      ) : (
        <Moon className="h-5 w-5 text-foreground" />
      )}
    </Button>
  );
}
