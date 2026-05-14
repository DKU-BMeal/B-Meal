import pool from "../config/db.js";

/**
 * GET /api/diet-report/stats?period=week|month
 */
export const getDietStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const period = req.query.period === "month" ? 30 : 7;

    // 1. 기간 내 완료 요리 + 영양정보
    const [rows] = await pool.query(`
      SELECT
        cr.id, cr.name, cr.category, cr.completed_at,
        COALESCE(NULLIF(r.info_energy, ''), '0')  AS energy,
        COALESCE(NULLIF(r.info_carb,   ''), '0')  AS carb,
        COALESCE(NULLIF(r.info_protein,''), '0')  AS protein,
        COALESCE(NULLIF(r.info_fat,    ''), '0')  AS fat,
        COALESCE(NULLIF(r.info_sodium, ''), '0')  AS sodium
      FROM completed_recipes cr
      LEFT JOIN recipes r ON cr.recipe_id = r.id
      WHERE cr.user_id = ?
        AND cr.completed_at >= NOW() - (? * INTERVAL '1 day')
      ORDER BY cr.completed_at ASC
    `, [userId, period]);

    // 2. 일별 집계
    const dailyMap = {};
    rows.forEach((row) => {
      const date = new Date(row.completed_at).toISOString().slice(0, 10);
      if (!dailyMap[date]) {
        dailyMap[date] = { date, energy: 0, carb: 0, protein: 0, fat: 0, sodium: 0, count: 0 };
      }
      dailyMap[date].energy  += parseFloat(row.energy)  || 0;
      dailyMap[date].carb    += parseFloat(row.carb)    || 0;
      dailyMap[date].protein += parseFloat(row.protein) || 0;
      dailyMap[date].fat     += parseFloat(row.fat)     || 0;
      dailyMap[date].sodium  += parseFloat(row.sodium)  || 0;
      dailyMap[date].count   += 1;
    });

    // 3. 빈 날짜 채우기
    const daily = [];
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      daily.push(dailyMap[key] || { date: key, energy: 0, carb: 0, protein: 0, fat: 0, sodium: 0, count: 0 });
    }

    // 4. 카테고리 빈도
    const catMap = {};
    rows.forEach((row) => {
      const cat = row.category || "기타";
      catMap[cat] = (catMap[cat] || 0) + 1;
    });
    const categories = Object.entries(catMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // 5. 기간 평균 영양소
    const activeDays = Object.keys(dailyMap).length || 1;
    const totals = daily.reduce(
      (acc, d) => ({
        energy:  acc.energy  + d.energy,
        carb:    acc.carb    + d.carb,
        protein: acc.protein + d.protein,
        fat:     acc.fat     + d.fat,
        sodium:  acc.sodium  + d.sodium,
      }),
      { energy: 0, carb: 0, protein: 0, fat: 0, sodium: 0 }
    );
    const avg = {
      energy:  Math.round(totals.energy  / activeDays),
      carb:    Math.round(totals.carb    / activeDays),
      protein: Math.round(totals.protein / activeDays),
      fat:     Math.round(totals.fat     / activeDays),
      sodium:  Math.round(totals.sodium  / activeDays),
    };

    // 6. 이전 기간 평균 칼로리 (트렌드 비교)
    const [prevRows] = await pool.query(`
      SELECT COALESCE(NULLIF(r.info_energy, ''), '0') AS energy
      FROM completed_recipes cr
      LEFT JOIN recipes r ON cr.recipe_id = r.id
      WHERE cr.user_id = ?
        AND cr.completed_at >= NOW() - (? * INTERVAL '1 day')
        AND cr.completed_at <  NOW() - (? * INTERVAL '1 day')
    `, [userId, period * 2, period]);

    const prevEnergySum = prevRows.reduce((s, r) => s + (parseFloat(r.energy) || 0), 0);
    const prevAvgEnergy = prevRows.length > 0 ? Math.round(prevEnergySum / period) : null;

    // 7. 개별 요리 목록
    const recentRecipes = rows.map(r => ({
      name: r.name,
      category: r.category || '기타',
      energy: Math.round(parseFloat(r.energy) || 0),
    }));

    // 8. 누적 전체 통계 (기간 무관)
    const [allRows] = await pool.query(`
      SELECT COALESCE(NULLIF(r.info_energy, ''), '0') AS energy
      FROM completed_recipes cr
      LEFT JOIN recipes r ON cr.recipe_id = r.id
      WHERE cr.user_id = ?
    `, [userId]);

    const totalCooksAll = allRows.length;
    const totalEnergyAll = Math.round(allRows.reduce((s, r) => s + (parseFloat(r.energy) || 0), 0));

    res.json({
      daily,
      categories,
      avg,
      totalCooks: rows.length,
      period,
      recentRecipes,
      prevAvgEnergy,
      totalCooksAll,
      totalEnergyAll,
    });
  } catch (err) {
    console.error("getDietStats error:", err);
    res.status(500).json({ message: "식생활 데이터 조회 실패" });
  }
};

/**
 * GET /api/diet-report/profile
 */
export const getDietProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      `SELECT name, allergies, preferences FROM users WHERE id = ?`,
      [userId]
    );
    if (!rows.length) return res.status(404).json({ message: "유저 없음" });
    res.json(rows[0]);
  } catch (err) {
    console.error("getDietProfile error:", err);
    res.status(500).json({ message: "프로필 조회 실패" });
  }
};

/**
 * GET /api/diet-report/recommendations
 * 프로필 기반 맞춤 레시피 추천 (recipes 테이블에서 필터링)
 */
export const getDietRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;

    const [userRows] = await pool.query(
      `SELECT allergies, preferences FROM users WHERE id = ?`,
      [userId]
    );
    if (!userRows.length) return res.status(404).json({ message: "유저 없음" });

    let { allergies, preferences } = userRows[0];

    // JSONB → JS 객체 변환
    const parseField = (val, fallback) => {
      if (val === null || val === undefined) return fallback;
      if (typeof val === 'object') return val;
      try { return JSON.parse(val); } catch { return fallback; }
    };

    allergies   = parseField(allergies, []);
    preferences = parseField(preferences, {});

    if (!Array.isArray(allergies)) allergies = [];
    if (typeof preferences !== 'object' || preferences === null) preferences = {};

    const hasProfile =
      allergies.length > 0 ||
      Object.keys(preferences).length > 0;

    if (!hasProfile) {
      return res.json({ hasProfile: false, recommendations: [] });
    }

    const prefStr = JSON.stringify(preferences).toLowerCase();
    const isHighBloodPressure = prefStr.includes('고혈압');
    const isDiabetes          = prefStr.includes('당뇨');
    const isVeganOrVeg        = prefStr.includes('비건') || prefStr.includes('채식');

    // 동적 WHERE 조건 구성
    const conditions = [];
    const params     = [];

    // 알러지 재료 이름 제외
    for (const a of allergies) {
      if (typeof a === 'string' && a.trim()) {
        conditions.push('name NOT ILIKE ?');
        params.push(`%${a.trim()}%`);
      }
    }

    // 비건/채식: 육류 키워드 제외
    if (isVeganOrVeg) {
      for (const term of ['돼지고기', '삼겹살', '베이컨', '닭고기', '소고기', '쇠고기', '갈비', '육류']) {
        conditions.push('name NOT ILIKE ?');
        params.push(`%${term}%`);
      }
    }

    // 고혈압: 나트륨 낮은 것만 (빈 값은 허용)
    if (isHighBloodPressure) {
      conditions.push(`(
        info_sodium IS NULL OR info_sodium = '' OR
        (info_sodium ~ '^[0-9]+\\.?[0-9]*$' AND info_sodium::numeric < 600)
      )`);
    }

    // 당뇨: 탄수화물 낮은 것만
    if (isDiabetes) {
      conditions.push(`(
        info_carb IS NULL OR info_carb = '' OR
        (info_carb ~ '^[0-9]+\\.?[0-9]*$' AND info_carb::numeric < 50)
      )`);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const [recipes] = await pool.query(`
      SELECT id, name, category, info_energy, image_small
      FROM recipes
      ${whereClause}
      ORDER BY RANDOM()
      LIMIT 6
    `, params);

    res.json({
      hasProfile: true,
      recommendations: recipes,
      context: { isHighBloodPressure, isDiabetes, isVeganOrVeg, allergies },
    });
  } catch (err) {
    console.error("getDietRecommendations error:", err);
    res.status(500).json({ message: "추천 조회 실패" });
  }
};
