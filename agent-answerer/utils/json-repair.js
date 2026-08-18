// ===================================================
// 大模型 JSON 自愈与鲁棒修复引擎 (Robust JSON Self-Healing)
// 专治：LaTeX 反斜杠未转义、单引号、尾随逗号、流式截断未闭合、前缀废话等格式问题
// ===================================================

/**
 * 自动闭合被截断的 JSON 字符串与括号结构
 * @param {string} str - 原始字符串
 * @returns {string} 闭合后的字符串
 */
export function autoCloseJson(str) {
  let s = String(str || '').trim();
  let inString = false;
  let isEscaped = false;
  const stack = [];

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (ch === '\\' && !isEscaped) {
        isEscaped = true;
      } else {
        if (ch === '"' && !isEscaped) {
          inString = false;
        }
        isEscaped = false;
      }
    } else {
      if (ch === '"') {
        inString = true;
      } else if (ch === '{') {
        stack.push('}');
      } else if (ch === '[') {
        stack.push(']');
      } else if (ch === '}' || ch === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === ch) {
          stack.pop();
        }
      }
    }
  }

  // 若处于未闭合的字符串内部，补齐双引号
  if (inString) {
    s += '"';
  }

  // 消除末尾因截断产生的游离逗号或冒号
  s = s.replace(/[,:\s]+$/, '');

  // 补齐所有未闭合的对象与数组括号
  while (stack.length > 0) {
    s += stack.pop();
  }

  return s;
}

/**
 * 正则稳健抽取所有已成型的题目对象 (Fallback Extractor)
 * @param {string} text - 原始文本
 * @returns {Array|null}
 */
export function fallbackExtractObjects(text) {
  const list = [];
  const objRegex = /\{[^{}]*?"id"\s*:\s*"([^"]+)"[^{}]*?\}/g;
  let match;
  while ((match = objRegex.exec(text)) !== null) {
    const rawObj = match[0];
    try {
      const sanitized = rawObj
        .replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\')
        .replace(/,\s*}/g, '}');
      const obj = JSON.parse(sanitized);
      if (obj && obj.id) list.push(obj);
    } catch (e) {
      const idMatch = rawObj.match(/"id"\s*:\s*"([^"]+)"/);
      const contentMatch = rawObj.match(/"content"\s*:\s*"([^"]+)"/);
      const typeMatch = rawObj.match(/"type"\s*:\s*"([^"]+)"/);
      if (idMatch) {
        list.push({
          id: idMatch[1],
          type: typeMatch ? typeMatch[1] : 'qa',
          skills: ['core-math'],
          content: contentMatch ? contentMatch[1] : ''
        });
      }
    }
  }
  return list.length > 0 ? list : null;
}

/**
 * 全功能 JSON 自愈修复入口
 * @param {string} raw - 模型输出的原始文本
 * @returns {any} 解析成功返回 JS 对象/数组，失败返回 null
 */
export function repairJson(raw) {
  if (!raw) return null;
  let text = String(raw).trim();

  // 1. 去除思考标签与 Markdown 代码块包裹
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  text = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();

  // 2. 定位首个 JSON 结构符号 ([ 或 {)
  const startIdx = text.search(/[{}\[]/);
  if (startIdx === -1) return null;
  text = text.slice(startIdx);

  // 3. 转义修复：修复 LaTeX 常用反斜杠（保护有效的 JSON 转义字符）
  text = text.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');

  // 4. 第一道尝试：直接解析
  try {
    return JSON.parse(text);
  } catch (e) {}

  // 5. 修复单引号与未加引号的键名
  let fixedQuotes = text
    .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"')
    .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
    .replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(fixedQuotes);
  } catch (e) {}

  // 6. 自动闭合截断结构
  const closed = autoCloseJson(fixedQuotes);
  try {
    return JSON.parse(closed);
  } catch (e) {}

  // 7. 正则对象逐个兜底抽取
  return fallbackExtractObjects(text);
}
