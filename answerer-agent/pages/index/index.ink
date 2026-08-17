<script def>
{
  "navigationBarTitleText": "无感搜题"
}
</script>

<script setup>
import wx from 'wx';
import { LanguageModel } from 'language-model';
import { API_BASE, API_KEY, API_MODELS, REASONING_EFFORT } from '../../config.js';

const SYMBOLS = {
  '\\alpha': 'α',
  '\\beta': 'β',
  '\\gamma': 'γ',
  '\\delta': 'δ',
  '\\epsilon': 'ε',
  '\\theta': 'θ',
  '\\lambda': 'λ',
  '\\mu': 'μ',
  '\\pi': 'π',
  '\\sigma': 'σ',
  '\\phi': 'φ',
  '\\omega': 'ω',
  '\\Delta': 'Δ',
  '\\Sigma': 'Σ',
  '\\Omega': 'Ω',
  '\\sum': '∑',
  '\\infty': '∞',
  '\\pm': '±',
  '\\times': '×',
  '\\div': '÷',
  '\\cdot': '·',
  '\\leq': '≤',
  '\\geq': '≥',
  '\\neq': '≠',
  '\\approx': '≈',
  '\\rightarrow': '→',
  '\\Rightarrow': '⇒',
  '\\circ': '°',
  '\\dots': '…',
  '\\ldots': '…',
  '\\left': '',
  '\\right': ''
};

const SYSTEM_PROMPT = [
  '你是中文搜题助手，用户发送一张数学/理科题目照片。',
  '回答规则：',
  '- 不加「答案：」「解答：」等前缀；',
  '- 选择/填空：输出「题号. 结果」，多题同行空格分隔不换行，如「1. A 2. B」；填空只给最简结果；',
  '- 解答题：只给满分最简步骤，每步一行，末行给最终结果，不写解析；',
  '- 多题逐题作答；某题看不清/题干不全时只在该题位置写「没看清楚」或「不完整」，其余照常作答；',
  '- 整张照片完全看不清/无题目/非题目时，只输出一行 NO_QUESTION；',
  '- 公式用 $$...$$ 包裹并独占一行，只允许 \\frac{}{}、\\sqrt{}、^、_、\\times、\\div、\\pm、\\cdot、\\leq、\\geq、\\neq、\\approx、\\pi、\\alpha、\\beta、\\gamma、\\theta、\\lambda、\\mu、\\sigma、\\Delta、\\sum、\\infty、\\rightarrow、\\left(、\\right；禁用 \\begin/\\end、矩阵、方程组、多行大括号；',
  '- 禁用 $...$、\\(...\\)、&...&、反引号等其他公式定界符与乱码占位符；',
  '- 不用 emoji，保持简洁。'
].join('\n');

const NO_QUESTION_KEY = 'NO_QUESTION';

const MODES = (() => {
  const list = [{ provider: 'builtin', model: '', label: '内置模型' }];
  for (let k = 0; k < API_MODELS.length; k++) {
    list.push({ provider: 'api', model: API_MODELS[k], label: 'API · ' + API_MODELS[k] });
  }
  return list;
})();

const SUP_MAP = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  'n': 'ⁿ', 'i': 'ⁱ', '+': '⁺', '-': '⁻', '(': '⁽', ')': '⁾', '=': '⁼'
};

const SUB_MAP = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  'n': 'ₙ', 'i': 'ᵢ', '+': '₊', '-': '₋', '(': '₍', ')': '₎'
};

function takeArgs(src, i, count) {
  const args = [];
  while (args.length < count && i < src.length) {
    if (src[i] === '{') {
      let depth = 1;
      let j = i + 1;
      const start = j;
      while (j < src.length && depth > 0) {
        if (src[j] === '{') {
          depth++;
        } else if (src[j] === '}') {
          depth--;
        }
        j++;
      }
      args.push(src.slice(start, j - 1));
      i = j;
    } else {
      args.push(src[i]);
      i++;
    }
  }
  return { args: args, i: i };
}

function mapScript(inner, map) {
  let result = '';
  for (let k = 0; k < inner.length; k++) {
    const ch = map[inner[k]];
    if (ch === undefined) {
      return null;
    }
    result += ch;
  }
  return result.length > 0 ? result : null;
}

function wrapIfOperator(text) {
  if (text.indexOf('+') !== -1 || text.indexOf('-') !== -1 || text.indexOf('=') !== -1) {
    return '(' + text + ')';
  }
  return text;
}

function latexToUnicode(src) {
  const convert = (s) => {
    let out = '';
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (ch === '\\') {
        let j = i + 1;
        while (j < s.length && /[a-zA-Z]/.test(s[j])) {
          j++;
        }
        const cmd = s.slice(i, j);
        if (cmd === '\\frac') {
          const args = takeArgs(s, j, 2);
          const num = convert(args.args[0] || '');
          const den = convert(args.args[1] || '');
          out += '(' + num + ')/(' + den + ')';
          i = args.i;
        } else if (cmd === '\\sqrt') {
          const args = takeArgs(s, j, 1);
          const body = convert(args.args[0] || '');
          out += '√' + wrapIfOperator(body);
          i = args.i;
        } else if (cmd === '\\left' || cmd === '\\right') {
          i = j;
        } else if (SYMBOLS[cmd] !== undefined) {
          out += SYMBOLS[cmd];
          i = j;
        } else {
          i = j;
        }
      } else if (ch === '^' || ch === '_') {
        const isSup = ch === '^';
        const args = takeArgs(s, i + 1, 1);
        const inner = convert(args.args[0] || '');
        const mapped = mapScript(inner, isSup ? SUP_MAP : SUB_MAP);
        if (mapped !== null) {
          out += mapped;
        } else {
          out += (isSup ? '^(' : '_(') + inner + ')';
        }
        i = args.i;
      } else if (ch === '{' || ch === '}') {
        i++;
      } else {
        out += ch;
        i++;
      }
    }
    return out;
  };
  return convert(String(src || ''));
}


function cleanText(line) {
  return latexToUnicode(
    line
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/^#{1,6}\s*/, '')
      .replace(/^[-*+]\s+/, '')
      .replace(/`/g, '')
      .trim()
  );
}

function splitFormula(line) {
  const match = line.match(/(.*?)(?:\$\$(.+?)\$\$|&([^&\s]+)&)(.*)/);
  if (!match) {
    return null;
  }
  return {
    before: match[1],
    latex: (match[2] !== undefined ? match[2] : match[3]).trim(),
    after: match[4]
  };
}

function pushInlineFormula(blocks, line) {
  const parts = splitFormula(line);
  if (!parts) {
    blocks.push({ type: 'text', text: cleanText(line) });
    return;
  }
  const before = cleanText(parts.before);
  const after = cleanText(parts.after);
  if (before) {
    blocks.push({ type: 'text', text: before });
  }
  blocks.push({ type: 'formula', latex: parts.latex });
  if (after) {
    blocks.push({ type: 'text', text: after });
  }
}

function buildBlocks(text) {
  const lines = String(text || '').split(/\r?\n/);
  const blocks = [];
  for (let k = 0; k < lines.length; k++) {
    const line = lines[k].trim();
    const parts = splitFormula(line);
    if (parts && parts.before.trim() === '' && parts.after.trim() === '') {
      blocks.push({ type: 'formula', latex: parts.latex });
    } else if (parts) {
      pushInlineFormula(blocks, line);
    } else if (line === '') {
      blocks.push({ type: 'gap' });
    } else {
      blocks.push({ type: 'text', text: cleanText(line) });
    }
  }
  return blocks;
}

function buildStreamingBlocks(text) {
  const count = (text.match(/\$\$/g) || []).length;
  if (count % 2 === 0) {
    return buildBlocks(text);
  }
  const lastIndex = text.lastIndexOf('$$');
  const head = text.slice(0, lastIndex);
  const tail = text.slice(lastIndex + 2);
  const blocks = buildBlocks(head);
  blocks.push({ type: 'formula-pending', text: tail });
  return blocks;
}

export default {
  data: {
    phase: 'capture',
    countdown: 3,
    provider: 'builtin',
    providerInfo: '内置模型',
    gestureHint: '点头切换模型源',
    progress: 0,
    statusText: '即将自动拍摄',
    solvingLabel: '思考中',
    errorText: '',
    photoSrc: '',
    scrollTop: 0,
    autoScroll: true,
    answerBlocks: []
  },

  onLoad() {
    try {
      wx.setBackgroundColor({
        backgroundColor: '#000000',
        backgroundColorTop: '#000000',
        backgroundColorBottom: '#000000'
      });
    } catch (e) {}
    this._timers = [];
    this._longPressTimer = null;
    this._arrowDownHandled = false;
    this._noQuestion = false;
    this._modeIndex = 0;
    this._apiModel = '';
    this.applyMode();
    this.startCaptureFlow();
  },

  onUnload() {
    this.clearTimers();
    if (this._longPressTimer !== null) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
  },

  currentMode() {
    return MODES[this._modeIndex] || MODES[0];
  },

  applyMode() {
    const mode = this.currentMode();
    this._apiModel = mode.model;
    this.setData({
      provider: mode.provider,
      providerInfo: mode.label,
      gestureHint: '上下滑切换模型源'
    });
  },

  switchMode(dir) {
    this._modeIndex = (this._modeIndex + dir + MODES.length) % MODES.length;
    this.applyMode();
    this.clearTimers();
    this.startCaptureFlow();
  },

  onKeyDown(event) {
    const code = event.code;
    if (code === 'ArrowUp' || code === 'ArrowDown') {
      event.preventDefault();
      this._arrowDownHandled = true;
      this.handleArrow(code === 'ArrowUp' ? -1 : 1);
      return;
    }
    if (code !== 'Enter' && code !== 'GlobalHook') {
      return;
    }
    if (this.data.phase !== 'answer') {
      return;
    }
    if (this._longPressTimer !== null) {
      clearTimeout(this._longPressTimer);
    }
    this._longPressTimer = setTimeout(() => {
      this._longPressTimer = null;
      this.resetSearch();
    }, 600);
  },

  onKeyUp(event) {
    const code = event.code;
    if (code === 'Enter' || code === 'GlobalHook') {
      event.preventDefault();
      if (this._longPressTimer !== null) {
        clearTimeout(this._longPressTimer);
        this._longPressTimer = null;
        if (this.data.phase === 'answer') {
          this.resetSearch();
        }
      }
      if (this.data.phase === 'error') {
        this.resetSearch();
      }
      return;
    }
    if (code === 'ArrowUp' || code === 'ArrowDown') {
      event.preventDefault();
      if (this._arrowDownHandled) {
        this._arrowDownHandled = false;
        return;
      }
      this.handleArrow(code === 'ArrowUp' ? -1 : 1);
      return;
    }
    if (code === 'Backspace' && (this.data.phase === 'answer' || this.data.phase === 'error')) {
      event.preventDefault();
      this.resetSearch();
    }
  },

  handleArrow(dir) {
    if (this.data.phase === 'capture') {
      this.switchMode(dir);
      return;
    }
    if (this.data.phase === 'answer') {
      this.setData({
        autoScroll: dir > 0,
        scrollTop: Math.max(0, (this.data.scrollTop || 0) + dir * 240)
      });
    }
  },
  resetSearch() {
    this.clearTimers();
    this.cancelStream();
    this.setData({
      phase: 'capture',
      photoSrc: '',
      answerBlocks: [],
      scrollTop: 0,
      autoScroll: true,
      countdown: 3,
      progress: 0,
      statusText: '即将自动拍摄'
    });
    this.startCaptureFlow();
  },

  clearTimers() {
    const timers = this._timers || [];
    for (let k = 0; k < timers.length; k++) {
      clearInterval(timers[k]);
    }
    this._timers = [];
  },

  addTimer(interval, fn) {
    const id = setInterval(fn, interval);
    this._timers.push(id);
    return id;
  },

  startCaptureFlow() {
    this.setData({ countdown: 3, statusText: '即将自动拍摄' });
    this.addTimer(1000, () => {
      const next = this.data.countdown - 1;
      if (next <= 0) {
        this.clearTimers();
        this.capturePhoto();
        return;
      }
      this.setData({ countdown: next });
    });
  },

  async capturePhoto() {
    this.setData({ statusText: '正在拍摄…' });
    const media = wx.media;
    const camera = media && media.createCameraContext();
    if (!camera) {
      this.fail('无法访问摄像头，请检查设备权限');
      return;
    }
    let photo = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        photo = await this.withTimeout(camera.takePhoto({ quality: 'high' }), 10000, '拍摄超时');
        break;
      } catch (e) {
        if (attempt < 2) {
          await this.sleep(700);
        } else {
          this.fail('拍摄失败，请重试（可能需一次交互唤醒）');
          return;
        }
      }
    }
    try {
      const mime = (photo && photo.mimeType) || 'image/jpeg';
      let buffer = photo.data;
      if (buffer && buffer.buffer !== undefined && buffer.byteLength !== undefined) {
        buffer = buffer.buffer;
      }
      const base64 = wx.arrayBufferToBase64(buffer);
      const dataUrl = 'data:' + mime + ';base64,' + base64;
      this.showPhotoPreview(dataUrl);
    } catch (e) {
      this.fail('拍摄数据处理失败，请重试');
    }
  },

  showPhotoPreview(dataUrl) {
    this.clearTimers();
    this.setData({
      phase: 'preview',
      photoSrc: dataUrl,
      statusText: '即将开始解题'
    });
    this.addTimer(1000, () => {
      this.clearTimers();
      this.solveQuestion(dataUrl);
    });
  },

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  async solveQuestion(dataUrl) {
    this._noQuestion = false;
    this.setData({ phase: 'solving', solvingLabel: '思考中', statusText: '正在识别题目…' });
    this.startProgress();
    try {
      await this.withTimeout(this.streamSolve(dataUrl), 120000, 'AI 解题超时，请重试');
    } catch (e) {
      this.fail('AI 解题失败：' + ((e && e.message) || '未知错误'));
    }
  },

  async streamSolve(dataUrl) {
    if (this.data.provider === 'api') {
      await this.apiSolve(dataUrl);
      return;
    }
    const availability = await LanguageModel.availability();
    if (availability !== 'available') {
      this.fail('当前设备未提供 AI 能力');
      return;
    }
    this.setData({ statusText: '正在解题…' });
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
        this._session = session;
        this._stream = stream;
        text = await this.pumpStream(stream);
      } catch (e) {
        text = null;
      }
      this.cancelStream(true);
      if (this.data.phase !== 'solving') {
        return;
      }
    }
    if (text === null) {
      this.setData({ statusText: '正在解题…' });
      text = await session.prompt(messages);
      this.cancelStream();
    }
    this.renderStream(text, true);
  },

  async apiSolve(dataUrl) {
    this.setData({ statusText: '正在解题…' });
    const model = this._apiModel || API_MODELS[0];
    const response = await fetch(API_BASE + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY
      },
      body: JSON.stringify({
        model: model,
        stream: true,
        reasoning_effort: REASONING_EFFORT,
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
      })
    });
    if (!response.ok) {
      let detail = '';
      try {
        detail = await response.text();
      } catch (e) {}
      throw new Error('API 请求失败（' + response.status + '）' + String(detail).slice(0, 160));
    }
    const reader = response.body.getReader();
    this._apiReader = reader;
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulated = '';
    let lastRender = 0;
    let done = false;
    while (!done) {
      let chunk;
      try {
        chunk = await reader.read();
      } catch (e) {
        break;
      }
      if (chunk.done) {
        break;
      }
      buffer += decoder.decode(chunk.value, { stream: true });
      let nl;
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (line.indexOf('data:') !== 0) {
          continue;
        }
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
        const choice = json.choices && json.choices[0];
        const delta = choice && choice.delta;
        const reasoning = delta && delta.reasoning_content;
        const piece = delta && delta.content;
        if (reasoning && reasoning.indexOf(NO_QUESTION_KEY) !== -1) {
          this._noQuestion = true;
          this.resetSearch();
          return accumulated;
        }
        if (piece) {
          accumulated += piece;
          if (accumulated.indexOf(NO_QUESTION_KEY) !== -1) {
            this._noQuestion = true;
            this.resetSearch();
            return accumulated;
          }
          const now = Date.now();
          if (now - lastRender > 150) {
            lastRender = now;
            this.renderStream(accumulated, false);
          }
        }
      }
    }
    this._apiReader = null;
    buffer += decoder.decode();
    if (accumulated) {
      this.renderStream(accumulated, false);
    }
    return accumulated;
  },

  async pumpStream(stream) {
    let accumulated = '';
    let lastRender = 0;
    let lastChunkAt = Date.now();
    while (true) {
      const result = await stream.read();
      if (result.done) {
        break;
      }
      if (result.value !== undefined && result.value !== '') {
        accumulated += result.value;
        lastChunkAt = Date.now();
        if (accumulated.indexOf(NO_QUESTION_KEY) !== -1) {
          this._noQuestion = true;
          this.resetSearch();
          return accumulated;
        }
        const now = Date.now();
        if (now - lastRender > 150) {
          lastRender = now;
          this.renderStream(accumulated, false);
        }
      } else {
        if (Date.now() - lastChunkAt > 25000) {
          throw new Error('AI 输出中断');
        }
        await this.sleep(60);
      }
    }
    return accumulated;
  },

  cancelStream(keepSession) {
    if (this._apiReader && this._apiReader.cancel) {
      try {
        this._apiReader.cancel();
      } catch (e) {}
    }
    this._apiReader = null;
    if (this._stream && this._stream.cancel) {
      try {
        this._stream.cancel();
      } catch (e) {}
    }
    if (!keepSession && this._session && this._session.destroy) {
      try {
        this._session.destroy();
      } catch (e) {}
    }
    this._stream = null;
    if (!keepSession) {
      this._session = null;
    }
  },

  renderStream(text, isFinal) {
    const t = String(text || '');
    if (t.indexOf(NO_QUESTION_KEY) !== -1) {
      if (!this._noQuestion) {
        this._noQuestion = true;
        this.resetSearch();
      }
      return;
    }
    const blocks = isFinal ? buildBlocks(text) : buildStreamingBlocks(text);
    for (let k = 0; k < blocks.length; k++) {
      const block = blocks[k];
      block.id = k;
      if (block.type === 'formula') {
        block.type = 'text';
        block.formula = true;
        block.text = latexToUnicode(block.latex);
        block.latex = '';
      }
    }
    this.clearTimers();
    const patch = { phase: 'answer', answerBlocks: blocks, statusText: '' };
    if (this.data.autoScroll) {
      patch.scrollTop = (this.data.scrollTop || 0) + 5000;
    }
    this.setData(patch);
  },

  startProgress() {
    this.addTimer(110, () => {
      let progress = this.data.progress + 6;
      if (progress > 300) {
        progress = 0;
      }
      this.setData({ progress: progress });
    });
  },

  withTimeout(promise, ms, message) {
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
  },


  fail(message) {
    this.clearTimers();
    this.cancelStream();
    this.setData({ phase: 'error', errorText: message });
  }
};
</script>

<page>
  <view class="stage-capture" ink:if="{{phase === 'capture'}}">
    <text class="capture-count">{{countdown}}</text>
    <text class="hint">请将题目对准视野中央</text>
    <text class="provider-info">{{providerInfo}}</text>
    <text class="provider-hint">{{gestureHint}}</text>
    <text class="sub-hint">{{statusText}}</text>
  </view>
  <view class="stage-preview" ink:elif="{{phase === 'preview'}}">
    <view class="photo-preview">
      <image class="preview-img" src="{{photoSrc}}" mode="widthFix"></image>
    </view>
    <text class="solving-sub">{{statusText}}</text>
  </view>

  <view class="stage-solving" ink:elif="{{phase === 'solving'}}">
    <view class="solving-card">
      <text class="solving-title">{{solvingLabel}}</text>
      <view class="progress-track">
        <view class="progress-dot" style="left: {{progress}}px;"></view>
      </view>
      <text class="solving-sub">{{statusText}}</text>
    </view>
  </view>

  <view class="stage-answer" ink:elif="{{phase === 'answer'}}">
    <scroll-view class="answer-scroll" scroll-y="true" scroll-top="{{scrollTop}}">
      <view class="answer-block" ink:for="{{answerBlocks}}" ink:key="id">
        <text class="answer-text" ink:if="{{item.type === 'text' && !item.formula}}">{{item.text}}</text>
        <text class="answer-formula" ink:elif="{{item.type === 'text' && item.formula}}">{{item.text}}</text>
        <text class="answer-text-pending" ink:elif="{{item.type === 'formula-pending'}}">{{item.text}}</text>
        <view class="answer-gap" ink:else></view>
      </view>
    </scroll-view>
  </view>

  <view class="stage-error" ink:else>
    <error-state text="{{errorText}}"></error-state>
  </view>
</page>

<style>
.stage-capture,
.stage-solving,
.stage-answer,
.stage-error {
  width: 480px;
  height: 352px;
  box-sizing: border-box;
  background-color: var(--color-background);
}

.stage-capture {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}


.hint {
  margin-top: 6px;
  font-size: 16px;
  line-height: 24px;
  color: var(--color-primary-60);
  text-align: center;
}

.sub-hint {
  margin-top: 2px;
  font-size: 14px;
  line-height: 20px;
  color: var(--color-primary-40);
  text-align: center;
}

.provider-info {
  margin-top: 8px;
  font-size: 14px;
  line-height: 20px;
  color: var(--color-primary-60);
  text-align: center;
}

.provider-hint {
  margin-top: 2px;
  font-size: 12px;
  line-height: 16px;
  color: var(--color-primary-40);
  text-align: center;
}

.stage-solving {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.solving-card {
  width: 380px;
  padding: 24px 20px;
  border: 1px solid var(--border-color-muted);
  border-radius: var(--radius-md);
}

.solving-title {
  font-size: 18px;
  line-height: 26px;
  color: var(--color-primary-60);
  text-align: center;
}

.progress-track {
  position: relative;
  margin-top: 16px;
  width: 320px;
  height: 1px;
  background-color: var(--color-primary-40);
}

.progress-dot {
  position: absolute;
  top: -2px;
  width: 5px;
  height: 5px;
  border-radius: 9999px;
  background-color: var(--color-primary);
  box-shadow: 0 0 6px var(--color-primary-60);
}

.solving-sub {
  margin-top: 12px;
  font-size: 14px;
  line-height: 20px;
  color: var(--color-primary-40);
  text-align: center;
}

.stage-answer {
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
}


.answer-scroll {
  flex-grow: 1;
  margin-top: 8px;
}

.answer-block {
  margin-bottom: 8px;
}

.answer-text {
  font-size: 16px;
  line-height: 24px;
  color: var(--color-primary-60);
}

.answer-formula {
  font-size: 22px;
  line-height: 30px;
  color: var(--color-primary);
  font-weight: 500;
}

.answer-gap {
  height: 6px;
}

.stage-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.photo-preview {
  width: 280px;
  height: 150px;
  overflow: hidden;
  border: 1px solid var(--border-color-muted);
  border-radius: var(--radius-md);
  margin-bottom: 14px;
}



.answer-text-pending {
  font-size: 16px;
  line-height: 24px;
  color: var(--color-primary-40);
}

.capture-count {
  font-size: 64px;
  line-height: 80px;
  font-weight: 500;
  color: var(--color-primary);
  text-align: center;
}

.stage-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.preview-img {
  width: 280px;
}
</style>