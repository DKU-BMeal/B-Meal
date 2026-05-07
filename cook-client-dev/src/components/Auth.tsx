import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ChefHat, Mail, Lock, User } from "lucide-react";
import {
  signUp,
  login,
  setAuthToken,
  sendVerification,
  verifyOtp,
} from "../utils/api";
import { Label } from "./ui/label";


interface AuthProps {
  onAuthSuccess: (userName: string) => void;
}

export function Auth({ onAuthSuccess }: AuthProps) {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

  /* ---------- 로그인 ---------- */
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  /* ---------- 회원가입 ---------- */
  const [signupEmail, setSignupEmail] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  /* ---------- OTP ---------- */
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // ✅ 추가: 타이머 / 재전송 쿨타임
  const OTP_EXPIRE_SECONDS = 300; // 5분
  const RESEND_COOLDOWN_SECONDS = 60;

  const [otpRemaining, setOtpRemaining] = useState<number>(0);     // 남은 시간(초)
  const [resendCooldown, setResendCooldown] = useState<number>(0); // 재전송 쿨타임(초)

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
    useEffect(() => {
    if (otpRemaining <= 0) return;

    const timer = setInterval(() => {
      setOtpRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [otpRemaining]);


    useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);


  /* ================= 로그인 ================= */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!loginEmail || !loginPassword) {
      setError("모든 필드를 입력해주세요");
      return;
    }

    setLoading(true);
    try {
      const res = await login(loginEmail, loginPassword);

      if (!res?.user) {
        setError("로그인에 실패했습니다");
        return;
      }

      if (res.token) {
        setAuthToken(res.token);
        localStorage.setItem("loginTime", Date.now().toString()); // ⭐ 추가
      }


      const userName = res.user.name || loginEmail.split("@")[0];
      sessionStorage.setItem(
        "cooking_assistant_current_user",
        JSON.stringify({
          id: res.user.id,
          email: loginEmail,
          name: userName,
        })
      );

      onAuthSuccess(userName);
    } catch (e: any) {
      setError(e.message || "로그인 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

    /* ================= OTP 발송 ================= */
  const handleSendOtp = async () => {
    if (!signupEmail) {
      setError("이메일을 입력해주세요");
      return;
    }

    // ✅ 쿨타임 중이면 무시
    if (resendCooldown > 0) return;

    setError("");
    setSendingOtp(true);

    try {
      await sendVerification(signupEmail);

      setError("인증번호를 이메일로 보냈습니다.");
      setOtp("");
      setOtpVerified(false);

      // ✅ 타이머 시작
      setOtpRemaining(OTP_EXPIRE_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e: any) {
      setError(e.message || "인증번호 전송 실패");
    } finally {
      setSendingOtp(false);
    }
  };


    /* ================= OTP 확인 ================= */
  const handleVerifyOtp = async () => {
    // ✅ 만료되면 서버 호출하기 전에 컷
    if (otpRemaining <= 0) {
      setError("인증번호가 만료되었습니다. 다시 요청해주세요.");
      return;
    }

    if (otp.length !== 6) {
      setError("인증번호 6자리를 입력해주세요");
      return;
    }

    setError("");
    setVerifyingOtp(true);
    try {
      await verifyOtp(signupEmail, otp);
      setOtpVerified(true);

      // ✅ 성공하면 카운트다운 멈춤
      setOtpRemaining(0);
    } catch (e: any) {
      setError(e.message || "인증번호가 올바르지 않습니다");
    } finally {
      setVerifyingOtp(false);
    }
  };


  /* ================= 회원가입 ================= */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !signupEmail ||
      !signupName ||
      !signupPassword ||
      !signupConfirmPassword
    ) {
      setError("모든 필드를 입력해주세요");
      return;
    }

    if (!otpVerified) {
      setError("이메일 인증번호 확인이 필요합니다");
      return;
    }

    if (signupPassword.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다");
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setError("비밀번호가 일치하지 않습니다");
      return;
    }

    setLoading(true);
    try {
      await signUp(signupEmail, signupPassword, signupName);

      const res = await login(signupEmail, signupPassword);
      if (res.token) {
        setAuthToken(res.token);
        localStorage.setItem("loginTime", Date.now().toString()); // ⭐ 추가
      }


      sessionStorage.setItem(
        "cooking_assistant_current_user",
        JSON.stringify({
          id: res.user.id,
          email: signupEmail,
          name: signupName,
        })
      );

      onAuthSuccess(signupName);
    } catch (e: any) {
      setError(e.message || "회원가입 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
    <div className="max-w-md w-full">

      {/* ================= Header ================= */}
      <div className="text-center mb-8">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 relative"
          style={{
            background:
              "linear-gradient(135deg, #465940 0%, #5a6b4e 50%, #6a7d5e 100%)",
            boxShadow:
              "0 8px 20px rgba(70, 89, 64, 0.35), inset 0 2px 4px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-3xl" />
          <ChefHat
            className="w-12 h-12 text-white relative z-10"
            style={{
              filter:
                "drop-shadow(0 2px 4px rgba(0,0,0,0.4)) drop-shadow(0 4px 8px rgba(0,0,0,0.25))",
            }}
          />
        </div>

        <h1
          className="mb-2"
          style={{
            background:
              "linear-gradient(135deg, #465940 0%, #5a6b4e 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: "1.875rem",
            fontWeight: 700,
          }}
        >
          비밀(B-Meal)
        </h1>

        <p className="text-muted-foreground">
          AI가 도와주는 맞춤형 요리 가이드
        </p>
      </div>

      {/* ================= Tabs ================= */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "login" | "signup")}
      >
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="login">로그인</TabsTrigger>
          <TabsTrigger value="signup">회원가입</TabsTrigger>
        </TabsList>

        {/* ================= 로그인 ================= */}
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>로그인</CardTitle>
              <CardDescription>
                계정에 로그인하여 맞춤 레시피를 확인하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">

                <div className="space-y-2">
                  <Label>이메일</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10"
                      placeholder="이메일을 입력하세요"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm rounded-lg whitespace-pre-line">
                    {error}
                  </div>
                )}

                <Button className="w-full" disabled={loading}>
                  {loading ? "로그인 중..." : "로그인"}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  계정이 없으신가요?{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("signup")}
                    className="text-primary hover:underline"
                  >
                    회원가입
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= 회원가입 ================= */}
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>회원가입</CardTitle>
              <CardDescription>
                새 계정을 만들어 요리 여정을 시작하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-4">

                {/* 이메일 + OTP */}
                <div className="space-y-2">
                  <Label>이메일</Label>
                  <div className="flex gap-2">
                    <Input
                      value={signupEmail}
                      onChange={(e) => {
                        setSignupEmail(e.target.value);
                        setOtp("");
                        setOtpVerified(false);
                        setOtpRemaining(0);
                        setResendCooldown(0);
                      }}
                      placeholder="이메일을 입력하세요"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={sendingOtp || resendCooldown > 0}
                      onClick={handleSendOtp}
                    >
                      {resendCooldown > 0
                        ? `재전송 (${resendCooldown}s)`
                        : "인증하기"}
                    </Button>
                  </div>
                </div>

                {!otpVerified && (
                  <div className="flex gap-2">
                    <Input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="인증번호 6자리"
                      maxLength={6}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleVerifyOtp}
                      disabled={verifyingOtp}
                    >
                      확인
                    </Button>
                  </div>
                )}

                {!otpVerified && otpRemaining > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ⏱ 남은 시간: {Math.floor(otpRemaining / 60)}:
                    {String(otpRemaining % 60).padStart(2, "0")}
                  </p>
                )}

                {otpVerified && (
                  <p className="text-sm text-green-600">✅ 인증되었습니다</p>
                )}

                <div className="space-y-2">
                  <Label>이름</Label>
                  <Input
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="홍길동"
                  />
                </div>

                <div className="space-y-2">
                  <Label>비밀번호</Label>
                  <Input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-2">
                  <Label>비밀번호 확인</Label>
                  <Input
                    type="password"
                    value={signupConfirmPassword}
                    onChange={(e) =>
                      setSignupConfirmPassword(e.target.value)
                    }
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm rounded-lg whitespace-pre-line">
                    {error}
                  </div>
                )}

                <Button className="w-full" disabled={loading}>
                  {loading ? "가입 중..." : "회원가입"}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  이미 계정이 있으신가요?{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("login")}
                    className="text-primary hover:underline"
                  >
                    로그인
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ================= Footer ================= */}
      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground">
          회원가입을 진행하면 서비스 이용약관 및 개인정보 처리방침에<br />
          동의하는 것으로 간주됩니다
        </p>
      </div>

    </div>
  </div>
);

}
