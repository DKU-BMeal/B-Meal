import express from 'express';
import axios from 'axios';

const router = express.Router();

const DISPLAY = 10;

const MALL_KEYWORDS = {
  '쿠팡':    ['쿠팡', 'Coupang', 'coupang'],
  '마켓컬리': ['컬리', 'Kurly', 'kurly', '마켓컬리'],
  '이마트':  ['이마트', 'emart', 'Emart', 'SSG', 'ssg'],
};

const NAVER_STORE_KEYWORDS = ['스마트스토어', 'SmartStore', 'smartstore'];

function matchesMall(mallName, targetMall) {
  return MALL_KEYWORDS[targetMall].some(k => (mallName || '').includes(k));
}

function isNaverStore(mallName) {
  return NAVER_STORE_KEYWORDS.some(k => (mallName || '').includes(k));
}

async function searchMall(query, mallName, clientId, clientSecret, page) {
  const start = (page - 1) * DISPLAY + 1;
  const response = await axios.get('https://openapi.naver.com/v1/search/shop.json', {
    params: { query: `${query} ${mallName}`, display: DISPLAY, start, sort: 'sim' },
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  });

  const matched = response.data.items.filter(item => matchesMall(item.mallName, mallName));
  const source = matched.length > 0 ? matched : response.data.items;

  return source
    .filter(item => !isNaverStore(item.mallName))
    .map(item => ({
      title: item.title.replace(/<[^>]+>/g, ''),
      price: Number(item.lprice).toLocaleString('ko-KR'),
      image: item.image,
      link: item.link,
      mall: item.mallName,
    }));
}

// GET /api/shop-search?q=재료명&page=1
router.get('/', async (req, res) => {
  const { q, page: pageStr = '1' } = req.query;
  if (!q) return res.status(400).json({ error: '검색어를 입력해주세요.' });

  const page = Math.max(1, parseInt(pageStr) || 1);
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(503).json({ error: 'NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다.' });
  }

  try {
    const results = await Promise.allSettled(
      Object.keys(MALL_KEYWORDS).map(mall => searchMall(q, mall, clientId, clientSecret, page))
    );

    const groups = results.map(r => (r.status === 'fulfilled' ? r.value : []));

    // 각 몰의 position(관련도 순위)을 기준으로 전체 정렬
    // 같은 rank 안에서는 가격 낮은 순으로 결정 → 몰 무관, 매번 동일한 결과
    const maxLen = Math.max(0, ...groups.map(g => g.length));
    const withRank = [];
    for (let rank = 0; rank < maxLen; rank++) {
      for (const group of groups) {
        if (rank < group.length) withRank.push({ ...group[rank], _rank: rank });
      }
    }
    withRank.sort((a, b) =>
      a._rank !== b._rank
        ? a._rank - b._rank
        : Number(a.price.replace(/,/g, '')) - Number(b.price.replace(/,/g, ''))
    );
    const items = withRank.map(({ _rank, ...item }) => item);

    res.json({ items, hasMore: items.length > 0 });
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.errorMessage || err.message;
    res.status(status).json({ error: message });
  }
});

export default router;
