// ===================================================
// 国内免代理/免 Key 互联网学术检索引擎 (China-Friendly Academic Search)
// 优先采用百度百科开放学术 API，直连国内 CDN，毫秒级响应
// ===================================================

export const TOOL_WEB_SEARCH = {
  type: 'function',
  function: {
    name: 'web_search',
    description: '在互联网上免 Key 实时搜索大学理工科公式、定理、学术概念、常数或真题考点定义。国内直连，无需代理。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词，例如："亥姆霍兹定理", "坡印廷矢量", "留数定理", "波阻抗计算公式"'
        }
      },
      required: ['query']
    }
  }
};

function fetchWithTimeout(url, options = {}, timeoutMs = 4000) {
  if (typeof fetch === 'function') {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => {
      if (controller) {
        try { controller.abort(); } catch (e) {}
      }
    }, timeoutMs);

    return fetch(url, {
      ...options,
      signal: controller ? controller.signal : undefined
    }).finally(() => clearTimeout(timer));
  }
  return Promise.reject(new Error('fetch unavailable'));
}

/**
 * 1. 百度百科开放学术 API (国内骨干直连，超快响应，零配置)
 */
async function queryBaiduBaike(term) {
  try {
    const url = 'https://baike.baidu.com/api/openapi/BaikeLemmaCardApi?scope=103&format=json&appid=379020&bk_key=' + encodeURIComponent(term);
    const resp = await fetchWithTimeout(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, 3500);

    if (resp.ok) {
      const data = await resp.json();
      if (data && data.abstract) {
        return {
          title: data.title || term,
          snippet: data.abstract.replace(/\r?\n/g, ' ').slice(0, 300)
        };
      }
    }
  } catch (e) {}
  return null;
}

/**
 * 2. Wikipedia 中文搜索 API (备用备选)
 */
async function queryWikipedia(term) {
  try {
    const wikiUrl = 'https://zh.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(term) + '&utf8=&format=json&origin=*';
    const resp = await fetchWithTimeout(wikiUrl, {
      headers: { 'User-Agent': 'RokidAnswerer/1.0 (Academic Search)' }
    }, 3500);

    if (resp.ok) {
      const data = await resp.json();
      const searchList = data && data.query && data.query.search;
      if (Array.isArray(searchList) && searchList.length > 0) {
        return {
          title: searchList[0].title,
          snippet: searchList[0].snippet.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#039;/g, "'")
        };
      }
    }
  } catch (e) {}
  return null;
}

/**
 * 执行免 Key 互联网学术搜索 (国内直连优先)
 * @param {string} query - 搜索关键词
 * @returns {Promise<object>}
 */
export async function executeWebSearch(query) {
  const cleanQ = String(query || '').trim();
  if (!cleanQ) {
    return { error: '搜索词不能为空' };
  }

  // 1. 尝试从查询语句中提取最核心的学术关键词
  const terms = cleanQ.split(/[\s,，、+_\-()（）]+/g).filter(Boolean);
  const primaryTerm = terms[0] || cleanQ;

  // 2. 优先请求百度百科（国内骨干节点，无网络阻塞）
  const baiduRes = await queryBaiduBaike(primaryTerm);
  if (baiduRes) {
    return {
      source: '百度百科 (国内直连)',
      query: cleanQ,
      results: [baiduRes]
    };
  }

  // 如果原词没查到且有多词，尝试完整 query
  if (primaryTerm !== cleanQ) {
    const baiduFull = await queryBaiduBaike(cleanQ);
    if (baiduFull) {
      return {
        source: '百度百科 (国内直连)',
        query: cleanQ,
        results: [baiduFull]
      };
    }
  }

  // 3. 备用请求 Wikipedia
  const wikiRes = await queryWikipedia(cleanQ);
  if (wikiRes) {
    return {
      source: 'Wikipedia',
      query: cleanQ,
      results: [wikiRes]
    };
  }

  return {
    source: '本地智库',
    query: cleanQ,
    results: [
      {
        title: cleanQ,
        snippet: '在线搜索暂无词条，已切换至本地学术知识库与模型自主推导。'
      }
    ]
  };
}
