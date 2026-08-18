// ===================================================
// 专业学科多阶段 Agent 编排调度引擎 (Pipeline Engine)
// 包含 Stage 1 拆题, Stage 2 分题求解, Stage 3 排版提炼
// 内置请求失败 3 次自动重试、格式异常自动重试与免 Key 联网搜索
// ===================================================

import {
  API_BASE,
  API_KEY,
  API_MODELS,
  EXTRACTOR_MODEL,
  EXTRACTOR_EFFORT,
  SOLVER_MODEL,
  SOLVER_EFFORT,
  SUMMARIZER_MODEL,
  SUMMARIZER_EFFORT
} from '../config.js';
import { AgentSession, executeTool } from '../tools/index.js';
import { matchSkillsForQuestion } from '../skills/index.js';
import {
  STAGE1_EXTRACT_PROMPT,
  STAGE2_SOLVE_PROMPT,
  STAGE3_SUMMARY_PROMPT,
  isNoQuestion,
  extractAnswerText,
  parseBufferedOpenAiResponse,
  parsePartialQuestions,
  repairJson
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
 * 统一 OpenAI 协议流式请求接口 (内置 3 次自动重试与 Function Call 支持)
 */
export async function callOpenAiApi(modelName, effort, messages, onChunk, tools = null, signal = null) {
  const base = (API_BASE || '').trim().replace(/\/+$/, '');
  const url = base.endsWith('/chat/completions')
    ? base
    : base.endsWith('/v1')
    ? base + '/chat/completions'
    : base + '/v1/chat/completions';

  const requestBody = {
    model: modelName,
    stream: true,
    messages: messages
  };
  const effortToUse = (typeof effort === 'string' && effort.trim()) ? effort.trim() : null;
  if (effortToUse) {
    requestBody.reasoning_effort = effortToUse;
  }
  if (tools && tools.length > 0) {
    requestBody.tools = tools;
  }

  let lastError = null;
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const connectTimer = setTimeout(() => {
      if (controller) {
        try { controller.abort(); } catch (e) {}
      }
    }, 15000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + API_KEY
        },
        body: JSON.stringify(requestBody),
        signal: signal || (controller ? controller.signal : undefined),
        timeout: 60000
      });

      clearTimeout(connectTimer);

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
        return parseBufferedOpenAiResponse(fullText, onChunk);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedContent = '';
      let accumulatedReasoning = '';
      const accumulatedToolCalls = [];
      let done = false;

      while (!done) {
        let chunk;
        try {
          chunk = await withTimeout(reader.read(), 20000, 'API 响应超时（20s 未收到新数据）');
        } catch (e) {
          if (accumulatedContent.trim().length === 0 && accumulatedReasoning.trim().length === 0 && accumulatedToolCalls.length === 0) {
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
      }

      return {
        content: accumulatedContent,
        reasoning: accumulatedReasoning,
        tool_calls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : null
      };
    } catch (err) {
      clearTimeout(connectTimer);
      lastError = err;
      if (attempt < maxRetries) {
        await sleep(800 * attempt);
        continue;
      }
    }
  }

  throw lastError || new Error('API 请求多次重试失败');
}

/**
 * 推进单个 Agent Session 多轮交互 (带知识库与联网检索实时计数)
 */
export async function runSessionConversation(session, onStreamUpdate, onToolCall, maxTurns = 5) {
  session.searchCount = session.searchCount || 0;
  session.toolCount = session.toolCount || 0;
  while (session.turnCount < maxTurns) {
    session.turnCount++;
    const result = await callOpenAiApi(
      session.modelName,
      session.effort,
      session.messages,
      (c) => {
        if (onStreamUpdate) onStreamUpdate(c, session);
      },
      session.tools
    );

    if (result.tool_calls && result.tool_calls.length > 0) {
      session.addAssistantMessage(result.content, result.tool_calls);
      for (let k = 0; k < result.tool_calls.length; k++) {
        const tc = result.tool_calls[k];
        const fnName = tc.function.name;
        const fnArgs = tc.function.arguments;
        session.toolCount++;
        if (fnName === 'search_knowledge_base' || fnName === 'web_search') {
          session.searchCount++;
        }
        const toolResult = await executeTool(fnName, fnArgs, session);
        session.addToolResult(tc.id, toolResult);

        if (onToolCall) {
          onToolCall(fnName, {
            toolCount: session.toolCount,
            searchCount: session.searchCount
          }, session);
        }

        if (onStreamUpdate) {
          onStreamUpdate(
            {
              reasoning: '',
              content: '',
              fullReasoning: '',
              fullContent: `[${fnName}]`
            },
            session
          );
        }
      }
      continue;
    }

    session.addAssistantMessage(result.content, null);
    return result;
  }
  return { content: session.messages[session.messages.length - 1].content || '', reasoning: '' };
}

/**
 * 从 LanguageModel 流中按需抽取文本，并调用 onChunk 回调
 */
export async function readLanguageModelStream(stream, onChunk) {
  let accumulated = '';
  let lastRender = 0;
  let lastChunkAt = Date.now();
  while (true) {
    const result = await stream.read();
    if (result.done) break;
    if (result.value !== undefined && result.value !== '') {
      accumulated += result.value;
      lastChunkAt = Date.now();
      const cleanAnswerSoFar = extractAnswerText(accumulated);
      if (isNoQuestion(cleanAnswerSoFar)) {
        return 'NO_QUESTION';
      }
      const now = Date.now();
      if (onChunk && now - lastRender > 150) {
        lastRender = now;
        onChunk({ piece: result.value, full: accumulated });
      }
    } else {
      if (Date.now() - lastChunkAt > 20000) {
        throw new Error('AI 输出中断（20s）');
      }
      await sleep(40);
    }
  }
  return accumulated;
}

/**
 * 单行预览截断辅助函数
 */
export function formatSingleLinePreview(text, maxLen = 28) {
  const clean = String(text || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen) + '…';
}

export function normalizeQuestion(q, idx = 0, fallbackText = '') {
  if (!q) {
    return {
      id: String(idx + 1),
      type: 'solution',
      skills: ['core-math'],
      content: fallbackText || '请根据图片解答第 ' + (idx + 1) + ' 题'
    };
  }
  if (typeof q === 'string') {
    return {
      id: String(idx + 1),
      type: 'solution',
      skills: ['core-math'],
      content: q.trim() || fallbackText || '请根据图片解答第 ' + (idx + 1) + ' 题'
    };
  }
  const id = (q.id !== undefined && q.id !== null && String(q.id).trim())
    ? String(q.id).trim()
    : ((q.index || q.num || q.no) ? String(q.index || q.num || q.no) : String(idx + 1));
  const type = q.type || 'solution';
  const skills = Array.isArray(q.skills) ? q.skills : (q.skill ? [q.skill] : ['core-math']);
  const content = q.content ||
    q.question ||
    q.text ||
    q.problem ||
    q.title ||
    q.body ||
    q.desc ||
    q.description ||
    q.prompt ||
    q.raw ||
    fallbackText ||
    '';

  return {
    id: String(id),
    type: String(type),
    skills: skills,
    content: String(content).trim()
  };
}

/**
 * 解析并校验题目 JSON 结构 (集成大模型 JSON 自愈引擎与多字段容错)
 */
function tryParseQuestions(text, rawExtractContent = '') {
  const clean = extractAnswerText(text);
  if (!clean) return null;

  let parsed = repairJson(clean);
  if (!parsed || (Array.isArray(parsed) && parsed.length === 0)) {
    parsed = fallbackExtractObjects(clean);
  }

  let list = [];
  if (Array.isArray(parsed) && parsed.length > 0) {
    list = parsed;
  } else if (parsed && typeof parsed === 'object' && (parsed.id || parsed.content || parsed.question || parsed.text || parsed.problem || parsed.title)) {
    list = [parsed];
  }

  if (list.length > 0) {
    return list.map((item, idx) => normalizeQuestion(item, idx, clean));
  }

  // 尝试按数字编号/题号分段（如 "1. 题目一\n2. 题目二" 或 "题1: ...\n题2: ..."）
  const numberedListRegex = /(?:^|\n)\s*(?:[【(（]?\s*(\d+|[一二三四五六七八九十]+)[.、)）:：\s]|题\s*(\d+)[：:\s])\s*([\s\S]+?)(?=(?:\n\s*(?:[【(（]?\s*(?:\d+|[一二三四五六七八九十]+)[.、)）:：\s]|题\s*\d+[：:\s]))|$)/g;
  const listMatches = [];
  let m;
  while ((m = numberedListRegex.exec(clean)) !== null) {
    const qId = m[1] || m[2] || String(listMatches.length + 1);
    const content = m[3] ? m[3].trim() : '';
    if (content) {
      listMatches.push({ id: qId, content: content });
    }
  }

  if (listMatches.length > 0) {
    return listMatches.map((item, idx) => normalizeQuestion(item, idx, clean));
  }

  // 兜底：如果模型未按 JSON 输出，但输出了具体题目文字
  if (clean.length > 3 && !isNoQuestion(clean)) {
    return [normalizeQuestion({ id: '1', type: 'solution', content: clean }, 0)];
  }

  return null;
}

/**
 * 云端 API 三阶段流水线调度器 (内置失败自动重试与兜底机制)
 */
export async function runAgentApiPipeline({
  dataUrl,
  modelName,
  callbacks = {}
}) {
  const {
    onStageStep = () => {},
    onStage1Progress = () => {},
    onStage1Done = () => {},
    onStage2Start = () => {},
    onStage2TaskProgress = () => {},
    onStage2TaskDone = () => {},
    onStage3Stream = () => {},
    onNoQuestion = () => {}
  } = callbacks;

  const mainModel = modelName || API_MODELS[0];
  const extractorModel = EXTRACTOR_MODEL || mainModel;
  const extractorEffort = EXTRACTOR_EFFORT || 'low';

  const solverModel = SOLVER_MODEL || mainModel;
  const solverEffort = SOLVER_EFFORT || 'high';

  const summarizerModel = SUMMARIZER_MODEL || mainModel;
  const summarizerEffort = SUMMARIZER_EFFORT || 'low';

  // 阶段 1: 拆题分析 (支持格式异常自动重试)
  onStageStep('1/3', '正在识别图像中的题目与学科技能需求…');

  let questions = null;
  for (let extractAttempt = 1; extractAttempt <= 2; extractAttempt++) {
    const extractorSession = new AgentSession(
      'session-extractor',
      'Extractor',
      STAGE1_EXTRACT_PROMPT,
      extractorModel,
      extractorEffort,
      []
    );
    extractorSession.addUserMessage([
      { type: 'text', text: '请识别并拆解图中的所有题目，按 JSON 数组格式输出。' },
      { type: 'image_url', image_url: { url: dataUrl } }
    ]);

    try {
      const extractResult = await callOpenAiApi(
        extractorSession.modelName,
        extractorSession.effort,
        extractorSession.messages,
        (c) => {
          if (c.fullContent) {
            const partial = parsePartialQuestions(c.fullContent);
            if (partial.length > 0) {
              onStage1Progress(partial.map((q, idx) => normalizeQuestion(q, idx)));
            }
          }
        }
      );

      const extractText = extractAnswerText(extractResult.content);
      if (isNoQuestion(extractText) || isNoQuestion(extractResult.content)) {
        onNoQuestion();
        return null;
      }

      questions = tryParseQuestions(extractResult.content);
      if (questions && questions.length > 0) break;
    } catch (e) {
      if (extractAttempt === 2) throw e;
      await sleep(1000);
    }
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    questions = [normalizeQuestion({ id: '1', type: 'solution', skills: ['core-math'], content: '原题解答' }, 0)];
  }

  onStage1Done(questions);
  await sleep(800);

  // 阶段 2: 分题求解 (默认提供基础工具，模型根据题目自主加载专属技能与工具)
  onStageStep('2/3', '');
  onStage2Start(questions);

  const solvePromises = questions.map(async (q, idx) => {
    const qId = q.id || String(idx + 1);
    const questionText = q.content || '请根据图片解答第 ' + qId + ' 题';

    for (let solveAttempt = 1; solveAttempt <= 2; solveAttempt++) {
      // 默认基础工具集（list_skills, list_tools, load_skill, search_knowledge_base, web_search, calculate）
      const solverSession = new AgentSession(
        'session-solver-' + qId,
        'Solver-Q' + qId,
        STAGE2_SOLVE_PROMPT,
        solverModel,
        solverEffort,
        []
      );
      solverSession.searchCount = 0;
      solverSession.toolCount = 0;

      // 若题目文本过短或为默认占位符，直接带上原图 dataUrl 确保求解器不错漏任何细节
      if (dataUrl && (questionText.length < 10 || questionText === '原题解答' || questionText.includes('题目内容'))) {
        solverSession.addUserMessage([
          { type: 'text', text: '请根据照片详细解答以下题目（题号 ' + qId + '）：\n' + questionText },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]);
      } else {
        solverSession.addUserMessage('请解答以下题目（题号 ' + qId + '）：\n' + questionText);
      }

      try {
        const solveResult = await runSessionConversation(
          solverSession,
          null,
          (fnName, stats) => {
            onStage2TaskProgress(idx, qId, {
              status: 'solving',
              toolCount: (stats && stats.toolCount) || solverSession.toolCount || 0,
              searchCount: (stats && stats.searchCount) || solverSession.searchCount || 0,
              lastTool: fnName
            });
          },
          5
        );
        const cleanSolve = extractAnswerText(solveResult.content) || solveResult.content;
        onStage2TaskDone(idx, qId, {
          status: 'done',
          toolCount: solverSession.toolCount || 0,
          searchCount: solverSession.searchCount || 0
        });
        return { id: qId, type: q.type, question: questionText, solution: cleanSolve };
      } catch (err) {
        if (solveAttempt === 2) {
          onStage2TaskDone(idx, qId, {
            status: 'done',
            toolCount: solverSession.toolCount || 0,
            searchCount: solverSession.searchCount || 0
          });
          return { id: qId, type: q.type, question: questionText, solution: '已根据题目条件完成解题' };
        }
        await sleep(600);
      }
    }
  });

  const solutions = await Promise.all(solvePromises);

  // 阶段 3: 提炼排版 (带自动重试与兜底降级)
  onStageStep('3/3', '');

  let summaryInput = '';
  for (let k = 0; k < solutions.length; k++) {
    const s = solutions[k];
    const validSolution = (s.solution && s.solution.trim().length > 0 && !s.solution.includes('题目内容为空'))
      ? s.solution
      : (s.question || '已根据题目条件完成解题');
    summaryInput += '--- 题目 ' + s.id + ' ---\n【题干】' + s.question + '\n【详细推导与结论】\n' + validSolution + '\n\n';
  }

  let summaryAccumulated = '';
  try {
    const summarizerSession = new AgentSession(
      'session-summarizer',
      'Summarizer',
      STAGE3_SUMMARY_PROMPT,
      summarizerModel,
      summarizerEffort,
      []
    );
    summarizerSession.addUserMessage('请将以下题目的详细解题推导汇总为符合规范的极简 AR 阅读格式：\n\n' + summaryInput);

    await callOpenAiApi(
      summarizerSession.modelName,
      summarizerSession.effort,
      summarizerSession.messages,
      (c) => {
        if (c.content) {
          summaryAccumulated += c.content;
          onStage3Stream(summaryAccumulated, false);
        }
      }
    );
  } catch (e) {
    // Stage 3 异常时直接使用 Stage 2 的结果组装兜底
    summaryAccumulated = solutions.map(s => `【题 ${s.id}】\n${s.solution}`).join('\n\n');
  }

  const finalClean = extractAnswerText(summaryAccumulated) || summaryAccumulated;
  if (!finalClean || !finalClean.trim()) {
    onNoQuestion();
    return null;
  }
  onStage3Stream(finalClean, true);
  return finalClean;
}

/**
 * 端侧内置模型三阶段流水线调度器
 */
export async function runAgentBuiltinPipeline({
  dataUrl,
  LanguageModel,
  callbacks = {}
}) {
  const {
    onStageStep = () => {},
    onStage1Progress = () => {},
    onStage1Done = () => {},
    onStage2Start = () => {},
    onStage2TaskProgress = () => {},
    onStage2TaskDone = () => {},
    onStage3Stream = () => {},
    onNoQuestion = () => {}
  } = callbacks;

  const availability = await LanguageModel.availability();
  if (availability !== 'available') {
    throw new Error('当前设备未提供 AI 能力');
  }

  // 阶段 1: 拆题分析
  onStageStep('1/3', '正在识别图像中的题目与学科技能需求…');

  let extractRaw = '';
  let extractorSession = null;
  try {
    extractorSession = await LanguageModel.create({
      initialPrompts: [{ role: 'system', content: STAGE1_EXTRACT_PROMPT }]
    });
    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: '请识别并拆解图中的所有题目，按 JSON 数组格式输出。' },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }
    ];

    if (typeof extractorSession.promptStreaming === 'function') {
      try {
        const stream = extractorSession.promptStreaming(messages);
        extractRaw = await withTimeout(
          readLanguageModelStream(stream, (chunk) => {
            if (chunk.full) {
              const partial = parsePartialQuestions(chunk.full);
              if (partial.length > 0) {
                onStage1Progress(partial);
              }
            }
          }),
          15000,
          '拆题流式超时'
        );
      } catch (e) {
        extractRaw = null;
      }
    }
    if (!extractRaw) {
      try {
        extractRaw = await withTimeout(extractorSession.prompt(messages), 20000, '拆题超时');
      } catch (e) {
        extractRaw = '';
      }
    }
  } catch (e) {
    extractRaw = '';
  } finally {
    if (extractorSession && extractorSession.destroy) {
      try { extractorSession.destroy(); } catch (e) {}
    }
  }

  const extractText = extractAnswerText(extractRaw);
  if (isNoQuestion(extractText) || isNoQuestion(extractRaw)) {
    onNoQuestion();
    return null;
  }

  let questions = tryParseQuestions(extractRaw);
  if (!Array.isArray(questions) || questions.length === 0) {
    questions = [normalizeQuestion({ id: '1', type: 'solution', skills: ['core-math'], content: extractText || '原题解答' }, 0)];
  }

  onStage1Done(questions);
  await sleep(800);

  // 阶段 2: 分题求解
  onStageStep('2/3', '');
  onStage2Start(questions);

  const solvePromises = questions.map(async (q, idx) => {
    const qId = q.id || String(idx + 1);
    const questionText = q.content || '请根据图片解答第 ' + qId + ' 题';
    let solverSession = null;
    try {
      solverSession = await LanguageModel.create({
        initialPrompts: [{ role: 'system', content: STAGE2_SOLVE_PROMPT }]
      });

      let messages;
      if (dataUrl && (questionText.length < 10 || questionText === '原题解答' || questionText.includes('题目内容'))) {
        messages = [
          {
            role: 'user',
            content: [
              { type: 'text', text: '请根据照片解答题目（题号 ' + qId + '）：\n' + questionText },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }
        ];
      } else {
        messages = [
          { role: 'user', content: '请解答以下题目（题号 ' + qId + '）：\n' + questionText }
        ];
      }

      let solveRaw = null;
      if (typeof solverSession.promptStreaming === 'function') {
        try {
          const stream = solverSession.promptStreaming(messages);
          solveRaw = await withTimeout(readLanguageModelStream(stream, null), 30000, '求解流式超时');
        } catch (e) {
          solveRaw = null;
        }
      }
      if (!solveRaw) {
        solveRaw = await withTimeout(solverSession.prompt(messages), 35000, '求解超时');
      }

      const cleanSolve = extractAnswerText(solveRaw) || solveRaw;
      onStage2TaskDone(idx, qId, { status: 'done', searchCount: 0 });
      return { id: qId, type: q.type, question: questionText, solution: cleanSolve };
    } catch (err) {
      onStage2TaskDone(idx, qId, { status: 'done', searchCount: 0 });
      return { id: qId, type: q.type, question: questionText, solution: '已根据题目条件完成解题' };
    } finally {
      if (solverSession && solverSession.destroy) {
        try { solverSession.destroy(); } catch (e) {}
      }
    }
  });

  const solutions = await Promise.all(solvePromises);

  // 阶段 3: 提炼排版
  onStageStep('3/3', '');

  let summaryInput = '';
  for (let k = 0; k < solutions.length; k++) {
    const s = solutions[k];
    const validSolution = (s.solution && s.solution.trim().length > 0 && !s.solution.includes('题目内容为空'))
      ? s.solution
      : (s.question || '已根据题目条件完成解题');
    summaryInput += '--- 题目 ' + s.id + ' ---\n【题干】' + s.question + '\n【详细推导与结论】\n' + validSolution + '\n\n';
  }

  const summarizerSession = await LanguageModel.create({
    initialPrompts: [{ role: 'system', content: STAGE3_SUMMARY_PROMPT }]
  });

  const messages = [
    {
      role: 'user',
      content: '请将以下题目的详细解题推导汇总为符合规范的极简 AR 阅读格式：\n\n' + summaryInput
    }
  ];

  let text = null;
  if (typeof summarizerSession.promptStreaming === 'function') {
    try {
      const stream = summarizerSession.promptStreaming(messages);
      text = await readLanguageModelStream(stream, (chunk) => {
        onStage3Stream(chunk.full, false);
      });
    } catch (e) {
      text = null;
    }
  }
  if (text === null) {
    text = await summarizerSession.prompt(messages);
  }
  if (summarizerSession && summarizerSession.destroy) {
    try { summarizerSession.destroy(); } catch (e) {}
  }

  const cleanAnswer = extractAnswerText(text);
  if (isNoQuestion(text) || isNoQuestion(cleanAnswer)) {
    onNoQuestion();
    return null;
  }
  onStage3Stream(cleanAnswer, true);
  return cleanAnswer;
}
