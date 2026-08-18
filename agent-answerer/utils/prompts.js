// ===================================================
// 全能通用问答与解题提示词解析器 (Universal Question & Task Solver)
// Stage 1 精准学科领域描述，Stage 2 动态自适应工具调度
// ===================================================

import { repairJson, fallbackExtractObjects, autoCloseJson } from './json-repair.js';

export { repairJson, fallbackExtractObjects, autoCloseJson };

export const STAGE1_EXTRACT_PROMPT = `提取图片中的所有题目，严禁解答。
按题目顺序输出 JSON 数组，每项包含题号 id 和完整题目内容 content：
[{"id": "1", "content": "题目1完整内容..."}, {"id": "2", "content": "题目2完整内容..."}]
若无题目则输出 NO_QUESTION。`;

export const STAGE2_SOLVE_PROMPT = `请解答本问题。可自由调用工具联网搜索、检索知识库或执行计算。`;

export const STAGE3_SUMMARY_PROMPT = `整理为极简 AR 排版：
1. 选择题/填空题：只给答案，同行不换行（如 "1. A  2. B  3. 2π"），严禁写任何解析或多余说明。
2. 解答题/大题：只保留核心拿分步骤与最终结论，严禁文字铺垫，数学公式使用标准 LaTeX 格式（支持 $$...$$ 与 $...$）。`;

export function sanitizeJsonString(raw) {
  let s = String(raw || '').trim();
  s = s.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  return s.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
}

export function isNoQuestion(text) {
  if (!text) return false;
  const upper = String(text).toUpperCase().replace(/\s+/g, '');
  return (
    upper.indexOf('NO_QUESTION') !== -1 ||
    upper.indexOf('NOQUESTION') !== -1 ||
    upper.indexOf('未识别到题目') !== -1 ||
    upper.indexOf('没有找到题目') !== -1 ||
    upper.indexOf('未识别到问题') !== -1 ||
    upper.indexOf('没有问题') !== -1
  );
}

export function extractAnswerText(text) {
  if (!text) return '';
  let str = String(text);
  str = str.replace(/<think>[\s\S]*?<\/think>/gi, '');
  str = str.replace(/<think>[\s\S]*$/gi, '');
  return str.trim();
}

export function hasVisibleContent(blocks) {
  if (!blocks || blocks.length === 0) return false;
  return blocks.some((b) => {
    if (b.type === 'text') return b.text && b.text.trim().length > 0;
    if (b.type === 'formula') return (b.latex && b.latex.trim().length > 0) || (b.unicode && b.unicode.trim().length > 0);
    if (b.type === 'formula-pending') return b.text && b.text.trim().length > 0;
    return false;
  });
}

export function parseBufferedOpenAiResponse(fullText, onChunk) {
  if (!fullText) return { content: '', reasoning: '', tool_calls: null };
  const lines = fullText.split(/\r?\n/);
  let accumulatedContent = '';
  let accumulatedReasoning = '';
  const accumulatedToolCalls = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.indexOf('data:') !== 0) continue;
    const payload = line.slice(5).trim();
    if (payload === '[DONE]') break;
    let json;
    try {
      json = JSON.parse(payload);
    } catch (e) {
      continue;
    }
    const choice = json.choices && json.choices[0];
    const delta = choice && (choice.delta || choice.message);
    const reasoning =
      delta &&
      (delta.reasoning_content ||
        delta.reasoning ||
        (delta.reasoning_details && delta.reasoning_details[0] && delta.reasoning_details[0].text));
    const piece = delta && delta.content;

    if (delta && delta.tool_calls) {
      for (let tcIdx = 0; tcIdx < delta.tool_calls.length; tcIdx++) {
        const tc = delta.tool_calls[tcIdx];
        const idx = tc.index !== undefined ? tc.index : accumulatedToolCalls.length;
        if (!accumulatedToolCalls[idx]) {
          accumulatedToolCalls[idx] = {
            id: tc.id || ('call_' + idx),
            type: 'function',
            function: { name: '', arguments: '' }
          };
        }
        if (tc.id) accumulatedToolCalls[idx].id = tc.id;
        if (tc.function && tc.function.name) accumulatedToolCalls[idx].function.name += tc.function.name;
        if (tc.function && tc.function.arguments) accumulatedToolCalls[idx].function.arguments += tc.function.arguments;
      }
    }

    if (reasoning) {
      accumulatedReasoning += reasoning;
      if (onChunk) onChunk({ reasoning: reasoning, content: '', fullReasoning: accumulatedReasoning, fullContent: accumulatedContent });
    }
    if (piece) {
      accumulatedContent += piece;
      if (onChunk) onChunk({ reasoning: '', content: piece, fullReasoning: accumulatedReasoning, fullContent: accumulatedContent });
    }
  }

  return {
    content: accumulatedContent,
    reasoning: accumulatedReasoning,
    tool_calls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : null
  };
}

export function parsePartialQuestions(text) {
  const clean = String(text || '').replace(/<think>[\s\S]*?<\/think>/gi, '');
  const res = repairJson(clean);
  if (Array.isArray(res) && res.length > 0) {
    return res;
  }
  if (res && typeof res === 'object' && res.id) {
    return [res];
  }
  return fallbackExtractObjects(clean) || [];
}
