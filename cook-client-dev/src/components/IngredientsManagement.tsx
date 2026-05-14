import { useState, useEffect, useRef  } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {Card,CardContent,CardDescription,CardHeader,CardTitle,} from "./ui/card";
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle,} from "./ui/dialog";
import {Select,SelectContent, SelectItem, SelectTrigger,SelectValue,} from "./ui/select";
import { Badge } from "./ui/badge";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {Plus,Trash2,Edit,Calendar as CalendarIcon,AlertCircle,ArrowLeft,ChefHat,Snowflake,Apple,Sparkles,} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import {getIngredients,addIngredient,updateIngredient,deleteIngredient,parseReceiptImage,askGPT_raw,} from "../utils/api";
import { toast } from "sonner";
import { X } from "lucide-react";


export interface Ingredient {
  id: string;
  name: string;
  category: string;
  quantity: string;
  unit: string;
  expiryDate?: string;
  location: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

const LOCATIONS = [
  {
    name: "냉장실",
    icon: ChefHat,
    color: "bg-white",
    hoverColor: "hover:bg-gray-50",
  },
  {
    name: "냉동실",
    icon: Snowflake,
    color: "bg-white",
    hoverColor: "hover:bg-gray-50",
  },
  {
    name: "실온",
    icon: Apple,
    color: "bg-white",
    hoverColor: "hover:bg-gray-50",
  },
];

const UNITS = ["개", "g", "ml"];

// 식재료 자동 분류 함수
const categorizeIngredient = (name: string): string => {
  const lowerName = name.toLowerCase().trim();

  // 채소류
  const vegetables = [
    "양파","당근","감자","고구마","배추","무","오이","호박","가지","브로콜리","양배추","시금치","상추","깻잎","부추",
    "파",
    "대파",
    "쪽파",
    "마늘",
    "생강",
    "고추",
    "피망",
    "파프리카",
    "토마토",
    "버섯",
    "느타리버섯",
    "표고버섯",
    "양송이버섯",
    "팽이버섯",
  ];

  // 과일류
  const fruits = [
    "사과",
    "배",
    "바나나",
    "포도",
    "딸기",
    "수박",
    "참외",
    "멜론",
    "복숭아",
    "자두",
    "오렌지",
    "귤",
    "레몬",
    "키위",
    "망고",
    "파인애플",
    "체리",
    "블루베리",
    "아보카도",
  ];

  // 육류
  const meats = [
    "소고기",
    "돼지고기",
    "닭고기",
    "오리고기",
    "양고기",
    "삼겹살",
    "목살",
    "안심",
    "등심",
    "갈비",
    "닭가슴살",
    "닭다리",
    "베이컨",
    "소시지",
    "햄",
    "스팸",
  ];

  // 해산물
  const seafood = [
    "고등어",
    "삼치",
    "갈치",
    "광어",
    "연어",
    "참치",
    "명태",
    "조기",
    "새우",
    "오징어",
    "문어",
    "낙지",
    "조개",
    "홍합",
    "굴",
    "바지락",
    "전복",
    "게",
    "꽃게",
  ];

  // 유제품/계란
  const dairy = [
    "우유",
    "치즈",
    "요거트",
    "요구르트",
    "버터",
    "생크림",
    "크림",
    "계란",
    "달걀",
  ];

  // 곡물/면류
  const grains = [
    "쌀",
    "현미",
    "찹쌀",
    "밀가루",
    "면",
    "국수",
    "라면",
    "스파게티",
    "파스타",
    "쌀국수",
    "당면",
    "빵",
    "식빵",
    "떡",
    "시리얼",
  ];

  // 조미료/양념
  const seasonings = [
    "소금",
    "설탕",
    "간장",
    "된장",
    "고추장",
    "고춧가루",
    "후추",
    "식초",
    "참기름",
    "들기름",
    "올리브유",
    "식용유",
    "카레",
    "케첩",
    "마요네즈",
    "머스타드",
    "굴소스",
    "맛술",
    "미림",
  ];

  // 가공식품
  const processed = [
    "두부",
    "유부",
    "어묵",
    "김",
    "김치",
    "콩나물",
    "숙주",
    "묵",
    "만두",
  ];

  for (const veg of vegetables)
    if (lowerName.includes(veg)) return "채소";
  for (const fruit of fruits)
    if (lowerName.includes(fruit)) return "과일";
  for (const meat of meats)
    if (lowerName.includes(meat)) return "육류";
  for (const fish of seafood)
    if (lowerName.includes(fish)) return "해산물";
  for (const d of dairy)
    if (lowerName.includes(d)) return "유제품";
  for (const grain of grains)
    if (lowerName.includes(grain)) return "곡물";
  for (const seasoning of seasonings)
    if (lowerName.includes(seasoning)) return "양념";
  for (const proc of processed)
    if (lowerName.includes(proc)) return "가공식품";

  return "기타";
};

interface IngredientsManagementProps {
  onBack?: () => void;
  onStartCooking?: (recipe: any) => void;
}

export function IngredientsManagement({ onBack, onStartCooking }: IngredientsManagementProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] =
    useState<Ingredient | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // ✅ 영수증 업로드 관련 상태
const [isReceiptUploading, setIsReceiptUploading] = useState(false);
const [receiptIngredients, setReceiptIngredients] = useState<
  { name: string; quantity: string; unit: string; location: string; expiryDate?: string }[]
>([]);
const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
const fileInputRef = useRef<HTMLInputElement | null>(null);
const [isReceiptReady, setIsReceiptReady] = useState(false);
const [isRecommending, setIsRecommending] = useState(false);
const [recommendations, setRecommendations] = useState<any[]>([]);
const [showRecommendations, setShowRecommendations] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    quantity: "",
    unit: "",
    location: "",
    expiryDate: undefined as Date | undefined,
    notes: "",
  });

  useEffect(() => {
    loadIngredients();
  }, []);

  const sortByExpiry = (list: Ingredient[]) => {
  return [...list].sort((a, b) => {
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  });
};


  const loadIngredients = async () => {
    setLoading(true);
    try {
      const response = await getIngredients();
      // 백엔드에서 storage로 받아온 데이터를 location으로 변환
      const ingredientsWithLocation = (response.ingredients || []).map((ing: any) => ({
  ...ing,
  location: ing.storage || ing.location || "실온",
  expiryDate: ing.expiryDate || ing.expiry_date || null, // ✅ 핵심
}));


      // Sort by expiry date (closest first)
      const sorted = ingredientsWithLocation.sort((a: any, b: any) => {
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return (
          new Date(a.expiryDate).getTime() -
          new Date(b.expiryDate).getTime()
        );
      });
      setIngredients(sorted);
    } catch (error: any) {
      console.error("Failed to load ingredients:", error);
      toast.error("식재료 목록을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleGetRecommendations = async () => {
    if (ingredients.length === 0) {
      toast.error("냉장고에 재료가 없습니다");
      return;
    }
    setIsRecommending(true);
    setShowRecommendations(true);
    setRecommendations("");
    try {
      const expiringFirst = ingredients
        .filter(ing => ing.expiryDate)
        .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime())
        .slice(0, 5)
        .map(ing => `${ing.name}(${ing.quantity}${ing.unit}, ${differenceInDays(parseISO(ing.expiryDate!), new Date())}일 남음)`);
      const others = ingredients
        .filter(ing => !ing.expiryDate)
        .slice(0, 10)
        .map(ing => `${ing.name}(${ing.quantity}${ing.unit})`);
      const list = [...expiringFirst, ...others].join(", ");
      const reply = await askGPT_raw({
        message: `냉장고에 다음 재료들이 있어요: ${list}. 이 재료들로 만들 수 있는 음식 3가지를 추천해주세요. 유통기한이 임박한 재료를 우선 사용하는 레시피를 포함해주세요. 각 레시피마다 재료와 간단한 조리 순서도 알려주세요.`,
      });
      // 응답이 객체(recipes 배열)면 그대로, 문자열이면 파싱 시도
      let parsed: any = reply;
      if (typeof reply === "string") {
        try { parsed = JSON.parse(reply); } catch { parsed = { text: reply }; }
      }
      const recipeList = parsed?.recipes ?? (Array.isArray(parsed) ? parsed : null);
      setRecommendations(recipeList ?? [{ recipeName: "추천 결과", steps: [typeof parsed?.text === "string" ? parsed.text : JSON.stringify(parsed)] }]);
    } catch {
      toast.error("추천을 불러오지 못했습니다");
      setShowRecommendations(false);
    } finally {
      setIsRecommending(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      quantity: "",
      unit: "",
      location: selectedLocation || "",
      expiryDate: undefined,
      notes: "",
    });
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.unit || !formData.quantity) {
      toast.error("필수 항목을 모두 입력해주세요");
      return;
    }

    if (!formData.location) {
      toast.error("보관 위치를 선택해주세요");
      return;
    }

    setLoading(true);
    try {
      const ingredientData = {
        name: formData.name,
        category: categorizeIngredient(formData.name),
        quantity: formData.quantity,
        unit: formData.unit,
        storage: formData.location, // location을 storage로 매핑
        expiry_date: formData.expiryDate ? formData.expiryDate.toISOString().slice(0, 10) : null,
        notes: formData.notes,
      };

      const response = await addIngredient(ingredientData);
      // 백엔드에서 storage로 반환되므로 location으로 변환
      const newIngredient = {
        ...response.ingredient,
        location: response.ingredient.storage,
      };
      setIngredients((prev) =>
  sortByExpiry([
    ...prev,
    {
      ...newIngredient,
      expiryDate:
        (newIngredient as any).expiry_date ??
        (newIngredient as any).expiryDate ??
        null,
    },
  ])
);

      toast.success("식재료가 추가되었습니다");
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Failed to add ingredient:", error);
      toast.error("식재료 추가에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (
      !editingIngredient ||
      !formData.name ||
      !formData.unit ||
      !formData.quantity
    ) {
      toast.error("필수 항목을 모두 입력해주세요");
      return;
    }

    if (!formData.location) {
      toast.error("보관 위치를 선택해주세요");
      return;
    }

    setLoading(true);
    try {
      const ingredientData = {
        name: formData.name,
        category: editingIngredient.category || "기타",
        quantity: formData.quantity,
        unit: formData.unit,
        storage: formData.location, // location을 storage로 매핑
        expiry_date: formData.expiryDate ? formData.expiryDate.toISOString().slice(0, 10) : null,
        notes: formData.notes,
      };

      const response = await updateIngredient(
        editingIngredient.id,
        ingredientData,
      );
      // 백엔드에서 storage로 반환되므로 location으로 변환
      const updatedIngredient = {
        ...response.ingredient,
        location: response.ingredient.storage,
      };
      setIngredients((prev) =>
  sortByExpiry(
    prev.map((ing) =>
      ing.id === editingIngredient.id
        ? {
            ...updatedIngredient,
            // 서버 응답 키가 expiry_date 일 수도 있어서 통일
            expiryDate:
              (updatedIngredient as any).expiry_date ??
              (updatedIngredient as any).expiryDate ??
              null,
          }
        : ing
    )
  )
);


      toast.success("식재료가 수정되었습니다");
      setIsEditDialogOpen(false);
      setEditingIngredient(null);
      resetForm();
    } catch (error: any) {
      console.error("Failed to update ingredient:", error);
      toast.error("식재료 수정에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) {
      return;
    }

    setLoading(true);
    try {
      await deleteIngredient(id);
      setIngredients(ingredients.filter((ing) => ing.id !== id));
      toast.success("식재료가 삭제되었습니다");
    } catch (error: any) {
      console.error("Failed to delete ingredient:", error);
      toast.error("식재료 삭제에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  // ✅ 영수증 업로드 → OCR → GPT 파싱
  const handleReceiptUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      setIsReceiptUploading(false); // 취소 시 복구
      return;
    }

    setIsReceiptReady(false);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await parseReceiptImage(formData);
      const parsed = (response.ingredients || []).map((ing: any) => ({
      ...ing,
      location: "냉장실",
      expiryDate: undefined, // ✅ 유통기한은 사용자가 달력으로 선택
      }));


      if (!parsed.length) {
        toast.error("영수증에서 식재료를 찾지 못했어요");
        return;
      }

      setReceiptIngredients(parsed);
      // 🔵 자동으로 화면/다이얼로그 안 열고, 버튼만 "확인하기"로 바뀜
      setIsReceiptReady(true);

      toast.success("영수증 분석 완료! 확인하기를 눌러 주세요");
    } catch (error: any) {
      console.error("Receipt upload failed:", error);
      toast.error(error.message || "영수증 분석 실패");
    } finally {
      setIsReceiptUploading(false);
      event.target.value = "";
    }
  };


  // ✅ 영수증 인식 결과 → 한 번에 저장
  const handleSaveReceiptIngredients = async () => {
  if (!receiptIngredients.length) return;

  setLoading(true);
  try {
    for (const ing of receiptIngredients) {
      const payload = {
        name: ing.name,
        category: categorizeIngredient(ing.name),
        quantity: ing.quantity,
        unit: ing.unit,
        storage: ing.location,
        expiry_date: ing.expiryDate || null, // ✅ DB 컬럼명으로 저장
        notes: "영수증 자동 등록",
      };

      const response = await addIngredient(payload);

      const saved = response.ingredient;

      const newIngredient = {
        ...saved,
        location: saved.storage || ing.location,
        expiryDate: saved.expiry_date || ing.expiryDate || undefined,
      };

      setIngredients((prev) => [...prev, newIngredient]);
    }

    toast.success("영수증 식재료 저장 완료");
    setIsReceiptDialogOpen(false);
    setReceiptIngredients([]);
    setIsReceiptReady(false);
  } catch (error) {
    console.error(error);
    toast.error("식재료 저장 실패");
  } finally {
    setLoading(false);
  }
};



  const openEditDialog = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setFormData({
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      location: ingredient.location,
      expiryDate: ingredient.expiryDate
        ? parseISO(ingredient.expiryDate)
        : undefined,
      notes: ingredient.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return null;

    const days = differenceInDays(parseISO(expiryDate), new Date());

    if (days < 0) {
      return { label: "유통기한 지남", color: "bg-red-500" };
    } else if (days === 0) {
      return { label: "오늘 만료", color: "bg-red-500" };
    } else if (days <= 3) {
      return { label: `${days}일 남음`, color: "bg-orange-500" };
    } else if (days <= 7) {
      return { label: `${days}일 남음`, color: "bg-yellow-500" };
    }
    return { label: `${days}일 남음`, color: "bg-green-500" };
  };

  const getLocationIngredients = (location: string) => {
    return ingredients.filter((ing) => ing.location === location);
  };

  const getExpiringCountForLocation = (location: string) => {
    return getLocationIngredients(location).filter((ing) => {
      if (!ing.expiryDate) return false;
      const days = differenceInDays(parseISO(ing.expiryDate), new Date());
      return days >= 0 && days <= 3;
    }).length;
  };

  // =========================
  // 첫 화면: 보관 위치 선택
  // =========================
  const totalCount = ingredients.length;
  const totalExpiring = ingredients.filter(ing => {
    if (!ing.expiryDate) return false;
    return differenceInDays(parseISO(ing.expiryDate), new Date()) <= 3;
  }).length;

  if (!selectedLocation && !isReceiptDialogOpen) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>냉장고 관리</h1>
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>식재료를 보관 위치별로 관리하세요</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleGetRecommendations}
              disabled={isRecommending}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500,
                background: "#fff", color: "#465940",
                border: "1px solid #a3c49a", cursor: isRecommending ? "default" : "pointer",
                opacity: isRecommending ? 0.7 : 1,
              }}
            >
              <Sparkles style={{ width: 14, height: 14 }} />
              {isRecommending ? "분석 중..." : "요리 추천받기"}
            </button>
            <button
              onClick={() => { resetForm(); setIsAddDialogOpen(true); }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: "#465940", color: "#fff", border: "none", cursor: "pointer",
              }}
            >
              <Plus style={{ width: 14, height: 14 }} /> 식재료 추가
            </button>
            <button
              disabled={isReceiptUploading}
              onClick={() => {
                if (isReceiptReady) { setIsReceiptDialogOpen(true); }
                else { setIsReceiptUploading(true); fileInputRef.current?.click(); }
              }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500,
                background: "#fff", color: "#374151",
                border: "1px solid #e5e7eb", cursor: isReceiptUploading ? "default" : "pointer",
                opacity: isReceiptUploading ? 0.6 : 1,
              }}
            >
              {isReceiptUploading ? "분석 중..." : isReceiptReady ? "✓ 결과 확인하기" : "영수증으로 자동 추가"}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleReceiptUpload} />
          </div>
        </div>

        {/* 요약 통계 배너 */}
        <div style={{
          background: "#465940", borderRadius: 16, padding: "28px 36px",
          display: "flex", alignItems: "center",
        }}>
          {[
            { label: "전체 식재료", value: totalCount },
            { label: "유통기한 임박", value: totalExpiring },
          ].map(({ label, value }, i) => (
            <div key={label} style={{
              flex: 1, textAlign: "center",
              borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.2)" : "none",
              padding: "0 20px",
            }}>
              <p style={{ fontSize: 34, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                {value}<span style={{ fontSize: 16, fontWeight: 500 }}>개</span>
              </p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 8 }}>{label}</p>
            </div>
          ))}
          {totalExpiring > 0 && (
            <div style={{
              marginLeft: "auto", padding: "8px 16px", borderRadius: 10,
              background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)",
            }}>
              <p style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>⚠ 곧 만료되는 식재료가 있어요</p>
            </div>
          )}
        </div>

        {/* 소비 우선순위 */}
        {ingredients.filter(i => i.expiryDate).length > 0 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#374151", marginBottom: 12 }}>이거 먼저 쓰세요</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {ingredients.filter(i => i.expiryDate).slice(0, 5).map(ing => {
                const days = differenceInDays(parseISO(ing.expiryDate!), new Date());
                const dotColor = days < 0 ? "#dc2626" : days === 0 ? "#f97316" : "#a3c49a";
                const labelColor = days < 0 ? "#dc2626" : days === 0 ? "#f97316" : "#6b7280";
                const label = days < 0 ? "유통기한 지남" : days === 0 ? "오늘 만료" : `${days}일 남음`;
                const bg = days < 0 ? "#fef2f2" : days === 0 ? "#fff7ed" : "#f9fafb";
                const border = days < 0 ? "1px solid #fecaca" : days === 0 ? "1px solid #fed7aa" : "1px solid #e5e7eb";
                return (
                  <div key={ing.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderRadius: 10, background: bg, border }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{ing.name}</span>
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>{ing.quantity}{ing.unit} · {ing.location}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: labelColor }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 요리 추천 결과 */}
        {showRecommendations && (
          <div style={{ background: "#f6f9f5", borderRadius: 16, padding: 24, border: "1px solid #d4e5c8" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles style={{ width: 16, height: 16, color: "#465940" }} />
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#374151" }}>냉장고 재료로 만들 수 있는 요리</h2>
              </div>
              <button onClick={() => setShowRecommendations(false)} style={{ fontSize: 18, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            {isRecommending ? (
              <p style={{ fontSize: 13, color: "#6b7280", textAlign: "center", padding: "12px 0" }}>AI가 냉장고 재료를 분석하고 있어요...</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {recommendations.map((r: any, i: number) => (
                  <div key={i} style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{i + 1}. {r.recipeName}</p>
                      {onStartCooking && (
                        <button
                          onClick={() => onStartCooking(r)}
                          style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "#465940", color: "#fff", border: "none", cursor: "pointer", flexShrink: 0 }}
                        >
                          만들기
                        </button>
                      )}
                    </div>
                    {(r.fullIngredients ?? r.ingredients ?? []).length > 0 && (
                      <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
                        {(r.fullIngredients ?? r.ingredients ?? []).join("  ·  ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 보관 위치 카드 */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#374151", marginBottom: 14 }}>보관 위치 선택</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {LOCATIONS.map((location) => {
              const Icon = location.icon;
              const count = getLocationIngredients(location.name).length;
              const expiring = getExpiringCountForLocation(location.name);
              const locationColors: Record<string, string> = {
                "냉장실": "linear-gradient(135deg,#e8f2dd,#d4e5c8)",
                "냉동실": "linear-gradient(135deg,#dbeafe,#bfdbfe)",
                "실온":   "linear-gradient(135deg,#fef3c7,#fde68a)",
              };
              const iconColors: Record<string, string> = {
                "냉장실": "#465940",
                "냉동실": "#2563eb",
                "실온":   "#d97706",
              };
              return (
                <button
                  key={location.name}
                  onClick={() => setSelectedLocation(location.name)}
                  style={{
                    padding: "28px 24px", borderRadius: 16, textAlign: "left",
                    background: "#fff", border: "1px solid #e5e7eb",
                    cursor: "pointer", transition: "box-shadow 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "#a3c49a";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: 14, marginBottom: 18,
                    background: locationColors[location.name] || "#f3f4f6",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon style={{ width: 24, height: 24, color: iconColors[location.name] || "#465940" }} />
                  </div>
                  <p style={{ fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 6 }}>{location.name}</p>
                  <p style={{ fontSize: 13, color: "#6b7280" }}>식재료 {count}개</p>
                  {expiring > 0 && (
                    <div style={{
                      marginTop: 12, display: "inline-block",
                      padding: "3px 10px", borderRadius: 50, fontSize: 11, fontWeight: 600,
                      background: "#fee2e2", color: "#dc2626",
                    }}>
                      임박 {expiring}개
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

          {/* Add Dialog - 메인 화면용 (추가만) */}
          <Dialog
            open={isAddDialogOpen}
            onOpenChange={(open: boolean) => {
              if (!open) {
                setIsAddDialogOpen(false);
                setEditingIngredient(null);
                resetForm();
              }
            }}
          >
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>식재료 추가</DialogTitle>
                <DialogDescription>
                  추가하고 싶은 식재료 정보를 입력해주세요
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">식재료명 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value,
                      })
                    }
                    placeholder="예: 양파, 당근, 우유"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="location">보관 위치 *</Label>
                  <Select
                    value={formData.location}
                    onValueChange={(value: string) =>
                      setFormData({
                        ...formData,
                        location: value,
                      })
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="냉장실, 냉동실, 실온 중 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATIONS.map((location) => (
                        <SelectItem
                          key={location.name}
                          value={location.name}
                        >
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="quantity">수량 *</Label>
                    <Input
                      id="quantity"
                      type="text"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantity: e.target.value,
                        })
                      }
                      placeholder="예: 2"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="unit">단위 *</Label>
                    <Select
                      value={formData.unit}
                      onValueChange={(value: string) =>
                        setFormData({
                          ...formData,
                          unit: value,
                        })
                      }
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="개/g/ml" />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>유통기한 (택)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal mt-1.5"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.expiryDate ? (
                          format(formData.expiryDate, "yyyy년 MM월 dd일", {
                            locale: ko,
                          })
                        ) : (
                          <span className="text-muted-foreground">
                            날짜를 선택하세요
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        selected={formData.expiryDate}
                        onSelect={(date: Date | undefined) =>
                          setFormData({
                            ...formData,
                            expiryDate: date,
                          })
                        }
                        initialFocus
                        locale={ko}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="notes">메모 (선택)</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notes: e.target.value,
                      })
                    }
                    placeholder="예: 마트에서 구매, 반만 사용"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    resetForm();
                  }}
                >
                  취소
                </Button>
                <Button onClick={handleAdd} disabled={loading}>
                  {loading ? "처리 중..." : "추가"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </div>
    );
  }

  // =========================
  // 상세 화면: 선택된 보관 위치
  // =========================

  const locationIngredients = getLocationIngredients(selectedLocation!);
  const expiringCount = getExpiringCountForLocation(selectedLocation!);
  const locationInfo = LOCATIONS.find(
    (loc) => loc.name === selectedLocation,
  );
  const LocationIcon = locationInfo?.icon || Apple;

  // 검색 필터 적용
  const filteredIngredients = locationIngredients.filter((ing) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ing.name.toLowerCase().includes(q) ||
      ing.category.toLowerCase().includes(q)
    );
  });

  const detailIconColors: Record<string, string> = { "냉장실": "#465940", "냉동실": "#2563eb", "실온": "#d97706" };
  const detailBgColors: Record<string, string> = {
    "냉장실": "linear-gradient(135deg,#e8f2dd,#d4e5c8)",
    "냉동실": "linear-gradient(135deg,#dbeafe,#bfdbfe)",
    "실온":   "linear-gradient(135deg,#fef3c7,#fde68a)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* 상단 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => setSelectedLocation(null)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8, fontSize: 13,
              background: "#fff", border: "1px solid #e5e7eb",
              color: "#374151", cursor: "pointer", fontWeight: 500,
            }}
          >
            <ArrowLeft style={{ width: 14, height: 14 }} /> 뒤로
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: detailBgColors[selectedLocation!] || "#f3f4f6",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <LocationIcon style={{ width: 22, height: 22, color: detailIconColors[selectedLocation!] || "#465940" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{selectedLocation}</h1>
              <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>식재료 {locationIngredients.length}개</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setIsAddDialogOpen(true); }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: "#465940", color: "#fff", border: "none", cursor: "pointer",
          }}
        >
          <Plus style={{ width: 14, height: 14 }} /> 식재료 추가
        </button>
      </div>

      {/* 유통기한 임박 경고 */}
      {expiringCount > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 20px", borderRadius: 12,
          background: "#fff7ed", border: "1px solid #fed7aa",
        }}>
          <AlertCircle style={{ width: 18, height: 18, color: "#ea580c", flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: "#9a3412" }}>
            <strong>{expiringCount}개</strong>의 식재료가 3일 내 만료됩니다. 빨리 사용하세요!
          </p>
        </div>
      )}

      {/* 검색 */}
      <div style={{ position: "relative" }}>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="식재료 이름으로 검색..."
          style={{
            width: "100%", padding: "10px 16px", paddingLeft: 40,
            borderRadius: 10, border: "1px solid #e5e7eb",
            fontSize: 13, color: "#374151", background: "#fff",
            outline: "none", boxSizing: "border-box",
          }}
        />
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>🔍</span>
      </div>

      {/* 재료 목록 */}
      {loading && filteredIngredients.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af", fontSize: 14 }}>불러오는 중...</div>
      ) : filteredIngredients.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
          <LocationIcon style={{ width: 40, height: 40, margin: "0 auto 12px", color: "#d1d5db" }} />
          <p style={{ fontSize: 14 }}>{selectedLocation}에 등록된 식재료가 없습니다</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {filteredIngredients.map((ingredient) => {
            const expiryStatus = getExpiryStatus(ingredient.expiryDate);
            const statusColors: Record<string, { bg: string; color: string }> = {
              "유통기한 지남": { bg: "#fee2e2", color: "#dc2626" },
              "오늘 만료":     { bg: "#fee2e2", color: "#dc2626" },
            };
            const statusStyle = expiryStatus
              ? (statusColors[expiryStatus.label] || (expiryStatus.color.includes("orange") ? { bg: "#ffedd5", color: "#ea580c" } : expiryStatus.color.includes("yellow") ? { bg: "#fef9c3", color: "#ca8a04" } : { bg: "#dcfce7", color: "#16a34a" }))
              : null;
            return (
              <div
                key={ingredient.id}
                style={{
                  background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0",
                  padding: "18px 18px 14px", display: "flex", flexDirection: "column", gap: 10,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)", transition: "box-shadow 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.09)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)")}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{ingredient.name}</p>
                    <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{ingredient.category}</p>
                  </div>
                  <div style={{ display: "flex", gap: 2 }}>
                    <button onClick={() => openEditDialog(ingredient)} style={{ padding: 6, borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#465940")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
                    ><Edit style={{ width: 14, height: 14 }} /></button>
                    <button onClick={() => handleDelete(ingredient.id)} style={{ padding: 6, borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
                    ><Trash2 style={{ width: 14, height: 14 }} /></button>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid #f3f4f6" }}>
                  <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{ingredient.quantity} {ingredient.unit}</span>
                  {ingredient.expiryDate && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>
                        {format(parseISO(ingredient.expiryDate), "MM.dd", { locale: ko })}
                      </span>
                      {expiryStatus && statusStyle && (
                        <span style={{
                          padding: "2px 8px", borderRadius: 50, fontSize: 10, fontWeight: 600,
                          background: statusStyle.bg, color: statusStyle.color,
                        }}>{expiryStatus.label}</span>
                      )}
                    </div>
                  )}
                </div>
                {ingredient.notes && (
                  <p style={{ fontSize: 11, color: "#9ca3af", paddingTop: 6, borderTop: "1px solid #f9f9f9" }}>{ingredient.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

        {/* Add/Edit Dialog (상세 화면용) */}
        <Dialog
          open={isAddDialogOpen || isEditDialogOpen}
          onOpenChange={(open: boolean) => {
            if (!open) {
              setIsAddDialogOpen(false);
              setIsEditDialogOpen(false);
              setEditingIngredient(null);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isEditDialogOpen ? "식재료 수정" : "식재료 추가"}
              </DialogTitle>
              <DialogDescription>
                추가하고 싶은 식재료 정보를 입력해주세요
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">식재료명 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value,
                    })
                  }
                  placeholder="예: 양파, 당근, 우유"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="location">보관 위치 *</Label>
                <Select
                  value={formData.location}
                  onValueChange={(value: string) =>
                    setFormData({
                      ...formData,
                      location: value,
                    })
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="냉장실, 냉동실, 실온 중 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map((location) => (
                      <SelectItem
                        key={location.name}
                        value={location.name}
                      >
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="quantity">수량 *</Label>
                  <Input
                    id="quantity"
                    type="text"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantity: e.target.value,
                      })
                    }
                    placeholder="예: 2"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="unit">단위 *</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value: string) =>
                      setFormData({
                        ...formData,
                        unit: value,
                      })
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="개/g/ml" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>유통기한 (선택)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal mt-1.5"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.expiryDate ? (
                        format(
                          formData.expiryDate,
                          "yyyy년 MM월 dd일",
                          { locale: ko },
                        )
                      ) : (
                        <span className="text-muted-foreground">
                          날짜를 선택하세요
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={formData.expiryDate}
                      onSelect={(date: Date | undefined) =>
                        setFormData({
                          ...formData,
                          expiryDate: date,
                        })
                      }
                      initialFocus
                      locale={ko}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="notes">메모 (선택)</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      notes: e.target.value,
                    })
                  }
                  placeholder="예: 마트에서 구매, 반만 사용"
                  className="mt-1.5"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setIsEditDialogOpen(false);
                  setEditingIngredient(null);
                  resetForm();
                }}
              >
                취소
              </Button>
              <Button
                onClick={isEditDialogOpen ? handleEdit : handleAdd}
                disabled={loading}
              >
                {loading ? "처리 중..." : isEditDialogOpen ? "수정" : "추가"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ✅ 영수증 인식 결과 Dialog */}
        <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>영수증 인식 결과</DialogTitle>
            </DialogHeader>

            <div className="space-y-2">
              {receiptIngredients.map((ing, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-2 border-b py-3 px-2 relative"
                >
                  {/* ✅ X 삭제 버튼 (겹침 방지 위치 고정) */}
                  <button
                    className="absolute top-2 right-2 z-10 text-gray-400 hover:text-red-500"
                    onClick={() => {
                      setReceiptIngredients(prev =>
                        prev.filter((_, i) => i !== idx)
                      );
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* ✅ 내용 영역 (이름 수정 가능 + X랑 안 겹치게 padding-right 확보) */}
                  <div className="flex justify-between items-center gap-2 pr-8">
                  <Input
                  value={ing.name}
                  onChange={(e) => {
                  const value = e.target.value;
                  setReceiptIngredients((prev) =>
                  prev.map((item, i) => (i === idx ? { ...item, name: value } : item))
                  );
                }}
                className="h-9"
                placeholder="재료 이름"
                />

              <span className="text-sm text-muted-foreground whitespace-nowrap">
              {ing.quantity} {ing.unit}
              </span>
            </div>


                  <div className="flex gap-2">
  {/* 왼쪽: 보관 위치 */}
  <Select
    value={ing.location}
    onValueChange={(value: string) => {
      setReceiptIngredients((prev) =>
        prev.map((item, i) => (i === idx ? { ...item, location: value } : item))
      );
    }}
  >
    <SelectTrigger className="flex-1">
      <SelectValue placeholder="보관 위치" />
    </SelectTrigger>
    <SelectContent>
      {LOCATIONS.map((loc) => (
        <SelectItem key={loc.name} value={loc.name}>
          {loc.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>

  {/* 오른쪽: 유통기한 (달력) */}
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" className="flex-1 justify-start">
        <CalendarIcon className="mr-2 h-4 w-4" />
        {ing.expiryDate ? (
          format(parseISO(ing.expiryDate), "yyyy.MM.dd", { locale: ko })
        ) : (
          <span className="text-muted-foreground">유통기한</span>
        )}
      </Button>
    </PopoverTrigger>

    <PopoverContent className="w-auto p-0" align="start">
      <Calendar
        mode="single"
        selected={ing.expiryDate ? parseISO(ing.expiryDate) : undefined}
        onSelect={(date: Date | undefined) => {
          setReceiptIngredients((prev) =>
            prev.map((item, i) =>
              i === idx
                ? {
                    ...item,
                    expiryDate: date ? format(date, "yyyy-MM-dd") : undefined,
                  }
                : item
            )
          );
        }}
        initialFocus
        locale={ko}
      />
    </PopoverContent>
  </Popover>
      </div>

                </div>
              ))}



            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                setIsReceiptDialogOpen(false);
                setIsReceiptReady(false);      // 🔥 핵심
                setReceiptIngredients([]);     // 🔥 OCR 결과 초기화
              }}
              >
                취소
              </Button>
              <Button onClick={handleSaveReceiptIngredients}>
                모두 저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

    </div>
  );
}