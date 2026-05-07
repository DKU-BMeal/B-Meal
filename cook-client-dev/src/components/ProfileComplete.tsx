import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ChefHat, ListChecks, Sparkles } from "lucide-react";
import type { UserProfile } from "./ProfileSetup";

interface ProfileCompleteProps {
  profile: UserProfile;
  onQuickRecommendation: () => void;
  onDetailedRecommendation: () => void;
  onBack: () => void;
}

export function ProfileComplete({
  profile,
  onQuickRecommendation,
  onDetailedRecommendation,
  onBack,
}: ProfileCompleteProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ChefHat className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="mb-2">프로필 설정 완료!</h1>
          <p className="text-muted-foreground">
            환영합니다! 어떤 방식으로 레시피를 추천받으시겠어요?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-2 border-green-200 hover:border-green-400 hover:shadow-lg transition-all cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                <Sparkles className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle>빠른 추천</CardTitle>
              <CardDescription>프로필 기반으로 바로 추천받기</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>선호 음식과 요리 수준에 맞는 레시피</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>식단 목표를 고려한 추천</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>사용 가능한 조리도구 반영</span>
                </li>
              </ul>
              <Button onClick={onQuickRecommendation} className="w-full">
                바로 추천받기
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 hover:border-green-400 hover:shadow-lg transition-all cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                <ListChecks className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle>맞춤 추천</CardTitle>
              <CardDescription>재료 입력 후 정확한 추천받기</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>보유 재료로 만들 수 있는 요리</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>조리 시간과 인원 맞춤</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>부족한 재료 대체 제안</span>
                </li>
              </ul>
              <Button onClick={onDetailedRecommendation} variant="outline" className="w-full">
                재료 입력하기
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-6">
          <Button variant="ghost" onClick={onBack}>
            프로필 수정하기
          </Button>
        </div>
      </div>
    </div>
  );
}
