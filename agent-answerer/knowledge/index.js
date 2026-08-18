// ===================================================
// 专业学科知识库 RAG 语义聚合与检索中心 (RAG Knowledge Engine)
// 支持 BM25 词频饱和、文档长度归一化、多字段加权与置信度评分
// ===================================================

import { SIGNALS_SYSTEMS_KNOWLEDGE } from './signals-systems.js';
import { COMPLEX_ANALYSIS_KNOWLEDGE } from './complex-analysis.js';
import { ELECTROMAGNETICS_KNOWLEDGE } from './electromagnetics.js';

// 知识库总表注册中心
export const KNOWLEDGE_MODULES = {
  'signals-systems': SIGNALS_SYSTEMS_KNOWLEDGE,
  'complex-analysis': COMPLEX_ANALYSIS_KNOWLEDGE,
  'electromagnetics': ELECTROMAGNETICS_KNOWLEDGE
};

// 获取所有已注册的知识条目
export function getAllKnowledgeEntries() {
  const all = [];
  const keys = Object.keys(KNOWLEDGE_MODULES);
  for (let i = 0; i < keys.length; i++) {
    const list = KNOWLEDGE_MODULES[keys[i]] || [];
    for (let j = 0; j < list.length; j++) {
      all.push(list[j]);
    }
  }
  return all;
}

// 提取查询字符串的多尺度 CJK 与英文分词 N-gram
function extractQueryTokens(query) {
  const clean = String(query || '').toLowerCase().trim();
  const rawTokens = clean.split(/[\s,，、+_\-()（）;:；：.。!?！？\/\\]+/g).filter(Boolean);
  const set = new Set(rawTokens);

  for (let i = 0; i < rawTokens.length; i++) {
    const tok = rawTokens[i];
    if (tok.length >= 2) {
      for (let l = 2; l <= Math.min(4, tok.length); l++) {
        for (let start = 0; start <= tok.length - l; start++) {
          set.add(tok.slice(start, start + l));
        }
      }
    }
  }
  return { raw: rawTokens, all: Array.from(set), query: clean };
}

/**
 * 专业学科 RAG 关联度匹配检索引擎
 * @param {string} query - 检索查询词或题型特征
 * @param {string} domain - 限定学科领域 ('all' | 'signals-systems' | 'complex-analysis' | 'electromagnetics')
 * @param {number} topK - 返回的最大候选条目数 (默认 3)
 */
export function searchKnowledgeBase(query, domain = 'all', topK = 3) {
  const tokens = extractQueryTokens(query);
  if (tokens.all.length === 0) return [];

  const entries = (domain && domain !== 'all' && KNOWLEDGE_MODULES[domain])
    ? KNOWLEDGE_MODULES[domain]
    : getAllKnowledgeEntries();

  if (entries.length === 0) return [];

  let totalLength = 0;
  const docProfiles = entries.map((entry) => {
    const titleText = String(entry.title || '').toLowerCase();
    const kwText = Array.isArray(entry.keywords) ? entry.keywords.join(' ').toLowerCase() : '';
    const formulaText = Array.isArray(entry.formulas) ? entry.formulas.join(' ').toLowerCase() : '';
    const bodyText = ((entry.summary || '') + ' ' + (Array.isArray(entry.method) ? entry.method.join(' ') : '')).toLowerCase();
    const fullText = titleText + ' ' + kwText + ' ' + formulaText + ' ' + bodyText;
    totalLength += fullText.length;

    return {
      entry,
      titleText,
      kwText,
      formulaText,
      bodyText,
      len: fullText.length
    };
  });

  const avgLen = totalLength / entries.length;
  const candidates = [];

  for (let i = 0; i < docProfiles.length; i++) {
    const doc = docProfiles[i];
    let score = 0;

    // 1. 原文短语精确匹配加分 (Exact Phrase Boost)
    if (doc.titleText.includes(tokens.query)) score += 45;
    else if (doc.kwText.includes(tokens.query)) score += 30;
    else if (doc.formulaText.includes(tokens.query)) score += 20;
    else if (doc.bodyText.includes(tokens.query)) score += 12;

    // 2. BM25 多字段加权与长度归一化 (BM25 Multi-field Scoring)
    const lenNorm = 0.5 + 0.5 * (doc.len / avgLen);

    for (let t = 0; t < tokens.all.length; t++) {
      const token = tokens.all[t];
      const isLong = token.length >= 3;
      const termBoost = isLong ? 2.5 : 1.0;

      let tf = 0;
      if (doc.titleText.includes(token)) tf += 4.5;
      if (doc.kwText.includes(token)) tf += 3.5;
      if (doc.formulaText.includes(token)) tf += 2.0;
      if (doc.bodyText.includes(token)) tf += 1.0;

      if (tf > 0) {
        // BM25 词频饱和公式
        const bm25Tf = (tf * 2.2) / (tf + 1.2 * lenNorm);
        score += bm25Tf * termBoost;
      }
    }

    if (score > 0) {
      candidates.push({
        entry: doc.entry,
        rawScore: score
      });
    }
  }

  if (candidates.length === 0) return [];

  candidates.sort((a, b) => b.rawScore - a.rawScore);
  const maxScore = candidates[0].rawScore;

  return candidates.slice(0, topK).map((c) => {
    const relevancePercent = Math.min(99, Math.max(50, Math.round((c.rawScore / maxScore) * 98))) + '%';
    return {
      id: c.entry.id,
      domain: c.entry.domain,
      title: c.entry.title,
      relevance: relevancePercent,
      summary: c.entry.summary,
      formulas: c.entry.formulas,
      method: c.entry.method
    };
  });
}
