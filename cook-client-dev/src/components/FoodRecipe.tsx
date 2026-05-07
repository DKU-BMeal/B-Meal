import { useEffect, useState } from "react";
// [수정] useParams, useNavigate 대신 Prop 기반으로 변경
import { getFullRecipeDetail } from "../utils/api";
import { Button } from "../components/ui/button"; // button 컴포넌트가 있다고 가정합니다.
import { Loader2, Zap } from "lucide-react"; // 아이콘 컴포넌트가 있다고 가정합니다.

// 백엔드의 GET /recipes/full/:id API 응답에 맞춰 타입 정의
interface Step {
    step: number;
    text: string;
    image: string | null;
}

export interface FullRecipe {
    id: string;
    name: string;
    category: string | null;
    cooking_method: string | null;
    image_small: string | null;
    image_large: string | null;
    info_weight: string | null;  // 중량(1인분)
    calories: string | null;     // 열량
    carbs: string | null;        // 탄수화물
    protein: string | null;      // 단백질
    fat: string | null;          // 지방
    sodium: string | null;       // 나트륨
    hashtags: string | null;
    ingredients_details: string | null; // 재료정보
    sodium_tip: string | null;    // 저감 조리법 TIP
    steps: Step[];
}

interface FoodRecipeProps {
    // [수정] App.tsx에서 ID를 Prop으로 받습니다.
    recipeId: string;
    // AI 요리보조 페이지로 레시피 데이터를 가지고 이동하는 함수를 prop으로 받습니다.
    onStartCookingAssistant: (recipe: FullRecipe) => void;
    // 오류 처리나 취소 시 이전 페이지로 돌아가기 위한 Prop 추가
    onBack: () => void;
}

// [수정] props에 recipeId와 onBack 추가
export function FoodRecipe({ recipeId, onStartCookingAssistant, onBack }: FoodRecipeProps) {
    
    // useParams 제거
    const id = recipeId; 
    
    const [recipe, setRecipe] = useState<FullRecipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setError("레시피 ID가 유효하지 않습니다.");
            setLoading(false);
            return;
        }

        const fetchRecipe = async () => {
            try {
                setLoading(true);
                // 새로 구현한 전체 레시피 조회 API 호출
                const fullRecipe = await getFullRecipeDetail(id);
                setRecipe(fullRecipe);
            } catch (err: any) {
                setError(err.message || "레시피 상세 정보를 불러오는 데 실패했습니다.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchRecipe();
    }, [id]);

    // 🔹 재료 문자열(ingredients_details)을 줄 단위 배열로 파싱하는 함수
function parseIngredients(details: string | null): string[] {
  if (!details) return [];
  return details
    .split(/\r?\n/)                      // 줄 단위로 자르고
    .map((line) => line.trim())         // 앞뒤 공백 제거
    .filter((line) => line.length > 0)  // 빈 줄 제거
    .map((line) => {
      // 불릿 기호(· • - *) 있으면 제거
      return line.replace(/^[·•\-\*]\s*/, "");
    });
}

const handleStartAssistant = () => {
  if (!recipe) return;

  // 🔹 VoiceAssistant 에서 바로 쓸 수 있는 형태로 변환해서 넘겨줌
  const fullIngredients = parseIngredients(recipe.ingredients_details);

  const aiRecipe = {
    // VoiceAssistant 의 Recipe 타입에 맞추기
    id: recipe.id,
    name: recipe.name,
    recipeName: recipe.name,
    image: recipe.image_large || recipe.image_small,
    category: recipe.category,

    source: "db",               // 이 레시피는 DB에서 온 레시피다
    isMutable: true,            // GPT가 자유롭게 변경 가능한 레시피다
    originalIngredients: fullIngredients, // 원본 재료 백업


    // 문자열 배열 (재료 전체 문장)
    fullIngredients,                        

    // name + amount 로 쪼개기 어려우면 우선 name 에만 넣어도 됨
    ingredients: fullIngredients.map((line) => ({
      name: line,
      amount: "",
    })),

    // 조리순서는 text 만 뽑아서 문자열 배열로
    steps: recipe.steps.map((s) => s.text),
  };

  onStartCookingAssistant(aiRecipe as any);
};


    if (loading) {
        return (
            <div className="py-16 text-center text-gray-500">
                <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4" />
                <p>레시피를 불러오는 중입니다...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-16 text-center text-red-500">
                <h2 className="text-xl font-bold mb-4">오류 발생</h2>
                <p>{error}</p>
                {/* [수정] onBack prop 사용 */}
                <Button onClick={onBack} className="mt-4">이전으로 돌아가기</Button> 
            </div>
        );
    }

    if (!recipe) {
        return (
            <div className="py-16 text-center text-gray-500">
                <p>해당 레시피를 찾을 수 없습니다.</p>
                {/* [수정] onBack prop 사용 */}
                <Button onClick={onBack} className="mt-4">이전으로 돌아가기</Button>
            </div>
        );
    }

    // 빈 값 처리 헬퍼 함수
    const renderValue = (value: string | number | null | undefined, unit: string = '') => {
        return value ? `${value}${unit}` : '정보 없음';
    };

    return (
        <div className="relative max-w-3xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden">

            
            {/* ✅ 상단 타이틀 + AI 버튼 */}
            <div className="flex justify-between items-center mb-6">
                <h1
                className="text-3xl font-extrabold"
                style={{
                    background: "linear-gradient(135deg, #465940 0%, #5a6b4e 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                }}
                >
                {recipe.name}
                </h1>

                <Button
                onClick={handleStartAssistant}
                className="text-white font-bold py-2 px-4 rounded-full shadow-lg transition-transform hover:scale-105"
                style={{
                    background: "linear-gradient(135deg, #465940 0%, #5a6b4e 100%)",
                    boxShadow: "0 6px 14px rgba(70, 89, 64, 0.35)",
                }}
                >
                <Zap className="h-5 w-5 mr-2" />
                AI 요리보조 시작
                </Button>
            </div>

            {/* ✅ 메인 이미지 */}
            {recipe.image_large && (
                <div className="w-full h-80 bg-gray-100 rounded-2xl overflow-hidden mb-6 shadow-md">
                <img
                    src={recipe.image_large}
                    alt={recipe.name}
                    className="w-full h-full object-cover"
                />
                </div>
            )}

            <div className="space-y-8">

                {/* ✅ 레시피 개요 */}
                <section className="p-4 border-b">
                <h2 className="text-xl font-bold mb-3 text-[#465940]">개요</h2>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                    <div><span className="font-semibold text-[#465940]">카테고리:</span> {renderValue(recipe.category)}</div>
                    <div><span className="font-semibold text-[#465940]">조리 방법:</span> {renderValue(recipe.cooking_method)}</div>
                    <div className="col-span-2">
                    <span className="font-semibold text-[#465940]">해시태그:</span>{" "}
                    {renderValue(recipe.hashtags, "")
                        .split(",")
                        .map(tag => tag.trim())
                        .filter(tag => tag)
                        .join(", ")}
                    </div>
                </div>
                </section>

                {/* ✅ 영양 정보 */}
                <section className="p-4 border-b">
                <h2 className="text-xl font-bold mb-3 text-[#465940]">영양 정보 (1인분)</h2>
                <div className="grid grid-cols-3 gap-4 text-sm text-gray-700">
                    <div><span className="font-semibold text-[#465940]">중량:</span> {renderValue(recipe.info_weight)}</div>
                    <div><span className="font-semibold text-[#465940]">열량:</span> {renderValue(recipe.calories, "kcal")}</div>
                    <div><span className="font-semibold text-[#465940]">탄수화물:</span> {renderValue(recipe.carbs, "g")}</div>
                    <div><span className="font-semibold text-[#465940]">단백질:</span> {renderValue(recipe.protein, "g")}</div>
                    <div><span className="font-semibold text-[#465940]">지방:</span> {renderValue(recipe.fat, "g")}</div>
                    <div><span className="font-semibold text-[#465940]">나트륨:</span> {renderValue(recipe.sodium, "mg")}</div>
                </div>
                </section>

                {/* ✅ 재료 정보 */}
                <section className="p-4 border-b">
                <h2 className="text-xl font-bold mb-3 text-[#465940]">재료</h2>
                <p className="whitespace-pre-wrap text-gray-700">
                    {renderValue(recipe.ingredients_details, "재료 정보가 없습니다.")}
                </p>
                </section>

                {/* ✅ 조리 순서 */}
                <section className="p-4">
                <h2 className="text-xl font-bold mb-4 text-[#465940]">조리 순서</h2>
                <ol className="space-y-6">
                    {recipe.steps.length > 0 ? (
                    recipe.steps.map((step) => (
                        <li
                        key={step.step}
                        className="p-4 rounded-xl shadow-sm border-l-4"
                        style={{
                            borderColor: "#465940",
                            background: "linear-gradient(135deg, #f5f3e8 0%, #ffffff 100%)",
                        }}
                        >
                        <h3 className="text-lg font-semibold text-[#465940] mb-2">
                            Step {step.step}
                        </h3>
                        <p className="text-gray-700 whitespace-pre-wrap">{step.text}</p>
                        </li>
                    ))
                    ) : (
                    <p className="text-gray-500">조리 순서 정보가 없습니다.</p>
                    )}
                </ol>
                </section>

                
            </div>

            {/* ✅ 하단 AI 버튼 */}
            <div className="mt-10 text-center">
                <Button
                onClick={handleStartAssistant}
                className="w-full max-w-sm text-white font-bold py-3 text-lg rounded-full shadow-xl transition-all"
                style={{
                    background: "linear-gradient(135deg, #465940 0%, #5a6b4e 100%)",
                    boxShadow: "0 10px 24px rgba(70, 89, 64, 0.4)",
                }}
                >
                <Zap className="h-6 w-6 mr-3" />
                AI 요리보조 시작하기
                </Button>
            </div>

            </div>

    );
}