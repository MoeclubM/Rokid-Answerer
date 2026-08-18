// ===================================================
// 全能通用问答与解题提示词解析器 (Universal Question & Task Solver)
// 选填只给不换行的答案，解答只给核心拿分步骤
// ===================================================

export const SYSTEM_PROMPT = `解答照片中的问题，紧凑极简排版：
1. 选择/填空题：只给答案，同行不换行（如 "1. A  2. B"），无任何解析。
2. 解答题：只给核心拿分步骤与结论。所有数学公式、方程式、变量表达式（无论长短，如 $$x=0$$、$$y(x)$$）必须全部使用 $$...$$ 单独成行包裹，严禁在正文行内混杂行内公式。
无问题输出 NO_QUESTION。`;

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
