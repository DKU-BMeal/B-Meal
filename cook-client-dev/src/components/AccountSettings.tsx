import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { ArrowLeft, User, Mail, Lock, AlertCircle } from "lucide-react";
import { getCurrentUser, updateProfile, deleteAccount } from "../utils/api";
import { toast } from "sonner";

interface AccountSettingsProps {
  onBack: () => void;
  onAccountDeleted: () => void;
}

export function AccountSettings({ onBack, onAccountDeleted }: AccountSettingsProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const response = await getCurrentUser();
      
      if (response && response.user) {
        setName(response.user.name || "");
        setEmail(response.user.email || "");
      }
    } catch (error) {
      console.error('Load user data error:', error);
      toast.error("사용자 정보를 불러올 수 없습니다");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("이름을 입력해주세요");
      return;
    }

    setLoading(true);
    
    try {
      // Update user profile via API
      await updateProfile({ name });

      // Update session storage
      const currentUser = JSON.parse(sessionStorage.getItem("cooking_assistant_current_user") || "{}");
      currentUser.name = name;
      sessionStorage.setItem("cooking_assistant_current_user", JSON.stringify(currentUser));

      toast.success("프로필이 업데이트되었습니다");
    } catch (error: any) {
      console.error('Update profile error:', error);
      toast.error("프로필 업데이트 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("모든 비밀번호 필드를 입력해주세요");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("새 비밀번호는 최소 6자 이상이어야 합니다");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("새 비밀번호가 일치하지 않습니다");
      return;
    }

    setPasswordLoading(true);

    try {
      // TODO: Implement password change in MySQL backend
      toast.info("비밀번호 변경 기능은 곧 지원될 예정입니다");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error('Change password error:', error);
      toast.error("비밀번호 변경 중 오류가 발생했습니다");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    if (!confirm("모든 데이터가 영구적으로 삭제됩니다. 계속하시겠습니까?")) {
      return;
    }

    try {
      await deleteAccount();
      toast.success("계정이 삭제되었습니다");
      onAccountDeleted(); // ✅ 여기서 App의 handleLogout으로 연결할 거임
    } catch (error: any) {
      console.error("Delete account error:", error);
      toast.error("계정 삭제 중 오류가 발생했습니다");
    }
  };

  return (
    <div>
      <div className="max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="mb-2">개인정보 설정</h1>
          <p className="text-muted-foreground">
            계정 정보 및 보안 설정을 관리하세요
          </p>
        </div>

        {/* Profile Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              프로필 정보
            </CardTitle>
            <CardDescription>
              이름과 기본 정보를 수정할 수 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    placeholder="이름을 입력하세요"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="pl-10 bg-muted"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  이메일은 변경할 수 없습니다
                </p>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? "저장 중..." : "프로필 저장"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              비밀번호 변경
            </CardTitle>
            <CardDescription>
              계정 보안을 위해 주기적으로 비밀번호를 변경하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">현재 비밀번호</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pl-10"
                    placeholder="현재 비밀번호"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="new-password">새 비밀번호</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10"
                    placeholder="새 비밀번호 (최소 6자)"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    placeholder="새 비밀번호 확인"
                  />
                </div>
              </div>

              <Button type="submit" disabled={passwordLoading}>
                {passwordLoading ? "변경 중..." : "비밀번호 변경"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              위험 영역
            </CardTitle>
            <CardDescription>
              계정 삭제는 되돌릴 수 없습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다. 
                저장된 레시피, 식재료, 프로필 정보 등 모든 정보가 사라지며 복구할 수 없습니다.
              </p>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
              >
                계정 삭제
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}