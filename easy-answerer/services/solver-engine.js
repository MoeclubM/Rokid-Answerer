// ===================================================
// 秒出答案单轮解题服务引擎 (Solver Engine)
// ===================================================

import { API_BASE, API_KEY, API_MODELS, API_EFFORT, BUILTIN_EFFORT } from '../config.js';
import {
  SYSTEM_PROMPT,
  isNoQuestion,
  extractAnswerText,
  parseBufferedOpenAiResponse
} from '../utils/prompts.js';

export function withTimeout(promise, ms, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 云端 API 单轮解题
 */
export async function streamSolveApi({
  dataUrl,
  modelName,
  callbacks = {}
}) {
  const {
    onReasoning = () => {},
    onStream = () => {},
    onNoQuestion = () => {}
  } = callbacks;

  const base = (API_BASE || '').trim().replace(/\/+$/, '');
  const url = base.endsWith('/chat/completions')
    ? base
    : base.endsWith('/v1')
    ? base + '/chat/completions'
    : base + '/v1/chat/completions';

  const modelToUse = modelName || API_MODELS[0];
  const requestBody = {
    model: modelToUse,
    stream: true,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: '请解答照片中的这道题，按约定格式输出。' },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }
    ]
  };
  if (API_EFFORT) {
    requestBody.reasoning_effort = API_EFFORT;
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const connectTimer = setTimeout(() => {
    if (controller) {
      try { controller.abort(); } catch (e) {}
    }
  }, 15000);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + API_KEY
      },
      body: JSON.stringify(requestBody),
      signal: controller ? controller.signal : undefined,
      timeout: 60000
    });
  } catch (fetchErr) {
    if (controller && controller.signal && controller.signal.aborted) {
      throw new Error('API 首字响应超时（15s 未收到服务响应）');
    }
    throw fetchErr;
  } finally {
    clearTimeout(connectTimer);
  }

  if (!response.ok) {
    let detail = '';
    try {
      detail = await response.text();
    } catch (e) {}
    throw new Error('API 请求失败（' + response.status + '）' + String(detail).slice(0, 160));
  }

  if (!response.body || typeof response.body.getReader !== 'function') {
    let fullText = '';
    try {
      fullText = await response.text();
    } catch (e) {
      fullText = '';
    }
    const parsed = parseBufferedOpenAiResponse(fullText, (chunk) => {
      if (chunk.reasoning) {
        onReasoning(chunk.fullReasoning);
      }
      if (chunk.content) {
        onStream(chunk.fullContent, false);
      }
    });
    const cleanAnswer = extractAnswerText(parsed.content);
    if (isNoQuestion(parsed.content) || isNoQuestion(cleanAnswer)) {
      onNoQuestion();
      return null;
    }
    onStream(cleanAnswer, true);
    return cleanAnswer;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let accumulatedContent = '';
  let accumulatedReasoning = '';
  let lastRender = 0;
  let lastReasoningRender = 0;
  let done = false;

  while (!done) {
    let chunk;
    try {
      chunk = await withTimeout(reader.read(), 20000, 'API 响应超时（20s 未收到新数据）');
    } catch (e) {
      if (accumulatedContent.trim().length === 0 && accumulatedReasoning.trim().length === 0) {
        throw e;
      }
      break;
    }
    if (chunk.done) break;

    buffer += decoder.decode(chunk.value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line.indexOf('data:') !== 0) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') {
        done = true;
        break;
      }
      let json;
      try {
        json = JSON.parse(payload);
      } catch (e) {
        continue;
      }
      if (json.error) {
        throw new Error('API 错误：' + (json.error.message || JSON.stringify(json.error)));
      }
      const choice = json.choices && json.choices[0];
      const delta = choice && choice.delta;
      const reasoning =
        delta &&
        (delta.reasoning_content ||
          delta.reasoning ||
          (delta.reasoning_details && delta.reasoning_details[0] && delta.reasoning_details[0].text));
      const piece = delta && delta.content;

      if (reasoning) {
        accumulatedReasoning += reasoning;
        const now = Date.now();
        if (now - lastReasoningRender > 100) {
          lastReasoningRender = now;
          onReasoning(accumulatedReasoning);
        }
      }
      if (piece) {
        accumulatedContent += piece;
        const cleanAnswerSoFar = extractAnswerText(accumulatedContent);
        if (isNoQuestion(cleanAnswerSoFar)) {
          onNoQuestion();
          return null;
        }
        const now = Date.now();
        if (now - lastRender > 150) {
          lastRender = now;
          onStream(accumulatedContent, false);
        }
      }
    }
  }

  const finalClean = extractAnswerText(accumulatedContent);
  if (!finalClean || !finalClean.trim()) {
    if (accumulatedContent && accumulatedContent.trim()) {
      onStream(accumulatedContent, true);
      return accumulatedContent;
    }
    onNoQuestion();
    return null;
  }
  onStream(finalClean, true);
  return finalClean;
}

/**
 * 端侧内置模型单轮解题
 */
export async function streamSolveBuiltin({
  dataUrl,
  LanguageModel,
  callbacks = {}
}) {
  const {
    onReasoning = () => {},
    onStream = () => {},
    onNoQuestion = () => {}
  } = callbacks;

  const availability = await LanguageModel.availability();
  if (availability !== 'available') {
    throw new Error('当前设备未提供 AI 能力');
  }

  const session = await LanguageModel.create({
    initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }]
  });

  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: '请解答照片中的这道题，按约定格式输出。' },
        { type: 'image_url', image_url: { url: dataUrl } }
      ]
    }
  ];

  let text = null;
  if (typeof session.promptStreaming === 'function') {
    try {
      const stream = session.promptStreaming(messages);
      let accumulated = '';
      let lastRender = 0;
      let lastReasoningRender = 0;
      let lastChunkAt = Date.now();
      while (true) {
        const result = await stream.read();
        if (result.done) break;
        if (result.value !== undefined && result.value !== '') {
          accumulated += result.value;
          lastChunkAt = Date.now();
          const cleanAnswerSoFar = extractAnswerText(accumulated);
          if (isNoQuestion(cleanAnswerSoFar)) {
            onNoQuestion();
            return null;
          }
          const inlineThinkMatch = accumulated.match(/<think>([\s\S]*?)(?:<\/think>|$)/i);
          if (inlineThinkMatch && inlineThinkMatch[1]) {
            const now = Date.now();
            if (now - lastReasoningRender > 100) {
              lastReasoningRender = now;
              onReasoning(inlineThinkMatch[1]);
            }
          }
          const now = Date.now();
          if (now - lastRender > 150) {
            lastRender = now;
            onStream(accumulated, false);
          }
        } else {
          if (Date.now() - lastChunkAt > 20000) {
            throw new Error('AI 输出中断（20s）');
          }
          await sleep(40);
        }
      }
      text = accumulated;
    } catch (e) {
      text = null;
    }
  }

  if (text === null) {
    text = await session.prompt(messages);
  }
  if (session && session.destroy) {
    try { session.destroy(); } catch (e) {}
  }

  const cleanAnswer = extractAnswerText(text);
  if (isNoQuestion(text) || isNoQuestion(cleanAnswer)) {
    onNoQuestion();
    return null;
  }
  onStream(cleanAnswer, true);
  return cleanAnswer;
}
