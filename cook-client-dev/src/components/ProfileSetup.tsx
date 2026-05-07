import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { X, ChefHat, Clock, Users, UtensilsCrossed, Leaf, HeartPulse, AlertTriangle, ThumbsDown, Star } from "lucide-react";

export interface UserProfile {
  preferredCuisines: string[];
  allergies: string[];
  availableTools: string[];
  dislikedIngredients: string[];
  restrictions: string[];
  healthConditions: string[];
  cookingLevel?: string;
  servings?: string;
  preferredCookingTime?: string;
}

interface ProfileSetupProps {
  onComplete: (profile: UserProfile) => void;
  onBack: () => void;
  initialProfile?: UserProfile | null;
}

// ─────────────────────────────────────────────
// 단일 선택 버튼 그룹
// ─────────────────────────────────────────────
function SingleSelectGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; desc: string }[];
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(active ? "" : opt.value)}
            className={`flex flex-col items-center gap-0.5 rounded-xl border px-3 py-3 text-center transition-all ${
              active
                ? "border-primary bg-primary/10 text-primary font-semibold"
                : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5"
            }`}
          >
            <span className="text-sm font-medium">{opt.label}</span>
            <span className="text-[11px] text-muted-foreground leading-tight">{opt.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ProfileSetup({ onComplete, onBack, initialProfile }: ProfileSetupProps) {
  const [profile, setProfile] = useState<UserProfile>(
    initialProfile ?? {
      preferredCuisines: [],
      allergies: [],
      availableTools: [],
      dislikedIngredients: [],
      restrictions: [],
      healthConditions: [],
      cookingLevel: "",
      servings: "",
      preferredCookingTime: "",
    }
  );

  const [allergyInput, setAllergyInput] = useState("");
  const [dislikedInput, setDislikedInput] = useState("");

  // ─── 빠른 선택 칩 ───
  const recommendedAllergies = [
    "땅콩", "호두", "아몬드", "우유", "계란", "밀", "글루텐",
    "새우", "게", "조개", "고등어", "연어", "참치", "오징어",
    "메밀", "대두",
  ];

  const recommendedDislikes = [
    "고수", "파", "대파", "쪽파", "양파", "마늘", "생강",
    "버섯", "피망", "파프리카", "가지", "셀러리", "올리브",
    "두리안", "홍합",
  ];

  // ─── 자동완성용 전체 재료 목록 ───
  const allIngredients = [
    "파","대파","쪽파","실파","양파","적양파","마늘","다진마늘",
    "생강","다진생강","파프리카","피망","버섯","표고버섯","느타리버섯","양송이버섯",
    "새송이버섯","팽이버섯","만가닥버섯","목이버섯","가지","오이","애호박","단호박",
    "당근","고구마","감자","감자전분","연근","우엉","토란","무","순무","비트",
    "배추","양배추","적채","상추","깻잎","치커리","로메인","샐러리","미나리",
    "콩나물","숙주나물","시금치","부추","브로콜리","아스파라거스","옥수수",
    "파슬리","바질","민트","로즈마리","딜","케일","고수",
    "돼지고기","삼겹살","목살","앞다리살","갈비","등심","소고기","소불고기",
    "국거리","양지","닭고기","닭가슴살","닭다리살","닭날개","오리고기","양고기",
    "베이컨","햄","소시지","스팸",
    "새우","대하","오징어","문어","낙지","쭈꾸미","홍합","바지락","모시조개",
    "전복","고등어","연어","참치","광어","명태","대구","꽁치","날치알",
    "계란","달걀","메추리알","우유","두유","연유","생크림","요거트","버터",
    "치즈","모짜렐라치즈","체다치즈","파마산치즈","크림치즈","그릭요거트",
    "두부","연두부","순두부","콩","검은콩","팥","강낭콩","병아리콩","렌틸콩",
    "쌀","찹쌀","현미","흑미","귀리","보리","퀴노아",
    "밀가루","강력분","중력분","박력분","튀김가루","부침가루","빵가루",
    "스파게티면","파스타면","우동면","라면사리","당면","냉면","칼국수면",
    "고추장","된장","간장","쌈장","식초","진간장","국간장","참기름","들기름",
    "식용유","올리브유","고춧가루","설탕","흑설탕","꿀","소금","후추",
    "케첩","마요네즈","머스타드","굴소스","카레가루","피시소스","고추기름",
    "스리라차","불고기양념","토마토소스","크림소스","페스토",
    "땅콩","호두","아몬드","캐슈넛","피칸","마카다미아",
    "김치","어묵","유부","낫토","순대","떡","김","다시마","멸치",
  ];

  const filteredAllergySuggestions = allIngredients.filter(
    (item) => allergyInput && item.toLowerCase().includes(allergyInput.toLowerCase())
  );
  const filteredDislikeSuggestions = allIngredients.filter(
    (item) => dislikedInput && item.toLowerCase().includes(dislikedInput.toLowerCase())
  );

  // ─── 옵션 정의 ───
  const cuisineOptions = [
    "한식", "양식", "중식", "일식",
    "동남아", "인도", "멕시칸", "지중해식", "퓨전",
  ];

  const toolCategories: Record<string, string[]> = {
    "열원": ["가스레인지", "인덕션", "핫플레이트", "전자레인지"],
    "기본 조리도구": ["냄비", "프라이팬", "오븐", "에어프라이어", "전기밥솥", "압력솥", "찜기"],
    "소형 가전": ["믹서기", "블렌더", "푸드프로세서", "핸드믹서"],
    "기타": ["그릴·석쇠", "주물냄비", "더치오븐", "토스터"],
  };

  const restrictionOptions = [
    "채식주의(베지테리언)", "비건", "페스코 채식",
    "글루텐 프리", "유당 불내증", "저염식",
    "케토·저탄고지", "당질 제한", "할랄",
  ];

  const healthConditionOptions = [
    "고혈압", "당뇨", "고지혈증", "신장 질환", "통풍",
    "다이어트 중", "임신·수유 중", "소화기 질환", "빈혈", "골다공증",
  ];

  const cookingLevelOptions = [
    { value: "초보", label: "초보", desc: "간단한 레시피 위주" },
    { value: "중급", label: "중급", desc: "기본 조리법 숙달" },
    { value: "고급", label: "고급", desc: "복잡한 요리도 가능" },
    { value: "셰프급", label: "셰프급", desc: "전문 기술 보유" },
  ];

  const servingsOptions = [
    { value: "1인", label: "1인", desc: "혼자 먹어요" },
    { value: "2인", label: "2인", desc: "2명이서" },
    { value: "3~4인", label: "3~4인", desc: "가족·소규모" },
    { value: "5인 이상", label: "5인+", desc: "대가족·모임" },
  ];

  const cookingTimeOptions = [
    { value: "20분 이내", label: "20분 이내", desc: "바쁠 때 빠르게" },
    { value: "30분 이내", label: "30분 이내", desc: "적당히 간편하게" },
    { value: "1시간 이내", label: "1시간 이내", desc: "여유 있게" },
    { value: "상관없음", label: "상관없음", desc: "시간 제한 없음" },
  ];

  // ─── 핸들러 ───
  const toggle = <K extends keyof UserProfile>(field: K, item: string) => {
    const cur = (profile[field] as string[]) ?? [];
    setProfile({
      ...profile,
      [field]: cur.includes(item) ? cur.filter((v) => v !== item) : [...cur, item],
    });
  };

  const addAllergy = (item?: string) => {
    const value = item ?? allergyInput.trim();
    if (value && !profile.allergies.includes(value)) {
      setProfile({ ...profile, allergies: [...profile.allergies, value] });
    }
    if (!item) setAllergyInput("");
  };

  const addDisliked = (item?: string) => {
    const value = item ?? dislikedInput.trim();
    if (value && !profile.dislikedIngredients.includes(value)) {
      setProfile({ ...profile, dislikedIngredients: [...profile.dislikedIngredients, value] });
    }
    if (!item) setDislikedInput("");
  };

  // ─── UI 헬퍼 ───
  const SectionTitle = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) => (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-primary">{icon}</span>
      <div>
        <p className="font-semibold text-base leading-tight">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );

  const ChipGroup = ({
    items,
    selected,
    onToggle,
  }: {
    items: string[];
    selected: string[];
    onToggle: (item: string) => void;
  }) => (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active = selected.includes(item);
        return (
          <button
            key={item}
            type="button"
            onClick={() => onToggle(item)}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              active
                ? "bg-primary text-white border-primary"
                : "bg-background hover:bg-primary/10 border-border"
            }`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );

  return (
    <div>
      <div className="max-w-2xl">
        <h1 className="mb-1 text-2xl font-bold">요리 프로필 설정</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          입력할수록 레시피 추천이 더 정확해져요. 건너뛰어도 괜찮습니다.
        </p>

        {/* ─── 요리 실력 ─── */}
        <Card className="mb-5">
          <CardHeader className="pb-3">
            <CardTitle>
              <SectionTitle
                icon={<ChefHat className="w-4 h-4" />}
                title="요리 실력"
                subtitle="맞는 난이도의 레시피를 추천해드려요"
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SingleSelectGroup
              options={cookingLevelOptions}
              value={profile.cookingLevel}
              onChange={(v) => setProfile({ ...profile, cookingLevel: v })}
            />
          </CardContent>
        </Card>

        {/* ─── 가구 인원 수 ─── */}
        <Card className="mb-5">
          <CardHeader className="pb-3">
            <CardTitle>
              <SectionTitle
                icon={<Users className="w-4 h-4" />}
                title="가구 인원 수"
                subtitle="적절한 양의 레시피를 안내해드려요"
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SingleSelectGroup
              options={servingsOptions}
              value={profile.servings}
              onChange={(v) => setProfile({ ...profile, servings: v })}
            />
          </CardContent>
        </Card>

        {/* ─── 선호 조리 시간 ─── */}
        <Card className="mb-5">
          <CardHeader className="pb-3">
            <CardTitle>
              <SectionTitle
                icon={<Clock className="w-4 h-4" />}
                title="선호 조리 시간"
                subtitle="바쁜 날도 여유 있는 날도 맞게 추천해드려요"
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SingleSelectGroup
              options={cookingTimeOptions}
              value={profile.preferredCookingTime}
              onChange={(v) => setProfile({ ...profile, preferredCookingTime: v })}
            />
          </CardContent>
        </Card>

        {/* ─── 선호 음식 ─── */}
        <Card className="mb-5">
          <CardHeader className="pb-3">
            <CardTitle>
              <SectionTitle
                icon={<Star className="w-4 h-4" />}
                title="선호 음식"
                subtitle="좋아하는 요리 종류를 모두 선택해주세요"
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {cuisineOptions.map((cuisine) => {
                const active = profile.preferredCuisines.includes(cuisine);
                return (
                  <label key={cuisine} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={active}
                      onCheckedChange={() => toggle("preferredCuisines", cuisine)}
                    />
                    <span className="text-sm">{cuisine}</span>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ─── 알러지 정보 ─── */}
        <Card className="mb-5">
          <CardHeader className="pb-3">
            <CardTitle>
              <SectionTitle
                icon={<AlertTriangle className="w-4 h-4" />}
                title="알러지 정보"
                subtitle="해당 재료는 레시피에서 반드시 제외돼요"
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ChipGroup
              items={recommendedAllergies}
              selected={profile.allergies}
              onToggle={(item) =>
                setProfile({
                  ...profile,
                  allergies: profile.allergies.includes(item)
                    ? profile.allergies.filter((a) => a !== item)
                    : [...profile.allergies, item],
                })
              }
            />

            <div className="relative">
              <div className="flex gap-2">
                <Input
                  placeholder="직접 검색 (예: 복숭아)"
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addAllergy()}
                />
                <Button variant="outline" onClick={() => addAllergy()}>추가</Button>
              </div>
              {allergyInput && filteredAllergySuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                  {filteredAllergySuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10"
                      onClick={() => { addAllergy(item); setAllergyInput(""); }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {profile.allergies.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {profile.allergies.map((item) => (
                  <Badge key={item} variant="secondary" className="gap-1 bg-red-50 text-red-700 border-red-200">
                    {item}
                    <button type="button" onClick={() => setProfile({ ...profile, allergies: profile.allergies.filter((a) => a !== item) })}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── 싫어하는 재료 ─── */}
        <Card className="mb-5">
          <CardHeader className="pb-3">
            <CardTitle>
              <SectionTitle
                icon={<ThumbsDown className="w-4 h-4" />}
                title="싫어하는 재료"
                subtitle="가능하면 대체 재료로 바꿔드려요"
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ChipGroup
              items={recommendedDislikes}
              selected={profile.dislikedIngredients}
              onToggle={(item) =>
                setProfile({
                  ...profile,
                  dislikedIngredients: profile.dislikedIngredients.includes(item)
                    ? profile.dislikedIngredients.filter((d) => d !== item)
                    : [...profile.dislikedIngredients, item],
                })
              }
            />

            <div className="relative">
              <div className="flex gap-2">
                <Input
                  placeholder="직접 검색 (예: 고수)"
                  value={dislikedInput}
                  onChange={(e) => setDislikedInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDisliked()}
                />
                <Button variant="outline" onClick={() => addDisliked()}>추가</Button>
              </div>
              {dislikedInput && filteredDislikeSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                  {filteredDislikeSuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10"
                      onClick={() => { addDisliked(item); setDislikedInput(""); }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {profile.dislikedIngredients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {profile.dislikedIngredients.map((item) => (
                  <Badge key={item} variant="outline" className="gap-1">
                    {item}
                    <button type="button" onClick={() => setProfile({ ...profile, dislikedIngredients: profile.dislikedIngredients.filter((d) => d !== item) })}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── 사용 가능한 조리도구 ─── */}
        <Card className="mb-5">
          <CardHeader className="pb-3">
            <CardTitle>
              <SectionTitle
                icon={<UtensilsCrossed className="w-4 h-4" />}
                title="사용 가능한 조리도구"
                subtitle="없는 도구가 필요한 단계는 대체 방법을 안내해드려요"
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {Object.entries(toolCategories).map(([category, tools]) => (
              <div key={category}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{category}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {tools.map((tool) => (
                    <label key={tool} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={profile.availableTools.includes(tool)}
                        onCheckedChange={() => toggle("availableTools", tool)}
                      />
                      <span className="text-sm">{tool}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ─── 식단 제한 ─── */}
        <Card className="mb-5">
          <CardHeader className="pb-3">
            <CardTitle>
              <SectionTitle
                icon={<Leaf className="w-4 h-4" />}
                title="식단 제한 사항"
                subtitle="식단 규칙에 맞는 재료와 레시피를 제안해드려요"
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {restrictionOptions.map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={profile.restrictions.includes(option)}
                    onCheckedChange={() => toggle("restrictions", option)}
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ─── 건강 상태 ─── */}
        <Card className="mb-5">
          <CardHeader className="pb-3">
            <CardTitle>
              <SectionTitle
                icon={<HeartPulse className="w-4 h-4" />}
                title="건강 상태"
                subtitle="건강 상태에 맞는 식재료와 조리법을 추천해드려요"
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {healthConditionOptions.map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={profile.healthConditions.includes(option)}
                    onCheckedChange={() => toggle("healthConditions", option)}
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ─── 버튼 ─── */}
        <div className="flex gap-3 mt-8">
          <Button variant="outline" onClick={onBack} className="flex-1">취소</Button>
          <Button onClick={() => onComplete(profile)} className="flex-1">프로필 저장</Button>
        </div>
      </div>
    </div>
  );
}
