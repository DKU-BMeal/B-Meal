import express from 'express';
import axios from 'axios';

const router = express.Router();

const MALL_KEYWORDS = {
  '쿠팡':    ['쿠팡', 'Coupang', 'coupang'],
  '마켓컬리': ['컬리', 'Kurly', 'kurly', '마켓컬리'],
  '이마트':  ['이마트', 'emart', 'Emart', 'SSG', 'ssg'],
};

function matchesMall(mallName, targetMall) {
  const keywords = MALL_KEYWORDS[targetMall] || [targetMall];
  return keywords.some(k => mallName.includes(k));
}

async function searchMall(query, mallName, clientId, clientSecret) {
  const response = await axios.get('https://openapi.naver.com/v1/search/shop.json', {
    params: { query: `${query} ${mallName}`, display: 20, sort: 'sim' },
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  });

  const matched = response.data.items.filter(item =>
    matchesMall(item.mallName || '', mallName)
  );

  // mallName 필터로 매칭 안 되면 상위 결과 그냥 사용
  const source = matched.length > 0 ? matched : response.data.items;

  return source.slice(0, 8).map(item => ({
    title: item.title.replace(/<[^>]+>/g, ''),
    price: Number(item.lprice).toLocaleString('ko-KR'),
    image: item.image,
    link: item.link,
    mall: item.mallName,
  }));
}

// GET /api/shop-search?q=재료명
router.get('/', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: '검색어를 입력해주세요.' });

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(503).json({ error: 'NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다.' });
  }

  try {
    const results = await Promise.allSettled(
      Object.keys(MALL_KEYWORDS).map(mall => searchMall(q, mall, clientId, clientSecret))
    );

    const items = results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));

    res.json({ items });
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.errorMessage || err.message;
    res.status(status).json({ error: message });
  }
});

export default router;
