import { useState, useEffect, useRef } from "react";
import { getPublicRecipes } from "../utils/api";
import { ChevronLeft, ChevronRight, X, Sparkles, ChefHat, Refrigerator, Mic, BookOpen, Home, UtensilsCrossed, Bot, User, Search, Bell, TrendingUp, Heart, Plus, CookingPot, Pizza, Utensils, Fish, Users, Calendar, Clock, Flame, Salad, Soup, StarHalf, Star, CakeSlice, Snowflake, Apple } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";



interface OnboardingGuideProps {
  onComplete: () => void;
  onSkip: () => void;
}

const onboardingSlides = [
  {
    id: 1,
    type: "welcome",
    title: "환영합니다!",
    subtitle: "비밀(B-Meal)",
    descriptionTop: "요리를 시작하는 순간부터 끝까지,\nAI가 당신의 요리를 편하게 도와드려요",
    descriptionBottom: "검색·음성가이드·재료 관리까지\n한 곳에서 사용할 수 있어요"
  },
  {
    id: 2,
    type: "home",
    title: "홈 화면",
    description: "홈 화면에서 원하는 기능을 선택하고\n오늘의 요리를 시작해보세요",
  },
  {
    id: 3,
    type: "recipe",
    title: "레시피 탐색",
    description: "먹고 싶은 레시피를 검색하고\n마음에 드는 요리를 저장해보세요",
  },
  {
    id: 4,
    type: "profile",
    title: "맞춤 프로필 설정",
    description: "취향과 알러지, 식단 제한 정보를 설정해\n나에게 꼭 맞는 레시피를 받아보세요",
  },
  {
    id: 5,
    type: "ai",
    title: "AI 음성 가이드",
    description: "음성으로 조리 단계을 알려드려요\n궁금한 부분도 바로바로 설명해드릴게요",
  },
  {
    id: 6,
    type: "ingredients",
    title: "냉장고 관리",
    description: "냉장고 속 재료를 정리해두면\n더 정확한 맞춤 레시피를 추천해드려요",
  }
];

export function OnboardingGuide({ onComplete, onSkip }: OnboardingGuideProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const handleNext = () => {
    if (currentSlide < onboardingSlides.length - 1) {
      setDirection(1);
      setCurrentSlide(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleDotClick = (index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 400 : -400,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -400 : 400,
      opacity: 0,
    }),
  };

  const currentSlideData = onboardingSlides[currentSlide];

  return (
    <div className="fixed inset-0 z-50 bg-background px-3 py-4">
      <div className="absolute top-4 right-4 z-50">
        <Button
          onClick={onSkip}
          size="sm"
          className="h-9 px-3 rounded-full bg-primary text-white hover:bg-primary/90 shadow-md text-xs"
        >
          건너뛰기
        </Button>
      </div>

      {/* 핸드폰 화면 컨테이너 */}
      <div className="h-full max-w-[420px] mx-auto flex flex-col items-center justify-center bg-background px-4 pt-6 pb-4">
        {/* 제목 */}
        <div className="text-center mb-4 mt-4">
          <h2 className="text-2xl text-foreground mb-2">
            {currentSlideData.title}
          </h2>

          {/* 0번 슬라이드(웰컴)일 때는 descriptionTop 사용, 그 외에는 description 사용 */}
          {currentSlide === 0 ? (
            currentSlideData.descriptionTop && (
              <p className="text-muted-foreground whitespace-pre-line">
                {currentSlideData.descriptionTop}
              </p>
            )
          ) : (
            currentSlideData.description && (
              <p className="text-muted-foreground whitespace-pre-line">
                {currentSlideData.description}
              </p>
            )
          )}
        </div>


        {/* 핸드폰 목업 */}
        <div className="w-full max-w-[380px] mx-auto mb-6">
          {/* 슬라이드 컨텐츠 */}
          <div className="relative rounded-3xl overflow-hidden bg-background" style={{
            // 화면이 클 땐 650px까지, 작을 땐 화면 높이의 70%까지만
            height: 'min(620px, 70vh)',
            boxShadow: '0 20px 60px rgba(70, 89, 64, 0.3), 0 0 0 1px rgba(70, 89, 64, 0.1)',
            border: '8px solid #2D2D2D'
          }}>
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={currentSlide}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                className="absolute inset-0"
              >
                {currentSlideData.type === "welcome" && (
                  <WelcomeScreen data={currentSlideData} />
                )}
                {currentSlideData.type === "home" && (
                  <HomeScreen />
                )}
                {currentSlideData.type === "recipe" && (
                  <RecipeScreen />
                )}
                {currentSlideData.type === "profile" && (
                  <ProfileScreen />
                )}
                {currentSlideData.type === "ai" && (
                  <AIScreen />
                )}
                {currentSlideData.type === "ingredients" && (
                  <IngredientsScreen />
                )}
              </motion.div>
            </AnimatePresence>

            {/* 노치 */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#2D2D2D] rounded-b-2xl z-50" />
          </div>
        </div>

        {/* 하단 네비게이션 */}
        <div className="w-full max-w-md space-y-6">
          {/* 인디케이터 */}
          <div className="flex justify-center gap-2">
            {onboardingSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === currentSlide
                    ? 'w-10 h-2.5 bg-primary'
                    : 'w-2.5 h-2.5 bg-border hover:bg-primary/50'
                }`}
              />
            ))}
          </div>

          {/* 네비게이션 버튼 */}
          <div className="flex gap-3 px-4">
            {currentSlide > 0 && (
              <Button
                variant="outline"
                onClick={handlePrev}
                className="flex-1 h-11 text-sm"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                이전
              </Button>
            )}
            
            <Button
            onClick={handleNext}
            className={`h-11 text-sm ${
              currentSlide > 0 ? "flex-1" : "w-full"
            }`}
            style={{
              background: "linear-gradient(135deg, #465940 0%, #5a6b4e 100%)",
              boxShadow:
                "0 4px 6px rgba(70, 89, 64, 0.3), 0 8px 16px rgba(70, 89, 64, 0.15)",
            }}
          >
            {currentSlide === onboardingSlides.length - 1 ? (
              <>
                {/* AI 아바타 모양 */}
                <span className="mr-2 inline-flex items-center justify-center w-4 h-6 rounded-full bg-white/15">
                  <Bot className="w-6 h-6 text-white" />
                </span>
                시작하기
              </>
            ) : (
              <>
                다음
                <ChevronRight className="w-5 h-5 ml-1" />
              </>
            )}
          </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 환영 화면
function WelcomeScreen({ data }: any) {
  const bottomText = data.descriptionBottom ?? data.description;
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 bg-background">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="w-28 h-28 rounded-3xl flex items-center justify-center mb-8"
        style={{
          background: 'linear-gradient(135deg, #465940 0%, #5a6b4e 100%)',
          boxShadow: '0 8px 20px rgba(70, 89, 64, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}
      >
        <ChefHat className="w-14 h-14 text-white" style={{
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4))'
        }} />
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="text-3xl text-foreground mb-3 text-center"
      >
        {data.subtitle}
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="text-muted-foreground text-center whitespace-pre-line mb-12"
      >
        {bottomText}
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="flex gap-6 mt-6"
      >
        {[
          { icon: BookOpen, label: "레시피", color: "#465940" },
          { icon: Mic, label: "AI 가이드", color: "#5a6b4e" },
          { icon: Refrigerator, label: "냉장고", color: "#6a7d5e" }
        ].map((item, index) => (
          <div key={index} className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #e8f2dd 0%, #d4e5c8 100%)',
              boxShadow: '0 2px 4px rgba(106, 125, 94, 0.15), inset 0 -1px 2px rgba(106, 125, 94, 0.1)'
            }}>
              <item.icon className="w-7 h-7" style={{ color: item.color }} />
            </div>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// 홈 화면 목업
function HomeScreen() {
  return (
    <div className="h-full bg-background pt-8 pb-16 px-4 overflow-hidden">
      {/* 환영 메시지 카드 */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-4 bg-card rounded-2xl p-4 relative"
        style={{
          boxShadow: "var(--shadow-3d-md)",
          border: "1px solid rgba(70, 89, 64, 0.15)",
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 rounded-t-2xl" />
        <h3 className="text-foreground mb-0.5">안녕하세요!</h3>
        <p className="text-sm text-muted-foreground">
          오늘은 어떤 요리를 해볼까요?
        </p>
      </motion.div>

      {/* AI 음성 가이드 버튼 */}
      <motion.button
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full rounded-2xl p-4 flex items-center gap-3 mb-3 relative"
        style={{
          background: "linear-gradient(135deg, #465940 0%, #5a6b4e 100%)",
          boxShadow:
            "0 6px 12px rgba(70, 89, 64, 0.25), 0 12px 24px rgba(70, 89, 64, 0.15)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 relative"
          style={{
            background: "rgba(255, 255, 255, 0.15)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Mic className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 text-left relative z-10">
          <h4 className="text-white text-sm mb-0.5">AI 음성 가이드</h4>
          <p className="text-xs text-white/80">실시간으로 요리를 도와드려요</p>
        </div>
        <Sparkles className="w-4 h-4 text-white/60 relative z-10" />
      </motion.button>

      {/* 식재료 / 커뮤니티 카드 */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 gap-2 mb-4"
      >
        <div
          className="bg-card rounded-2xl p-3"
          style={{
            boxShadow: "0 4px 8px rgba(70, 89, 64, 0.12)",
            border: "1px solid rgba(70, 89, 64, 0.15)",
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
            style={{
              background: "linear-gradient(135deg, #e8f2dd 0%, #d4e5c8 100%)",
            }}
          >
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          <h4 className="text-foreground text-xs mb-0.5">식재료</h4>
          <p className="text-[10px] text-muted-foreground">냉장고 관리</p>
        </div>

        <div
          className="bg-card rounded-2xl p-3"
          style={{
            boxShadow: "0 4px 8px rgba(70, 89, 64, 0.12)",
            border: "1px solid rgba(70, 89, 64, 0.15)",
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
            style={{
              background: "linear-gradient(135deg, #e8f2dd 0%, #d4e5c8 100%)",
            }}
          >
            <Users className="w-4 h-4 text-primary" />
          </div>
          <h4 className="text-foreground text-xs mb-0.5">커뮤니티</h4>
          <p className="text-[10px] text-muted-foreground">레시피 공유</p>
        </div>
      </motion.div>

      {/* 카테고리 */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-foreground">카테고리</h3>
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>

        <div className="grid grid-cols-5 gap-2">
          {[
            { icon: CookingPot, name: "한식" },
            { icon: Pizza, name: "양식" },
            { icon: Utensils, name: "중식" },
            { icon: Fish, name: "일식" },
            { icon: ChefHat, name: "기타" },
          ].map((cat, idx) => (
            <div
              key={idx}
              className="bg-card rounded-xl p-2"
              style={{
                boxShadow: "0 3px 6px rgba(70, 89, 64, 0.1)",
                border: "1px solid rgba(70, 89, 64, 0.12)",
              }}
            >
              <div className="w-full aspect-square flex items-center justify-center mb-1.5 relative">
                <div className="absolute inset-0 bg-primary/5 rounded-lg" />
                <cat.icon className="w-5 h-5 text-primary relative z-10" />
              </div>
              <span className="text-[10px] text-foreground text-center block">
                {cat.name}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}


// 레시피 화면
function RecipeScreen() {
  type RecipePreview = {
    id: string;
    name: string;
    category: string | null;
    cooking_method: string | null;
    hashtags: string | null;
    ingredients_count: number;
    image?: string | null;
  };

  const [recipes, setRecipes] = useState<RecipePreview[]>([]);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await getPublicRecipes({ limit: 4, offset: 0 });
        setRecipes(res.recipes || []);
      } catch (e) {
        console.error("Recipe preview error:", e);
      }
    };
    fetchPreview();
  }, []);

  const CATEGORY_LIST = [
    { name: "전체", icon: Soup },
    { name: "반찬", icon: UtensilsCrossed },
    { name: "국&찌개", icon: CookingPot },
    { name: "일품", icon: Salad },
    { name: "밥", icon: Utensils },
    { name: "후식", icon: CakeSlice },
    { name: "기타", icon: Star },
  ];

  const fallbackRecipes: RecipePreview[] = [
    {
      id: "1",
      name: "김치찌개",
      category: "국&찌개",
      cooking_method: "끓이기",
      hashtags: "매콤,칼칼함",
      ingredients_count: 8,
      image: null,
    },
    {
      id: "2",
      name: "계란말이",
      category: "반찬",
      cooking_method: "지지기",
      hashtags: "간단요리",
      ingredients_count: 5,
      image: null,
    },
  ];

  const display = recipes.length > 0 ? recipes : fallbackRecipes;

  return (
    <div className="h-full bg-background overflow-hidden flex justify-center">
      {/* 🔹 상단 여백은 그대로, 안쪽 요소들만 간격 조정 */}
      <div className="w-full max-w-[360px] pt-4 pb-6 px-4">
        {/* 레시피 목록 타이틀 - 아래 여백 넉넉하게 */}
        <motion.h2
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-lg font-semibold mb-2"
        >
          레시피 목록
        </motion.h2>

        {/* 카테고리 - 위아래 조금 숨 쉬게 */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide"
        >
          {CATEGORY_LIST.map((cat, idx) => (
            <div
              key={idx}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm bg-card border flex items-center gap-1"
              style={{
                border: "1px solid rgba(70, 89, 64, 0.2)",
                boxShadow: "0 2px 4px rgba(70, 89, 64, 0.08)",
              }}
            >
              <cat.icon className="w-4 h-4" />
              <span className="text-xs">{cat.name}</span>
            </div>
          ))}
        </motion.div>

        {/* 검색창 - 세로 길이 더 줄이고, 아래 여백도 넉넉하게 */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl px-3 py-1 flex items-center gap-2 mb-4"
          style={{
            background: "linear-gradient(135deg, #f5f3e8 0%, #ffffff 100%)",
            boxShadow: "0 4px 10px rgba(70, 89, 64, 0.12)",
            border: "1px solid rgba(70, 89, 64, 0.2)",
          }}
        >
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #e8f2dd 0%, #d4e5c8 100%)",
              boxShadow:
                "0 2px 4px rgba(70, 89, 64, 0.15), inset 0 -1px 2px rgba(70, 89, 64, 0.1)",
            }}
          >
            <Search className="w-4 h-4 text-[#465940]" />
          </div>
          <input
            type="text"
            disabled
            placeholder="레시피 검색 (이름)"
            className="flex-1 outline-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground"
          />
        </motion.div>

        {/* 레시피 카드 영역 - 여기는 이전 디자인 그대로 */}
        <div className="grid grid-cols-2 gap-4 pb-16">
          {display.map((recipe, idx) => (
            <div
              key={idx}
              className="border rounded-xl p-3 bg-white shadow-md flex flex-col"
              style={{
                border: "1px solid rgba(70, 89, 64, 0.15)",
              }}
            >
              {/* 이미지 */}
              <div
                className="w-full rounded-lg overflow-hidden mb-3"
                style={{
                  height: "95px",
                  backgroundColor: "#f3f3f3",
                }}
              >
                {recipe.image && (
                  <img
                    src={recipe.image}
                    alt={recipe.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* 텍스트 영역 */}
              <h3 className="text-sm font-semibold mb-1 truncate text-foreground">
                {recipe.name}
              </h3>

              <div className="flex items-center justify-between mb-1">
                <span
                  className="inline-block px-2 py-1 rounded-full text-[10px] font-semibold text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, #465940 0%, #5a6b4e 100%)",
                    boxShadow: "0 2px 4px rgba(70, 89, 64, 0.25)",
                  }}
                >
                  {recipe.category || "카테고리 없음"}
                </span>
              </div>

              <p className="text-xs text-muted-foreground truncate">
                조리법: {recipe.cooking_method || "정보 없음"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {recipe.hashtags
                  ? `#${recipe.hashtags
                      .split(",")
                      .map((t) => t.trim())
                      .join(" #")}`
                  : ""}
              </p>
              <p className="text-xs font-bold text-[#465940] mt-1">
                재료 {recipe.ingredients_count}개
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 프로필 설정 화면
function ProfileScreen() {
  // 실제 ProfileSetup.tsx의 옵션 이름만 그대로 가져와서 보여주는 "목업" 화면
  const cuisineOptions = [
  { label: "한식", checked: false },
  { label: "양식", checked: true },  // ✅ 체크된 예시
  { label: "중식", checked: false },
  { label: "일식", checked: true },  // ✅ 체크된 예시
  { label: "기타", checked: false },
  ];
  const recommendedAllergies = ["땅콩", "우유", "계란", "밀", "새우", "게"];
  const recommendedDislikes = ["고수", "파", "양파", "마늘", "버섯"];
  const restrictionOptions = ["채식", "비건", "저염식", "글루텐 프리"];
  const healthOptions = ["고혈압", "당뇨", "고지혈증", "신장 질환", "통풍"];

  return (
    <div className="h-full bg-background px-4 pt-8 pb-6 overflow-hidden">
      <div className="max-w-[360px] mx-auto h-full flex flex-col">
        {/* 상단 제목/설명 */}
        <motion.div
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 mb-2">
            <User className="w-4 h-4 text-primary" />
            <span className="text-[11px] text-primary font-medium">
              요리 프로필 설정
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            선호 음식, 알러지, 사용 가능한 조리도구를 등록하면
            <br />
            홈·레시피 화면에서 맞춤형 추천이 적용돼요.
          </p>
        </motion.div>

        {/* 1. 선호 음식 섹션 */}
        <motion.div
          initial={{ y: -6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.18 }}
          className="mb-2 rounded-2xl bg-card border px-3 py-1.5"
          style={{
            borderColor: "rgba(70, 89, 64, 0.16)",
            boxShadow: "0 2px 6px rgba(70, 89, 64, 0.08)",
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-foreground">
              선호 음식
            </span>
            <CookingPot className="w-3.5 h-3.5 text-primary" />
          </div>

          {/* 설명 글자도 살짝만 줄이고 줄간격도 타이트하게 */}
          <p className="text-[11px] text-muted-foreground leading-tight">
            자주 먹는 음식 종류를 선택해 주세요.
          </p>

          {/* ✅ 체크박스 영역 – 세로 여백 줄이기 */}
          <div className="mt-2 grid grid-cols-2 gap-y-1.5 gap-x-10">
            {["한식", "양식", "중식", "일식", "기타"].map((label) => (
              <label
                key={label}
                className="flex items-center gap-2 text-[12px] text-foreground"
              >
                <Checkbox
                  checked={label === "양식" || label === "일식"} // 목업용 예시
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </motion.div>
        

        {/* 2. 알러지 + 싫어하는 재료 요약 */}
        <motion.div
          initial={{ y: -2, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.26 }}
          className="mb-3 rounded-2xl bg-card border px-4 py-3 space-y-3"
          style={{
            borderColor: "rgba(70, 89, 64, 0.16)",
            boxShadow: "0 4px 10px rgba(70, 89, 64, 0.08)",
          }}
        >
          {/* 알러지 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground">
                알러지 정보
              </span>
              <Heart className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {recommendedAllergies.map((item, idx) => {
                const isSelected = idx > 3; // 목업용으로 앞의 두 개만 '선택된' 상태

                return (
                  <span
                    key={item}
                    className="px-2 py-1 rounded-full text-[10px] border"
                    style={
                      isSelected
                        ? {
                            // ✅ 선택된 태그: 레시피 카테고리랑 같은 진한 초록 그라데이션
                            background:
                              "linear-gradient(135deg, #465940 0%, #5a6b4e 100%)",
                            color: "#ffffff",
                            borderColor: "rgba(70, 89, 64, 0.9)",
                            boxShadow: "0 2px 4px rgba(70, 89, 64, 0.35)",
                          }
                        : {
                            // 기본(비선택) 태그
                            background: "#f9faf3",
                            color: "#465940",
                            borderColor: "rgba(70, 89, 64, 0.25)",
                          }
                    }
                  >
                    {item}
                  </span>
                );
              })}
            </div>
            {/* 검색 인풋 모양만 보여주기 (비활성) */}
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-background border border-dashed border-primary/30">
              <Input
                disabled
                value=""
                placeholder="예: 새우, 우유 · 알러지 재료를 검색해 추가"
                className="h-6 border-0 bg-transparent p-0 text-[10px] placeholder:text-muted-foreground"
              />
            </div>
          </div>


          {/* 싫어하는 재료 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground">
                싫어하는 재료
              </span>
              <Salad className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {recommendedDislikes.map((item, idx) => {
                const isSelected = idx < 2; // 목업용 선택 상태

                return (
                  <span
                    key={item}
                    className="px-2 py-1 rounded-full text-[10px] border"
                    style={
                      isSelected
                        ? {
                            // ✅ 선택된 태그: 진한 초록 그라데이션
                            background:
                              "linear-gradient(135deg, #465940 0%, #5a6b4e 100%)",
                            color: "#ffffff",
                            borderColor: "rgba(70, 89, 64, 0.9)",
                            boxShadow: "0 2px 4px rgba(70, 89, 64, 0.35)",
                          }
                        : {
                            // 비선택 태그
                            background: "#f9faf3",
                            color: "#465940",
                            borderColor: "rgba(70, 89, 64, 0.25)",
                          }
                    }
                  >
                    {item}
                  </span>
                );
              })}
            </div>
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-background border border-dashed border-primary/30">
              <Input
                disabled
                value=""
                placeholder="예: 고수, 파 · 제외하고 싶은 재료를 입력"
                className="h-6 border-0 bg-transparent p-0 text-[10px] placeholder:text-muted-foreground"
              />
            </div>
          </div>

        </motion.div>

        {/* 3. 식단 제한 / 건강 상태 선택 */}
        <motion.div
          initial={{ y: 4, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.34 }}
          className="rounded-2xl bg-card border px-3 py-2"
          style={{ borderColor: "rgba(70, 89, 64, 0.2)" }}
        >

            {/* 제목 + 아이콘 (다른 카드들과 동일한 정렬) */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-foreground">
                식단 제한 · 건강 상태
              </span>
              <Soup className="w-3.5 h-3.5 text-primary" />
            </div>

            {/* 설명 문구 */}
            <p className="text-[10px] text-muted-foreground leading-tight max-w-[240px] mb-2">
              식단 스타일과 건강 상태를 선택하면 레시피 재료와 간을 자동으로
              조절해 드려요.
            </p>


          {/* 식단 제한 체크박스 */}
          <div className="mb-2">
            <p className="text-[10px] text-muted-foreground mb-1">식단 제한</p>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-8">
              {restrictionOptions.map((label) => (
                <label
                  key={label}
                  className="flex items-center gap-2 text-[13px] text-foreground"
                >
                  {/* 실제 화면이랑 똑같이: className 안 건드리고 disabled만 */}
                  <Checkbox
                    checked={label === "저염식" || label === "비건"} // 목업용 예시
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 건강 상태 체크박스 */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">건강 상태</p>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-8">
              {healthOptions.map((label) => (
                <label
                  key={label}
                  className="flex items-center gap-2 text-[13px] text-foreground"
                >
                  <Checkbox
                    checked={label === "고혈압" || label === "당뇨"} // 목업용 예시
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <p className="mt-2 text-[10px] text-[#465940]">
            프로필은 언제든지 마이페이지에서 수정할 수 있어요.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

// AI 화면
function AIScreen() {
  const chatRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;

    // 처음엔 맨 위로 고정
    el.scrollTop = 0;

    // 레이아웃 잡히고 나서 스크롤 시작 (살짝 딜레이)
    const startTimer = setTimeout(() => {
      const start = performance.now();
      const duration = 10000; // 🔹 10초 동안 천천히 스크롤
      const startScrollTop = 0;
      const target = el.scrollHeight - el.clientHeight; // 맨 아래까지

      const step = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1); // 0 ~ 1
        // 부드러운 easing (천천히 출발해서 천천히 멈추게)
        const eased = 1 - Math.pow(1 - progress, 3);

        el.scrollTop = startScrollTop + target * eased;

        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };

      requestAnimationFrame(step);
    },1500);

    return () => {
      clearTimeout(startTimer);
    };
  }, []);

  return (
    <div
      className="h-full relative overflow-hidden"
      style={{
        background: "#F7F6EE",
      }}
    >
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-40 h-40 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-20 right-10 w-60 h-60 rounded-full bg-white blur-3xl" />
      </div>

      <div className="relative z-10 pt-12 pb-4 px-4 h-full flex flex-col">
        {/* AI 아바타 */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="flex justify-center mb-6 relative"
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center relative"
            style={{
              background: "linear-gradient(135deg, #e8f2dd 0%, #d4e5c8 100%)",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
            }}
          >
            <Bot className="w-12 h-12 text-primary" />
          </div>
        </motion.div>

        {/* 🔥 채팅 영역: 자동 스크롤 + 수동 스크롤 막기 */}
        <motion.div
          ref={chatRef}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-4 mb-6 px-2 flex-1 overflow-hidden pointer-events-none"
        >
          {/* user 메시지 1 */}
          <div className="flex items-start justify-end gap-2">
            <div className="max-w-[75%] flex justify-end">
              <div className="inline-block rounded-2xl rounded-br-sm bg-[#FEE500] px-4 py-3 text-sm text-black shadow-sm whitespace-pre-line">
                나 대파가 없어
              </div>
            </div>

            <div className="w-7 h-7 rounded-full bg-[#FEE500] flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-black" />
            </div>
          </div>

          {/* assistant 메시지 1 */}
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-[#DDE4D3] flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>

            <div className="max-w-[75%]">
              <div className="inline-block rounded-2xl rounded-bl-sm bg-white border border-gray-200 px-4 py-3 text-sm text-foreground shadow-sm whitespace-pre-line">
                대파가 없다면 아래의 대체재료 중에서 선택하실 수 있어요:{"\n"}
                - 쪽파{"\n"}
                - 부추{"\n"}
                {"\n"}
                1) 대체재료로 바꾸기{"\n"}
                2) 해당 재료 없이 만들기{"\n"}
              </div>
            </div>
          </div>

          {/* user 메시지 2 */}
          <div className="flex items-start justify-end gap-2">
            <div className="max-w-[75%] flex justify-end">
              <div className="inline-block rounded-2xl rounded-br-sm bg-[#FEE500] px-4 py-3 text-sm text-black shadow-sm whitespace-pre-line">
                쪽파로 대체해줘
              </div>
            </div>

            <div className="w-7 h-7 rounded-full bg-[#FEE500] flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-black" />
            </div>
          </div>

          {/* assistant 메시지 2 */}
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-[#DDE4D3] flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>

            <div className="max-w-[75%]">
              <div className="inline-block rounded-2xl rounded-bl-sm bg-white border border-gray-200 px-4 py-3 text-sm text-foreground shadow-sm whitespace-pre-line">
                대파를 쪽파로 대체했어요!{"\n"}
                레시피를 업데이트했습니다.{"\n"}
                {"\n"}
                김치볶음밥 재료 목록입니다:{"\n"}
                • 묵은 김치 200g{"\n"}
                • 밥 2공기{"\n"}
                • 쪽파 1대{"\n"}
                • 양파 1개(약 100g){"\n"}
                • 식용유 2큰술{"\n"}
                • 고춧가루 1큰술{"\n"}
                • 간장 1큰술{"\n"}
                • 후춧가루 약간{"\n"}
                • 참기름 1큰술{"\n"}
                • 계란 2개{"\n"}
                {"\n"}
                빠진 재료가 있으면 말해주세요!
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


// 냉장고 화면 (Onboarding 전용)
function IngredientsScreen() {
  const locations = [
    { name: "냉장실", icon: ChefHat,   count: "5개" },
    { name: "냉동실", icon: Snowflake, count: "3개" },
    { name: "실온",   icon: Apple,     count: "4개" },
  ];

  return (
    <div className="h-full bg-background px-4 pt-6 pb-6 overflow-hidden">
      <div className="max-w-[340px] mx-auto h-full flex flex-col">
        {/* 제목 영역 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            식재료 관리
          </h3>
          <p className="text-[11px] text-muted-foreground">
            보관 위치를 선택해 식재료를 관리하세요
          </p>
        </div>

        {/* 상단 버튼 - 오른쪽 정렬 + 4:6 비율, 가로 넉넉 / 세로 낮춤 */}
        <motion.div
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mb-3 flex justify-end"
        >
          <div className="flex gap-2 w-[280px]">
            {/* 40% */}
            <button className="flex-[4] inline-flex items-center justify-center rounded-lg bg-primary text-white text-[11px] px-3 py-2 shadow-sm">
              <Plus className="w-3.5 h-3.5 mr-1" />
              식재료 추가
            </button>
            {/* 60% */}
            <button className="flex-[6] inline-flex items-center justify-center rounded-lg border text-[11px] px-3 py-2 bg-card text-foreground">
              영수증으로 자동 추가
            </button>
          </div>
        </motion.div>

        {/* 위치 카드 리스트 */}
        <motion.div
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex flex-col gap-2.5 mb-3"
        >
          {locations.map((loc) => {
            const Icon = loc.icon;
            return (
              <div
                key={loc.name}
                className="rounded-xl border bg-card py-3 px-3 flex items-center gap-3 shadow-sm"
                style={{ borderColor: "rgba(70, 89, 64, 0.15)" }}
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4.5 h-4.5 text-primary" />
                </div>

                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {loc.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      보관 중 {loc.count}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* 하단 설명 카드 - 자연스럽게 더 강조된 스타일 */}
        <motion.div
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-2 rounded-xl border px-4 py-3 text-[11px] leading-relaxed text-[#465940] shadow-md"
          style={{
            background: "rgba(70, 89, 64, 0.07)",  // 조금 더 진한 배경
            borderColor: "rgba(70, 89, 64, 0.28)", // 테두리 강조
          }}
        >
          <span className="font-semibold text-[#3b4a36]">
          ❗️식재료는{" "}
          수동 입력 또는 영수증 촬영으로 간편하게 등록할 수 있어요.</span>
        </motion.div>
      </div>
    </div>
  );
}