/**
 * 식약처 레시피 API 유틸리티
 * API 문서: https://www.foodsafetykorea.go.kr/api/openApiInfo.do?menu_grp=MENU_GRP31&menu_no=661
 */

const FOODSAFETY_API_KEY = process.env.FOODSAFETY_API_KEY || 'YOUR_API_KEY';
const API_BASE_URL = 'http://openapi.foodsafetykorea.go.kr/api';
const SERVICE_NAME = 'COOKRCP01';

/**
 * 헬퍼 함수: 빈 문자열을 null로 변환
 * API 응답 값이 undefined, null, 또는 trim() 후 빈 문자열인 경우 null을 반환합니다.
 * @param {string|null|undefined} value
 * @returns {string|null}
 */
function emptyToNull(value) {
  if (value === undefined || value === null) {
    return null;
  }
  // 문자열로 변환 후 trim()을 수행하여 공백만 있는 경우도 처리합니다.
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}


/**
 * 식약처 API 호출 (전체 레시피 목록)
 * @param {number} start - 시작 인덱스 (1부터 시작)
 * @param {number} end - 끝 인덱스
 * @returns {Promise<Object>} API 응답
 */
export async function getRecipes(start = 1, end = 100) {
  try {
    const url = `${API_BASE_URL}/${FOODSAFETY_API_KEY}/${SERVICE_NAME}/json/${start}/${end}`;
    
    console.log(`[FoodSafety API] Fetching recipes: ${start}-${end}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.COOKRCP01 || (data.COOKRCP01.RESULT?.CODE !== 'INFO-000' && data.COOKRCP01.RESULT?.CODE !== 'INFO-300')) {
      console.error('[FoodSafety API] Error:', data);
      throw new Error(data.COOKRCP01?.RESULT?.MSG || 'Failed to fetch recipes');
    }
    
    // 데이터가 없는 경우 (INFO-300)에는 빈 배열을 반환하여 크롤링 로직이 멈추지 않도록 처리
    if (data.COOKRCP01.RESULT?.CODE === 'INFO-300') {
      console.log('[FoodSafety API] No data found in this range (INFO-300).');
      return { row: [] };
    }
    
    return data.COOKRCP01;
  } catch (error) {
    console.error('[FoodSafety API] Error fetching recipes:', error);
    throw error;
  }
}

/**
 * 레시피 상세 정보 조회 (ID로 검색) - DB 도입 후 사용되지 않을 가능성이 높으나 기존 함수 유지
 * @param {string} recipeId - 레시피 ID (RCP_SEQ)
 * @returns {Promise<Object|null>} 레시피 상세 정보
 */
export async function getRecipeDetail(recipeId) {
  try {
    const batchSize = 1000;
    let found = null;
    const maxRecipes = 3000; 
    
    for (let start = 1; start <= maxRecipes; start += batchSize) {
      const end = Math.min(start + batchSize - 1, maxRecipes);
      const result = await getRecipes(start, end);
      
      if (result.row && Array.isArray(result.row)) {
        found = result.row.find(recipe => recipe.RCP_SEQ === recipeId);
        if (found) break;
      }
      await new Promise(resolve => setTimeout(resolve, 100)); // Rate Limiting 방지
    }
    
    return found;
  } catch (error) {
    console.error(`[FoodSafety API] Error fetching recipe ${recipeId}:`, error);
    throw error;
  }
}


/**
 * 레시피 데이터를 확장된 DB 스키마에 맞게 전체 데이터로 변환
 * @param {Object} recipe - 식약처 레시피 객체
 * @returns {Object} DB 삽입용 전체 레시피 데이터 (빈 값은 모두 null 처리)
 */
export function toFullRecipe(recipe) {
  const ingredientsDetails = emptyToNull(recipe.RCP_PARTS_DTLS);
  
  // 재료 개수 계산 로직
  const parts = ingredientsDetails ? ingredientsDetails.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];
  const ingredientsCount = parts.length;
  
  const fullRecipe = {
    id: emptyToNull(recipe.RCP_SEQ),
    name: emptyToNull(recipe.RCP_NM),
    category: emptyToNull(recipe.RCP_PAT2),
    cooking_method: emptyToNull(recipe.RCP_WAY2),
    
    // 이미지 경로
    image_small: emptyToNull(recipe.ATT_FILE_NO_MAIN),
    image_large: emptyToNull(recipe.ATT_FILE_NO_MK),
    
    // 영양 정보 (모두 NULL 허용)
    info_weight: emptyToNull(recipe.INFO_WGT),
    info_energy: emptyToNull(recipe.INFO_ENG),
    info_carb: emptyToNull(recipe.INFO_CAR),
    info_protein: emptyToNull(recipe.INFO_PRO),
    info_fat: emptyToNull(recipe.INFO_FAT),
    info_sodium: emptyToNull(recipe.INFO_NA),
    
    // 상세 재료 및 팁
    ingredients_details: ingredientsDetails,
    hashtags: emptyToNull(recipe.HASH_TAG),
    sodium_tip: emptyToNull(recipe.RCP_NA_TIP),
    
    // 만드는 법 (MANUAL01 ~ MANUAL20)
    // 모든 MANUAL 필드는 emptyToNull을 통해 빈 값은 DB에 NULL로 들어갑니다.
    manual_01: emptyToNull(recipe.MANUAL01), manual_02: emptyToNull(recipe.MANUAL02), manual_03: emptyToNull(recipe.MANUAL03),
    manual_04: emptyToNull(recipe.MANUAL04), manual_05: emptyToNull(recipe.MANUAL05), manual_06: emptyToNull(recipe.MANUAL06),
    manual_07: emptyToNull(recipe.MANUAL07), manual_08: emptyToNull(recipe.MANUAL08), manual_09: emptyToNull(recipe.MANUAL09),
    manual_10: emptyToNull(recipe.MANUAL10), manual_11: emptyToNull(recipe.MANUAL11), manual_12: emptyToNull(recipe.MANUAL12),
    manual_13: emptyToNull(recipe.MANUAL13), manual_14: emptyToNull(recipe.MANUAL14), manual_15: emptyToNull(recipe.MANUAL15),
    manual_16: emptyToNull(recipe.MANUAL16), manual_17: emptyToNull(recipe.MANUAL17), manual_18: emptyToNull(recipe.MANUAL18),
    manual_19: emptyToNull(recipe.MANUAL19), manual_20: emptyToNull(recipe.MANUAL20),

    // 기타 메타데이터
    ingredients_count: ingredientsCount,
  };
  
  return fullRecipe;
}

/**
 * MANUAL 단계를 배열로 변환 (UI 표시용)
 * @param {Object} recipe - 식약처 레시피 객체
 * @returns {Array} Step 배열
 */
export function parseSteps(recipe) {
  const steps = [];
  
  for (let i = 1; i <= 20; i++) {
    const stepNum = String(i).padStart(2, '0');
    const manualKey = `MANUAL${stepNum}`;
    const imageKey = `MANUAL_IMG${stepNum}`;
    
    const text = emptyToNull(recipe[manualKey]); // 빈 값 처리 로직 적용
    
    // 빈 단계는 스킵
    if (!text) {
      continue;
    }
    
    steps.push({
      step: steps.length + 1,
      text: text,
      // 만드는법_이미지 필드는 DB에 저장하지 않더라도, parseSteps는 클라이언트 UI에서 사용될 수 있으므로 유지합니다.
      image: emptyToNull(recipe[imageKey]) 
    });
  }
  
  return steps;
}

/**
 * 카테고리 매핑 (식약처 → 자체 카테고리)
 * @param {string} foodsafetyCategory - 식약처 카테고리
 * @returns {string} 매핑된 카테고리
 */
export function mapCategory(foodsafetyCategory) {
  const categoryMap = {
    '밑반찬': '반찬',
    '메인반찬': '반찬',
    '국&찌개': '국/찌개',
    '찌개': '국/찌개',
    '국물요리': '국/찌개',
    '면/만두': '면류',
    '밥': '밥',
    '일품': '일품',
    '후식': '디저트',
    '디저트': '디저트',
    '퓨전': '퓨전',
    '김치/젓갈/장류': '밑반찬',
    '양념/소스/잼': '양념',
    '음료': '음료',
    '기타': '기타'
  };
  
  return categoryMap[foodsafetyCategory] || foodsafetyCategory || '기타';
}

/**
 * 전체 레시피 크롤링 (초기 데이터 수집용)
 * @returns {Promise<Array>} 모든 레시피 배열
 */
export async function crawlAllRecipes() {
  const allRecipes = [];
  const batchSize = 1000;
  const maxRecipes = 3000;
  
  console.log('[FoodSafety API] Starting full crawl...');
  
  for (let start = 1; start <= maxRecipes; start += batchSize) {
    const end = Math.min(start + batchSize - 1, maxRecipes);
    
    try {
      // getRecipes는 INFO-300일 때 빈 배열을 포함하는 객체를 반환하도록 수정되었습니다.
      const result = await getRecipes(start, end); 
      
      if (result.row && Array.isArray(result.row)) {
        // 크롤링 데이터를 toFullRecipe로 변환하여 DB에 삽입해야 합니다.
        // 여기서는 raw 데이터를 반환하지만, 실제 DB 삽입 스크립트에서 toFullRecipe를 사용해야 합니다.
        allRecipes.push(...result.row);
        console.log(`[FoodSafety API] Crawled ${allRecipes.length} recipes...`);
      } else if (result.row && result.row.length === 0) {
          // INFO-300 (데이터 없음)으로 인해 row가 비어 있으면 반복을 종료할 수도 있습니다.
          // 현재는 maxRecipes까지 계속 시도하도록 유지합니다.
      }
      
      // API Rate Limiting 방지
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`[FoodSafety API] Error crawling batch ${start}-${end}:`, error);
    }
  }
  
  console.log(`[FoodSafety API] Crawl complete: ${allRecipes.length} total recipes`);
  return allRecipes;
}

export default {
  getRecipes,
  getRecipeDetail,
  parseSteps,
  toFullRecipe, // 새로운 toFullRecipe 함수를 export
  mapCategory,
  crawlAllRecipes
};