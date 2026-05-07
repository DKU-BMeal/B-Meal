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
import {Plus,Trash2,Edit,Calendar as CalendarIcon,AlertCircle,ArrowLeft,ChefHat,Snowflake,Apple,Camera,} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import {getIngredients,addIngredient,updateIngredient,deleteIngredient,parseReceiptImage,scanFridgeImage,} from "../utils/api";
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
}

export function IngredientsManagement({ onBack }: IngredientsManagementProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] =
    useState<Ingredient | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  // 냉장고 스캔 관련 상태
  const [isFridgeScanning, setIsFridgeScanning] = useState(false);
  const [isFridgeScanDialogOpen, setIsFridgeScanDialogOpen] = useState(false);
  const [fridgeScanItems, setFridgeScanItems] = useState<
    { name: string; category: string; storage: "냉장실" | "냉동실" | "실온"; checked: boolean; expiryDate?: string; autoExpiry?: boolean; quantity?: string }[]
  >([]);
  const fridgeScanInputRef = useRef<HTMLInputElement>(null);

  // ✅ 영수증 업로드 관련 상태
const [isReceiptUploading, setIsReceiptUploading] = useState(false);
const [receiptIngredients, setReceiptIngredients] = useState<
  { name: string; quantity: string; unit: string; location: string; expiryDate?: string }[]
>([]);
const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
const fileInputRef = useRef<HTMLInputElement | null>(null);
const [isReceiptReady, setIsReceiptReady] = useState(false);


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

  const FALLBACK_SHELF_DAYS: Record<string, number> = {
    상추: 4, 시금치: 3, 깻잎: 3, 부추: 3, 쑥갓: 3,
    브로콜리: 5, 오이: 5, 버섯: 5, 느타리버섯: 5, 팽이버섯: 5, 표고버섯: 5,
    가지: 7, 파프리카: 7, 피망: 7, 토마토: 7,
    당근: 14, 무: 14, 양배추: 14, 파: 7, 대파: 7,
    두부: 3, 계란: 21, 달걀: 21,
    우유: 7, 요거트: 7, 치즈: 14,
    닭고기: 2, 닭가슴살: 2, 소고기: 3, 돼지고기: 3, 삼겹살: 3,
    생선: 2, 연어: 2, 고등어: 2, 새우: 2, 오징어: 2,
    고구마: 30, 감자: 30, 양파: 60, 마늘: 60, 생강: 30,
  };

  const getAutoExpiryDate = (category: string, storage: string, name?: string, shelfDays?: number | null): { date: string; auto: boolean } | undefined => {
    if (storage === "냉동실") return undefined;
    let days: number | undefined;
    if (shelfDays) {
      days = shelfDays;
    } else if (name) {
      const key = Object.keys(FALLBACK_SHELF_DAYS).find(k => name.includes(k));
      days = key ? FALLBACK_SHELF_DAYS[key] : undefined;
    }
    if (!days) return undefined;
    const d = new Date();
    d.setDate(d.getDate() + days);
    return { date: d.toISOString().slice(0, 10), auto: true };
  };

  const resizeImageForScan = (file: File, maxPx = 1920): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지 변환 실패"))), "image/jpeg", 0.85);
      };
      img.onerror = reject;
      img.src = url;
    });

  // 냉장고 스캔 핸들러
  const handleFridgeScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsFridgeScanning(true);
    const loadingToastId = toast.loading("사진 분석 중... (20~40초 소요)");
    try {
      console.log("[FridgeScan] 요청 시작, 파일 크기:", (file.size / 1024).toFixed(0), "KB");
      const resized = await resizeImageForScan(file);
      console.log("[FridgeScan] 리사이즈 완료:", (resized.size / 1024).toFixed(0), "KB");
      const formData = new FormData();
      formData.append("image", resized, "fridge.jpg");
      const res = await scanFridgeImage(formData);
      console.log("[FridgeScan] 응답:", res);
      toast.dismiss(loadingToastId);
      const { 냉장 = [], 냉동 = [], 실온 = [] } = res.result ?? {};
      const makeItem = (i: any, storage: "냉장실" | "냉동실" | "실온") => {
        const cat = i.category ?? "기타";
        const expiry = getAutoExpiryDate(cat, storage, i.name, i.shelf_days);
        return { name: i.name, category: cat, storage, checked: true, expiryDate: expiry?.date, autoExpiry: expiry?.auto, quantity: i.quantity ?? "1개" };
      };
      const items = [
        ...냉장.map((i: any) => makeItem(i, "냉장실")),
        ...냉동.map((i: any) => makeItem(i, "냉동실")),
        ...실온.map((i: any) => makeItem(i, "실온")),
      ];
      if (!items.length) {
        toast.error("식재료를 찾지 못했어요. 더 밝고 선명한 사진으로 다시 시도해보세요.");
        return;
      }
      setFridgeScanItems(items);
      setIsFridgeScanDialogOpen(true);
      toast.success(`${items.length}개 식재료를 발견했어요!`);
    } catch (err: any) {
      toast.dismiss(loadingToastId);
      console.error("[FridgeScan] 오류:", err);
      toast.error(err.message || "냉장고 분석에 실패했어요. 서버 상태를 확인해주세요.");
    } finally {
      setIsFridgeScanning(false);
      e.target.value = "";
    }
  };

  const handleSaveFridgeScanItems = async () => {
    const selected = fridgeScanItems.filter((i) => i.checked);
    if (!selected.length) { toast.error("저장할 항목을 선택해주세요."); return; }
    let saved = 0;
    for (const item of selected) {
      try {
        const qtyMatch = (item.quantity ?? "").match(/^([\d.]+)\s*(.*)$/);
        const res = await addIngredient({ name: item.name, category: item.category, storage: item.storage, quantity: qtyMatch?.[1] ?? null, unit: qtyMatch?.[2] || null, expiry_date: item.expiryDate || null });
        const newIng = res.ingredient;
        if (newIng) {
          setIngredients((prev) => [...prev, {
            id: newIng.id, name: newIng.name, category: newIng.category ?? "기타",
            quantity: newIng.quantity ?? "", unit: newIng.unit ?? "",
            expiryDate: newIng.expiry_date ?? undefined,
            location: newIng.storage ?? item.storage,
            notes: newIng.notes ?? "", createdAt: newIng.created_at ?? new Date().toISOString(),
          }]);
          saved++;
        }
      } catch {}
    }
    toast.success(`${saved}개 식재료가 저장됐어요!`);
    setIsFridgeScanDialogOpen(false);
    setFridgeScanItems([]);
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
  // 공통 스타일 헬퍼
  // =========================
  const getExpiryBadgeStyle = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days < 0)   return { label: "만료",    bg: "#fef2f2", color: "#b91c1c" };
    if (days === 0) return { label: "오늘",    bg: "#fef2f2", color: "#b91c1c" };
    if (days <= 3)  return { label: `D-${days}`, bg: "#fff4ed", color: "#c2410c" };
    if (days <= 7)  return { label: `D-${days}`, bg: "#fafaf5", color: "#78716c" };
    return null;
  };
  const getLeftBorderColor = (expiryDate?: string) => {
    if (!expiryDate) return "#f0f0f0";
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days < 0)  return "#fca5a5";
    if (days <= 3) return "#fdba74";
    if (days <= 7) return "#d6d3d1";
    return "#f0f0f0";
  };

  // =========================
  // 첫 화면: 보관 위치 선택
  // =========================
  const totalCount = ingredients.length;
  const totalExpiring = ingredients.filter(ing => {
    if (!ing.expiryDate) return false;
    const d = differenceInDays(parseISO(ing.expiryDate), new Date());
    return d >= 0 && d <= 3;
  }).length;
  const expiringNames = ingredients
    .filter(ing => ing.expiryDate && differenceInDays(parseISO(ing.expiryDate), new Date()) >= 0 && differenceInDays(parseISO(ing.expiryDate), new Date()) <= 3)
    .map(i => i.name);

  const LOC_CFG: Record<string, { emoji: string; accent: string; light: string; grad: string }> = {
    "냉장실": { emoji: "❄️", accent: "#374151", light: "#f3f4f6", grad: "#f3f4f6" },
    "냉동실": { emoji: "🧊", accent: "#374151", light: "#f3f4f6", grad: "#f3f4f6" },
    "실온":   { emoji: "🌡️", accent: "#374151", light: "#f3f4f6", grad: "#f3f4f6" },
  };

  const allSearchResults = searchQuery
    ? ingredients.filter(ing =>
        ing.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ing.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  if (!selectedLocation && !isReceiptDialogOpen) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>냉장고 관리</h1>
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>식재료를 스마트하게 관리해요</p>
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

        {/* 전체 검색 */}
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 14 }}>🔍</span>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="전체 식재료 검색..."
            style={{
              width: "100%", padding: "10px 36px 10px 38px", borderRadius: 10,
              border: "1px solid #e5e7eb", fontSize: 13, color: "#374151",
              background: "#fff", outline: "none", boxSizing: "border-box",
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 2 }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>

        {/* 검색 결과 */}
        {searchQuery ? (
          <div>
            <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>"{searchQuery}" 검색 결과 {allSearchResults.length}개</p>
            {allSearchResults.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 14 }}>검색 결과가 없어요</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {allSearchResults.map(ing => {
                  const badge = getExpiryBadgeStyle(ing.expiryDate);
                  const locCfg = LOC_CFG[ing.location] || LOC_CFG["실온"];
                  return (
                    <div key={ing.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #f0f0f0", borderLeft: `3px solid ${getLeftBorderColor(ing.expiryDate)}`, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{ing.name}</span>
                          <span style={{ fontSize: 11, color: "#9ca3af" }}>{ing.category}</span>
                          <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 20, background: "#f3f4f6", color: "#6b7280" }}>{ing.location}</span>
                        </div>
                        <p style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>{ing.quantity} {ing.unit}</p>
                      </div>
                      {badge && <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: badge.bg, color: badge.color, fontWeight: 600, whiteSpace: "nowrap" }}>{badge.label}</span>}
                      <div style={{ display: "flex", gap: 2 }}>
                        <button onClick={() => openEditDialog(ing)} style={{ padding: 6, borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}><Edit style={{ width: 13, height: 13 }} /></button>
                        <button onClick={() => handleDelete(ing.id)} style={{ padding: 6, borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}><Trash2 style={{ width: 13, height: 13 }} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* 통계 4칸 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {[
                { label: "전체", value: totalCount },
                { label: "임박", value: totalExpiring, urgent: true },
                { label: "냉장·냉동", value: getLocationIngredients("냉장실").length + getLocationIngredients("냉동실").length },
                { label: "실온", value: getLocationIngredients("실온").length },
              ].map(({ label, value, urgent }) => (
                <div key={label} style={{ background: "#fff", borderRadius: 12, padding: "14px 10px", textAlign: "center", border: "1px solid #e5e7eb" }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: urgent && value > 0 ? "#b91c1c" : "#111827", lineHeight: 1 }}>{value}</p>
                  <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{label}</p>
                </div>
              ))}
            </div>

            {/* 임박 경고 */}
            {totalExpiring > 0 && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", borderRadius: 10, background: "#fef9f9", border: "1px solid #fecaca" }}>
                <AlertCircle style={{ width: 14, height: 14, color: "#b91c1c", flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: "#7f1d1d" }}>
                  <strong>{expiringNames.slice(0, 4).join(", ")}{expiringNames.length > 4 ? ` 외 ${expiringNames.length - 4}개` : ""}</strong> — 3일 내 만료
                </p>
              </div>
            )}

            {/* 보관 위치 카드 (세로형) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {LOCATIONS.map((location) => {
                const cfg = LOC_CFG[location.name];
                const items = getLocationIngredients(location.name);
                const expiring = getExpiringCountForLocation(location.name);
                return (
                  <button
                    key={location.name}
                    onClick={() => { setSelectedLocation(location.name); setSelectedCategory("전체"); setSearchQuery(""); }}
                    style={{
                      background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb",
                      padding: "18px 20px", textAlign: "left", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 16, width: "100%",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#c7d9c3"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.07)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <div style={{ width: 50, height: 50, borderRadius: 14, flexShrink: 0, background: cfg.grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                      {cfg.emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{location.name}</span>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>{items.length}개</span>
                        {expiring > 0 && (
                          <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 20, background: "#fef2f2", color: "#b91c1c", fontWeight: 600 }}>임박 {expiring}</span>
                        )}
                      </div>
                      {items.length > 0 ? (
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {items.slice(0, 5).map(item => (
                            <span key={item.id} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#f3f4f6", color: "#4b5563" }}>{item.name}</span>
                          ))}
                          {items.length > 5 && <span style={{ fontSize: 11, color: "#9ca3af" }}>+{items.length - 5}개</span>}
                        </div>
                      ) : (
                        <p style={{ fontSize: 12, color: "#9ca3af" }}>등록된 식재료가 없어요</p>
                      )}
                    </div>
                    <span style={{ color: "#d1d5db", fontSize: 20, flexShrink: 0 }}>›</span>
                  </button>
                );
              })}
            </div>

            {/* 스캔 / 영수증 버튼 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ position: "relative", overflow: "hidden" }}>
                <button disabled={isFridgeScanning} style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  padding: "13px 0", borderRadius: 12, border: "1px solid #d1d5db",
                  background: "#f9fafb", color: "#374151", fontSize: 13, fontWeight: 500,
                  cursor: isFridgeScanning ? "default" : "pointer", opacity: isFridgeScanning ? 0.6 : 1,
                }}>
                  <Camera style={{ width: 15, height: 15 }} />
                  {isFridgeScanning ? "분석 중..." : "냉장고 스캔"}
                </button>
                {!isFridgeScanning && (
                  <input type="file" accept="image/*" onChange={handleFridgeScan} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                )}
              </div>
              <button
                disabled={isReceiptUploading}
                onClick={() => { if (isReceiptReady) setIsReceiptDialogOpen(true); else { setIsReceiptUploading(true); fileInputRef.current?.click(); } }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  padding: "13px 0", borderRadius: 12, border: "1.5px dashed #d1d5db",
                  background: "#f9fafb", color: "#374151", fontSize: 13, fontWeight: 500,
                  cursor: isReceiptUploading ? "default" : "pointer", opacity: isReceiptUploading ? 0.6 : 1,
                }}
              >
                📄 {isReceiptUploading ? "분석 중..." : isReceiptReady ? "✓ 결과 확인" : "영수증으로 추가"}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleReceiptUpload} />
            </div>
          </>
        )}

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

          {/* 냉장고 스캔 결과 Dialog (메인 화면) */}
          <Dialog open={isFridgeScanDialogOpen} onOpenChange={setIsFridgeScanDialogOpen}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>냉장고 스캔 결과</DialogTitle>
                <DialogDescription>AI가 감지한 식재료입니다. 유통기한을 확인하고 저장해주세요.</DialogDescription>
              </DialogHeader>
              {(["냉장실", "냉동실", "실온"] as const).map((storage) => {
                const group = fridgeScanItems.filter((i) => i.storage === storage);
                if (!group.length) return null;
                const storageColor = storage === "냉장실" ? "#2563eb" : storage === "냉동실" ? "#7c3aed" : "#d97706";
                const storageLabel = storage === "냉장실" ? "❄ 냉장" : storage === "냉동실" ? "🧊 냉동" : "🌡 실온";
                return (
                  <div key={storage} className="mb-4">
                    <p style={{ fontSize: 12, fontWeight: 700, color: storageColor, marginBottom: 6, letterSpacing: "0.05em" }}>{storageLabel}</p>
                    <div className="space-y-2">
                      {group.map((item) => {
                        const globalIdx = fridgeScanItems.indexOf(item);
                        return (
                          <div key={globalIdx} className="border rounded-lg px-3 py-2 space-y-1.5">
                            {/* 1행: 체크박스 + 이름 + 보관 + 삭제 */}
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={item.checked}
                                onChange={(e) => setFridgeScanItems((prev) => prev.map((it, i) => i === globalIdx ? { ...it, checked: e.target.checked } : it))}
                                className="w-4 h-4 accent-primary flex-shrink-0" />
                              <Input value={item.name}
                                onChange={(e) => setFridgeScanItems((prev) => prev.map((it, i) => i === globalIdx ? { ...it, name: e.target.value } : it))}
                                className="h-7 flex-1 text-sm" />
                              <Select value={item.storage}
                                onValueChange={(v) => {
                                  setFridgeScanItems((prev) => prev.map((it, i) => {
                                    if (i !== globalIdx) return it;
                                    const expiry = getAutoExpiryDate(it.category, v, it.name);
                                    return { ...it, storage: v as any, expiryDate: expiry?.date, autoExpiry: expiry?.auto };
                                  }));
                                }}>
                                <SelectTrigger style={{ height: 28, width: 82, fontSize: 12, flexShrink: 0 }}><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="냉장실">냉장실</SelectItem>
                                  <SelectItem value="냉동실">냉동실</SelectItem>
                                  <SelectItem value="실온">실온</SelectItem>
                                </SelectContent>
                              </Select>
                              <button onClick={() => setFridgeScanItems((prev) => prev.filter((_, i) => i !== globalIdx))} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            {/* 2행: 개수 + 유통기한 */}
                            <div className="flex items-center gap-2 pl-6">
                              <input
                                value={item.quantity ?? ""}
                                onChange={(e) => setFridgeScanItems((prev) => prev.map((it, i) => i === globalIdx ? { ...it, quantity: e.target.value } : it))}
                                placeholder="개수"
                                style={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 6, padding: "2px 6px", width: 60, outline: "none", flexShrink: 0 }}
                              />
                              <CalendarIcon style={{ width: 13, height: 13, color: "#9ca3af", flexShrink: 0 }} />
                              <input
                                type="date"
                                value={item.expiryDate ?? ""}
                                onChange={(e) => setFridgeScanItems((prev) => prev.map((it, i) => i === globalIdx ? { ...it, expiryDate: e.target.value || undefined, autoExpiry: false } : it))}
                                style={{ fontSize: 12, color: item.expiryDate ? "#374151" : "#9ca3af", border: "1px solid #e5e7eb", borderRadius: 6, padding: "2px 6px", background: "transparent", outline: "none", flex: 1 }}
                              />
                              {item.autoExpiry && item.expiryDate && (
                                <span style={{ fontSize: 10, color: "#6b7280", whiteSpace: "nowrap" }}>자동</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsFridgeScanDialogOpen(false); setFridgeScanItems([]); }}>취소</Button>
                <Button onClick={handleSaveFridgeScanItems}>선택 항목 저장 ({fridgeScanItems.filter((i) => i.checked).length}개)</Button>
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
  const cfg = LOC_CFG[selectedLocation!] || LOC_CFG["실온"];

  const availableCategories = ["전체", ...Array.from(new Set(locationIngredients.map(i => i.category).filter(Boolean)))];

  const filteredIngredients = locationIngredients.filter((ing) => {
    const matchSearch = !searchQuery || ing.name.toLowerCase().includes(searchQuery.toLowerCase()) || ing.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === "전체" || ing.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const expiringIngredients = locationIngredients.filter(ing =>
    ing.expiryDate && differenceInDays(parseISO(ing.expiryDate), new Date()) >= 0 && differenceInDays(parseISO(ing.expiryDate), new Date()) <= 3
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => { setSelectedLocation(null); setSearchQuery(""); setSelectedCategory("전체"); }}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 13px", borderRadius: 8, fontSize: 13, background: "#fff", border: "1px solid #e5e7eb", color: "#374151", cursor: "pointer", fontWeight: 500 }}
          >
            <ArrowLeft style={{ width: 13, height: 13 }} /> 뒤로
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: cfg.grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              {cfg.emoji}
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{selectedLocation}</p>
              <p style={{ fontSize: 12, color: "#6b7280" }}>식재료 {locationIngredients.length}개</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setIsAddDialogOpen(true); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: "#465940", color: "#fff", border: "none", cursor: "pointer" }}
        >
          <Plus style={{ width: 13, height: 13 }} /> 추가
        </button>
      </div>

      {/* 임박 경고 */}
      {expiringCount > 0 && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 15px", borderRadius: 10, background: "#fef9f9", border: "1px solid #fecaca" }}>
          <AlertCircle style={{ width: 14, height: 14, color: "#b91c1c", flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: "#7f1d1d" }}>
            <strong>{expiringIngredients.map(i => i.name).join(", ")}</strong> — 3일 내 만료
          </p>
        </div>
      )}

      {/* 검색 */}
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 13 }}>🔍</span>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="식재료 검색..."
          style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13, color: "#374151", background: "#fff", outline: "none", boxSizing: "border-box" }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 2 }}>
            <X style={{ width: 13, height: 13 }} />
          </button>
        )}
      </div>

      {/* 카테고리 필터 */}
      {availableCategories.length > 1 && (
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          {availableCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: "5px 13px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                whiteSpace: "nowrap", border: "none", cursor: "pointer",
                background: selectedCategory === cat ? "#374151" : "#f3f4f6",
                color: selectedCategory === cat ? "#fff" : "#6b7280",
              }}
            >{cat}</button>
          ))}
        </div>
      )}

      {/* 재료 목록 */}
      {loading && filteredIngredients.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 0", color: "#9ca3af", fontSize: 14 }}>불러오는 중...</div>
      ) : filteredIngredients.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 0", color: "#9ca3af" }}>
          <p style={{ fontSize: 32, marginBottom: 10 }}>{cfg.emoji}</p>
          <p style={{ fontSize: 14 }}>{selectedCategory !== "전체" ? `${selectedCategory} 카테고리에` : `${selectedLocation}에`} 식재료가 없어요</p>
          <button onClick={() => { resetForm(); setIsAddDialogOpen(true); }} style={{ marginTop: 12, fontSize: 13, color: "#465940", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>+ 식재료 추가</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredIngredients.map((ingredient) => {
            const badge = getExpiryBadgeStyle(ingredient.expiryDate);
            const borderColor = getLeftBorderColor(ingredient.expiryDate);
            return (
              <div
                key={ingredient.id}
                style={{
                  background: "#fff", borderRadius: 12, border: "1px solid #f0f0f0",
                  borderLeft: `3px solid ${borderColor}`,
                  padding: "13px 15px", display: "flex", alignItems: "center", gap: 12,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{ingredient.name}</span>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>{ingredient.category}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 3 }}>
                    {(ingredient.quantity || ingredient.unit) && (
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{ingredient.quantity} {ingredient.unit}</span>
                    )}
                    {ingredient.expiryDate && (
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>{format(parseISO(ingredient.expiryDate), "yyyy.MM.dd")}</span>
                    )}
                    {ingredient.notes && (
                      <span style={{ fontSize: 11, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>{ingredient.notes}</span>
                    )}
                  </div>
                </div>
                {badge && (
                  <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: badge.bg, color: badge.color, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>{badge.label}</span>
                )}
                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                  <button onClick={() => openEditDialog(ingredient)} style={{ padding: 6, borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#465940")} onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
                  ><Edit style={{ width: 13, height: 13 }} /></button>
                  <button onClick={() => handleDelete(ingredient.id)} style={{ padding: 6, borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")} onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
                  ><Trash2 style={{ width: 13, height: 13 }} /></button>
                </div>
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

        {/* 냉장고 스캔 결과 Dialog */}
        <Dialog open={isFridgeScanDialogOpen} onOpenChange={setIsFridgeScanDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>냉장고 스캔 결과</DialogTitle>
              <DialogDescription>
                AI가 감지한 식재료입니다. 유통기한을 확인하고 저장해주세요.
              </DialogDescription>
            </DialogHeader>

            {(["냉장실", "냉동실", "실온"] as const).map((storage) => {
              const group = fridgeScanItems.filter((i) => i.storage === storage);
              if (!group.length) return null;
              const storageColor = storage === "냉장실" ? "#2563eb" : storage === "냉동실" ? "#7c3aed" : "#d97706";
              const storageLabel = storage === "냉장실" ? "❄ 냉장" : storage === "냉동실" ? "🧊 냉동" : "🌡 실온";
              return (
                <div key={storage} className="mb-4">
                  <p style={{ fontSize: 12, fontWeight: 700, color: storageColor, marginBottom: 6, letterSpacing: "0.05em" }}>
                    {storageLabel}
                  </p>
                  <div className="space-y-2">
                    {group.map((item) => {
                      const globalIdx = fridgeScanItems.indexOf(item);
                      return (
                        <div key={globalIdx} className="border rounded-lg px-3 py-2 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={(e) => setFridgeScanItems((prev) =>
                                prev.map((it, i) => i === globalIdx ? { ...it, checked: e.target.checked } : it)
                              )}
                              className="w-4 h-4 accent-primary flex-shrink-0"
                            />
                            <Input
                              value={item.name}
                              onChange={(e) => setFridgeScanItems((prev) =>
                                prev.map((it, i) => i === globalIdx ? { ...it, name: e.target.value } : it)
                              )}
                              className="h-7 flex-1 text-sm"
                            />
                            <Select
                              value={item.storage}
                              onValueChange={(v) => {
                                setFridgeScanItems((prev) => prev.map((it, i) => {
                                  if (i !== globalIdx) return it;
                                  const expiry = getAutoExpiryDate(it.category, v, it.name);
                                  return { ...it, storage: v as any, expiryDate: expiry?.date, autoExpiry: expiry?.auto };
                                }));
                              }}
                            >
                              <SelectTrigger style={{ height: 28, width: 82, fontSize: 12, flexShrink: 0 }}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="냉장실">냉장실</SelectItem>
                                <SelectItem value="냉동실">냉동실</SelectItem>
                                <SelectItem value="실온">실온</SelectItem>
                              </SelectContent>
                            </Select>
                            <button
                              onClick={() => setFridgeScanItems((prev) => prev.filter((_, i) => i !== globalIdx))}
                              className="text-gray-400 hover:text-red-500 flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 pl-6">
                            <input
                              value={item.quantity ?? ""}
                              onChange={(e) => setFridgeScanItems((prev) => prev.map((it, i) => i === globalIdx ? { ...it, quantity: e.target.value } : it))}
                              placeholder="개수"
                              style={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 6, padding: "2px 6px", width: 60, outline: "none", flexShrink: 0 }}
                            />
                            <CalendarIcon style={{ width: 13, height: 13, color: "#9ca3af", flexShrink: 0 }} />
                            <input
                              type="date"
                              value={item.expiryDate ?? ""}
                              onChange={(e) => setFridgeScanItems((prev) =>
                                prev.map((it, i) => i === globalIdx ? { ...it, expiryDate: e.target.value || undefined, autoExpiry: false } : it)
                              )}
                              style={{
                                fontSize: 12, color: item.expiryDate ? "#374151" : "#9ca3af",
                                border: "1px solid #e5e7eb", borderRadius: 6, padding: "2px 6px",
                                background: "transparent", outline: "none", flex: 1,
                              }}
                            />
                            {item.autoExpiry && item.expiryDate && (
                              <span style={{ fontSize: 10, color: "#6b7280", whiteSpace: "nowrap" }}>자동</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsFridgeScanDialogOpen(false); setFridgeScanItems([]); }}>
                취소
              </Button>
              <Button onClick={handleSaveFridgeScanItems}>
                선택 항목 저장 ({fridgeScanItems.filter((i) => i.checked).length}개)
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