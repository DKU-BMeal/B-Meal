import { useEffect, useState } from "react";
import { getFullRecipeDetail, searchShopProducts, ShopProduct } from "../utils/api";
import { Button } from "../components/ui/button";
import { Loader2, Zap, X } from "lucide-react";

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
    const [shopTarget, setShopTarget] = useState<string | null>(null);
    const [shopProducts, setShopProducts] = useState<ShopProduct[]>([]);
    const [shopLoading, setShopLoading] = useState(false);
    const [shopError, setShopError] = useState<string | null>(null);
    const [shopSort, setShopSort] = useState<'default' | 'price_asc' | 'price_desc' | 'mall'>('default');

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

    // 🔹 쇼핑몰 이름 → 간략 라벨
function mallLabel(name: string): string {
  if (name.includes('쿠팡')) return '쿠팡';
  if (name.includes('컬리') || name.includes('마켓컬리')) return '컬리';
  if (name.includes('이마트') || name.includes('SSG') || name.includes('ssg')) return '이마트';
  if (name.includes('11번가')) return '11번가';
  if (name.includes('G마켓') || name.includes('gmarket')) return 'G마켓';
  if (name.includes('옥션')) return '옥션';
  if (name.includes('롯데')) return '롯데';
  return name.length > 6 ? name.slice(0, 6) : name;
}

// 🔹 쇼핑몰 이름 → 뱃지 색상
function mallColor(name: string): string {
  if (name.includes('쿠팡')) return '#c00d0d';
  if (name.includes('컬리') || name.includes('마켓컬리')) return '#5f0080';
  if (name.includes('이마트') || name.includes('SSG') || name.includes('ssg')) return '#e25519';
  if (name.includes('11번가')) return '#ff0000';
  if (name.includes('G마켓')) return '#ff6600';
  if (name.includes('옥션')) return '#e4393c';
  if (name.includes('롯데')) return '#e4002b';
  return '#6b7280';
}

// 🔹 재료 문자열을 개별 재료 배열로 파싱 (줄바꿈 + 쉼표 모두 처리)
function parseIngredients(details: string | null): string[] {
  if (!details) return [];
  return details
    .split(/\r?\n/)
    .flatMap((line) => line.split(','))
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => item.replace(/^[·•\-\*]\s*/, ""))
    // 섹션 헤더([재료], [양념장] 등)는 제외
    .filter((item) => !/^\[.*\]$/.test(item));
}

// 🔹 재료명에서 수량/단위를 제거해 쇼핑 검색어만 추출
function extractIngredientName(line: string): string {
  return line
    // (200g), (1개), (약간) 형태의 괄호 수량 제거
    .replace(/\([^)]*\)/g, '')
    // 뒤에 붙은 숫자+단위 제거: 200g, 2개, 1큰술, 1/2컵 등
    .replace(/\s*[\d\/\.]+\s*(g|gram|그램|그람|ml|mL|밀리리터|L|l|cc|kg|컵|큰술|작은술|T|t|개|알|마리|뿌리|장|봉|봉지|봉투|캔|팩|포|줌|줄기|쪽|통|토막|cm|조각|대|모|꼬집|꼬치|인분|스푼)\b\.?\s*$/gi, '')
    .replace(/\s*(약간|조금|적당량|한줌|조금씩|약간씩|소량)\s*$/gi, '')
    .replace(/\s+[\d\/\.]+\s*$/, '')
    .trim();
}

function parsePrice(price: string): number {
  return Number(price.replace(/,/g, '')) || 0;
}

const handleOpenShop = async (name: string) => {
  setShopTarget(name);
  setShopProducts([]);
  setShopError(null);
  setShopSort('default');
  setShopLoading(true);
  try {
    const items = await searchShopProducts(name);
    setShopProducts(items);
    if (items.length === 0) setShopError('검색 결과가 없습니다.');
  } catch (err: any) {
    setShopError(err.message || '상품 정보를 불러오지 못했습니다.');
  } finally {
    setShopLoading(false);
  }
};

const handleCloseShop = () => {
  setShopTarget(null);
  setShopProducts([]);
  setShopError(null);
  setShopSort('default');
};

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
                {recipe.ingredients_details ? (
                  <ul className="divide-y divide-gray-100">
                    {parseIngredients(recipe.ingredients_details).map((ingredient, idx) => (
                      <li key={idx} className="flex items-center justify-between py-2 text-sm text-gray-700">
                        <span>{ingredient}</span>
                        <button
                          onClick={() => handleOpenShop(extractIngredientName(ingredient))}
                          className="ml-4 flex-shrink-0 text-xs text-white px-3 py-0.5 rounded-full hover:opacity-80 transition-opacity"
                          style={{ background: "#465940" }}
                        >
                          구매
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">재료 정보가 없습니다.</p>
                )}
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

            {/* ✅ 쇼핑 모달 */}
            {shopTarget && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                onClick={handleCloseShop}
              >
                <div
                  className="bg-white rounded-2xl shadow-xl flex flex-col"
                  style={{ width: '90vw', maxWidth: '1400px', height: '90vh' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* 헤더 */}
                  <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
                    <div>
                      <p className="text-xs text-gray-400">쇼핑 검색</p>
                      <h3 className="text-base font-bold text-[#465940]">{shopTarget}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {([
                          { key: 'default',    label: '기본' },
                          { key: 'price_asc',  label: '낮은가격' },
                          { key: 'price_desc', label: '높은가격' },
                          { key: 'mall',       label: '쇼핑몰' },
                        ] as const).map(({ key, label }) => (
                          <button
                            key={key}
                            onClick={() => setShopSort(key)}
                            className="text-xs px-2.5 py-1 rounded-full border transition-colors"
                            style={
                              shopSort === key
                                ? { background: '#465940', color: '#fff', borderColor: '#465940' }
                                : { background: '#fff', color: '#6b7280', borderColor: '#d1d5db' }
                            }
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <button onClick={handleCloseShop} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* 결과 */}
                  <div className="overflow-y-auto flex-1 px-4 py-4">
                    {shopLoading && (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Loader2 className="animate-spin h-7 w-7 mb-3" />
                        <p className="text-sm">상품 검색 중...</p>
                      </div>
                    )}

                    {shopError && !shopLoading && (
                      <p className="text-center text-sm text-gray-400 py-10">{shopError}</p>
                    )}

                    {!shopLoading && shopProducts.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                        {[...shopProducts]
                          .sort((a, b) => {
                            if (shopSort === 'price_asc') return parsePrice(a.price) - parsePrice(b.price);
                            if (shopSort === 'price_desc') return parsePrice(b.price) - parsePrice(a.price);
                            if (shopSort === 'mall') return mallLabel(a.mall).localeCompare(mallLabel(b.mall), 'ko');
                            return 0;
                          })
                          .map((product, idx) => (
                          <a
                            key={idx}
                            href={product.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow bg-white"
                          >
                            <div className="w-full aspect-square bg-gray-100 overflow-hidden relative">
                              {product.image ? (
                                <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">없음</div>
                              )}
                              <span
                                className="absolute top-1 left-1 text-white rounded font-medium"
                                style={{ background: mallColor(product.mall), fontSize: '9px', padding: '1px 5px' }}
                              >
                                {mallLabel(product.mall)}
                              </span>
                            </div>
                            <div className="px-1.5 py-1">
                              <p className="text-[11px] text-gray-700 leading-tight line-clamp-2">{product.title}</p>
                              <p className="text-[11px] font-bold text-[#465940] mt-0.5">{product.price}원</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            </div>

    );
}