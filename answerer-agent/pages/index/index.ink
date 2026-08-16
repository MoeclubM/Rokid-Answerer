<script def>
{
  "navigationBarTitleText": "无感搜题"
}
</script>

<script setup>
import wx from 'wx';
import { LanguageModel } from 'language-model';

const FONT = 'sans-serif';
const FORMULA_COLOR = '#40ff5e';
const MAX_FORMULA_W = 448;

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
  '你是一名中文搜题助手，用户会发来一张包含数学或理科题目的照片。',
  '请按下面的固定格式回答：',
  '答案：<最简最终答案，涉及公式时用 $$...$$ 包裹>',
  '解析：<分步骤推导，每步一行>',
  '公式要求：',
  '- 公式必须用 $$...$$ 包裹，且每个公式独占一行，不要在一行里混排多个公式；',
  '- 只允许使用这些命令：\\frac{a}{b}、\\sqrt{x}、^ 上标、_ 下标、\\times、\\div、\\pm、\\cdot、\\leq、\\geq、\\neq、\\approx、\\pi、\\alpha、\\beta、\\gamma、\\theta、\\lambda、\\mu、\\sigma、\\Delta、\\sum、\\infty、\\rightarrow、\\left(、\\right)；',
  '- 不要使用 \\begin、\\end、矩阵、方程组、多行大括号；',
  '- 如果照片中的内容无法看清或不是题目，请直接说明；',
  '- 不要使用 emoji，回答保持简洁。'
].join('\n');

let measureContext = null;

function getMctx() {
  if (!measureContext) {
    const canvas = new Canvas(16, 16);
    measureContext = canvas.getContext('2d');
  }
  return measureContext;
}

function textWidth(text, fontSize) {
  const ctx = getMctx();
  ctx.font = fontSize + 'px ' + FONT;
  return ctx.measureText(text).width;
}

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\') {
      let j = i + 1;
      while (j < src.length && /[a-zA-Z]/.test(src[j])) {
        j++;
      }
      tokens.push({ type: 'cmd', value: src.slice(i, j) });
      i = j;
    } else if (ch === '{' || ch === '}' || ch === '^' || ch === '_') {
      tokens.push({ type: ch });
      i++;
    } else if (/\s/.test(ch)) {
      i++;
    } else {
      tokens.push({ type: 'char', value: ch });
      i++;
    }
  }
  return tokens;
}

function parseArg(tokens, i) {
  if (tokens[i] && tokens[i].type === '{') {
    return parseGroup(tokens, i);
  }
  if (tokens[i] && tokens[i].type === 'char') {
    return { nodes: [{ t: 'text', s: tokens[i].value }], i: i + 1 };
  }
  if (tokens[i] && tokens[i].type === 'cmd') {
    const symbol = SYMBOLS[tokens[i].value];
    if (symbol) {
      return { nodes: [{ t: 'text', s: symbol }], i: i + 1 };
    }
    return { nodes: [], i: i + 1 };
  }
  return { nodes: [], i };
}

function parseGroup(tokens, i) {
  const group = parseRow(tokens, i + 1, '}');
  let end = group.i;
  if (tokens[end] && tokens[end].type === '}') {
    end++;
  }
  return { nodes: group.nodes, i: end };
}

function parseRow(tokens, i, closer) {
  const nodes = [];
  while (i < tokens.length) {
    const token = tokens[i];
    if (token.type === '}') {
      break;
    }
    if (closer && token.type === 'char' && token.value === closer) {
      break;
    }
    if (token.type === 'char' && (token.value === ')' || token.value === ']')) {
      break;
    }
    if (token.type === 'cmd') {
      const cmd = token.value;
      if (cmd === '\\frac') {
        i++;
        const numerator = parseArg(tokens, i);
        i = numerator.i;
        const denominator = parseArg(tokens, i);
        i = denominator.i;
        nodes.push({ t: 'frac', num: numerator.nodes, den: denominator.nodes });
      } else if (cmd === '\\sqrt') {
        i++;
        const body = parseArg(tokens, i);
        i = body.i;
        nodes.push({ t: 'sqrt', body: body.nodes });
      } else if (cmd === '\\left' || cmd === '\\right') {
        i++;
        const next = tokens[i];
        if (next && next.type === 'char') {
          nodes.push({ t: 'text', s: next.value });
          i++;
        } else if (next && (next.type === '{' || next.type === '}')) {
          nodes.push({ t: 'text', s: next.type });
          i++;
        }
      } else {
        const symbol = SYMBOLS[cmd];
        if (symbol) {
          nodes.push({ t: 'text', s: symbol });
        }
        i++;
      }
    } else if (token.type === 'char') {
      const ch = token.value;
      if (ch === '(' || ch === '[') {
        const closeCh = ch === '(' ? ')' : ']';
        const inner = parseRow(tokens, i + 1, closeCh);
        i = inner.i;
        if (tokens[i] && tokens[i].type === 'char' && tokens[i].value === closeCh) {
          i++;
        }
        nodes.push({ t: 'group', open: ch, close: closeCh, inner: inner.nodes });
      } else {
        nodes.push({ t: 'text', s: ch });
        i++;
      }
    } else if (token.type === '{') {
      const group = parseGroup(tokens, i);
      i = group.i;
      nodes.push({ t: 'row', children: group.nodes });
    } else if (token.type === '^') {
      const arg = parseArg(tokens, i + 1);
      i = arg.i;
      const base = nodes.pop() || { t: 'text', s: '' };
      nodes.push({ t: 'sup', base: base, sup: arg.nodes });
    } else if (token.type === '_') {
      const arg = parseArg(tokens, i + 1);
      i = arg.i;
      const base = nodes.pop() || { t: 'text', s: '' };
      nodes.push({ t: 'sub', base: base, sub: arg.nodes });
    }
  }
  return { nodes: nodes, i: i };
}

function parseLatex(src) {
  return parseRow(tokenize(src), 0).nodes;
}

const ASC_RATIO = 0.78;
const DESC_RATIO = 0.25;

function layoutTree(tree, fontSize) {
  let width = 0;
  let ascent = 0;
  let descent = 0;
  for (let k = 0; k < tree.length; k++) {
    const m = layoutNode(tree[k], fontSize);
    width += m.w;
    if (m.asc > ascent) ascent = m.asc;
    if (m.desc > descent) descent = m.desc;
  }
  return { w: width, asc: ascent, desc: descent };
}

function layoutNode(node, fontSize) {
  switch (node.t) {
    case 'text':
      return {
        w: textWidth(node.s, fontSize),
        asc: fontSize * ASC_RATIO,
        desc: fontSize * DESC_RATIO
      };
    case 'row':
      return layoutTree(node.children, fontSize);
    case 'group': {
      const pseudo = [
        { t: 'text', s: node.open },
        { t: 'row', children: node.inner },
        { t: 'text', s: node.close }
      ];
      return layoutTree(pseudo, fontSize);
    }
    case 'frac': {
      const num = layoutTree(node.num, fontSize);
      const den = layoutTree(node.den, fontSize);
      const barWidth = Math.max(num.w, den.w);
      const gap = fontSize * 0.16;
      const barThick = Math.max(1, fontSize * 0.05);
      return {
        w: barWidth,
        asc: num.asc + num.desc + gap + barThick / 2,
        desc: den.asc + den.desc + gap + barThick / 2
      };
    }
    case 'sqrt': {
      const body = layoutTree(node.body, fontSize);
      const radicalWidth = textWidth('√', fontSize * 1.2);
      const gap = fontSize * 0.12;
      const tick = fontSize * 0.24;
      return {
        w: radicalWidth + gap + body.w + gap * 0.4,
        asc: body.asc + tick,
        desc: body.desc
      };
    }
    case 'sup': {
      const base = layoutNode(node.base, fontSize);
      const sup = layoutTree(node.sup, fontSize * 0.7);
      const gap = fontSize * 0.05;
      const raise = fontSize * 0.42;
      return {
        w: base.w + gap + sup.w,
        asc: Math.max(base.asc, raise + sup.asc),
        desc: base.desc
      };
    }
    case 'sub': {
      const base = layoutNode(node.base, fontSize);
      const sub = layoutTree(node.sub, fontSize * 0.7);
      const gap = fontSize * 0.05;
      const lower = fontSize * 0.18;
      return {
        w: base.w + gap + sub.w,
        asc: base.asc,
        desc: Math.max(base.desc, lower + sub.desc)
      };
    }
    default:
      return { w: 0, asc: 0, desc: 0 };
  }
}

function fitFormula(latex) {
  const tree = parseLatex(latex);
  let fontSize = 20;
  let measured = layoutTree(tree, fontSize);
  while (measured.w > MAX_FORMULA_W && fontSize > 11) {
    fontSize -= 2;
    measured = layoutTree(tree, fontSize);
  }
  return {
    tree: tree,
    fs: fontSize,
    w: Math.ceil(measured.w) + 6,
    h: Math.ceil(measured.asc + measured.desc) + 6,
    asc: measured.asc,
    desc: measured.desc
  };
}

function drawNode(ctx, node, x, baseY, fontSize) {
  switch (node.t) {
    case 'text': {
      ctx.font = fontSize + 'px ' + FONT;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(node.s, x, baseY);
      return textWidth(node.s, fontSize);
    }
    case 'row': {
      let cursor = x;
      for (let k = 0; k < node.children.length; k++) {
        cursor += drawNode(ctx, node.children[k], cursor, baseY, fontSize);
      }
      return cursor - x;
    }
    case 'group': {
      let cursor = x;
      cursor += drawNode(ctx, { t: 'text', s: node.open }, cursor, baseY, fontSize);
      for (let k = 0; k < node.inner.length; k++) {
        cursor += drawNode(ctx, node.inner[k], cursor, baseY, fontSize);
      }
      cursor += drawNode(ctx, { t: 'text', s: node.close }, cursor, baseY, fontSize);
      return cursor - x;
    }
    case 'frac': {
      const num = layoutTree(node.num, fontSize);
      const den = layoutTree(node.den, fontSize);
      const barWidth = Math.max(num.w, den.w);
      const gap = fontSize * 0.16;
      const barThick = Math.max(1, Math.round(fontSize * 0.05));
      drawTree(ctx, node.num, x + (barWidth - num.w) / 2, baseY - gap - num.desc, fontSize);
      drawTree(ctx, node.den, x + (barWidth - den.w) / 2, baseY + gap + den.asc, fontSize);
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x + barWidth, baseY);
      ctx.lineWidth = barThick;
      ctx.strokeStyle = FORMULA_COLOR;
      ctx.stroke();
      return barWidth;
    }
    case 'sqrt': {
      const body = layoutTree(node.body, fontSize);
      const radicalFontSize = fontSize * 1.2;
      const radicalWidth = textWidth('√', radicalFontSize);
      const gap = fontSize * 0.12;
      const bodyX = x + radicalWidth + gap;
      ctx.font = radicalFontSize + 'px ' + FONT;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('√', x, baseY);
      ctx.beginPath();
      ctx.moveTo(bodyX + gap * 0.4, baseY - body.asc - 1);
      ctx.lineTo(bodyX + body.w, baseY - body.asc - 1);
      ctx.lineWidth = Math.max(1, Math.round(fontSize * 0.05));
      ctx.strokeStyle = FORMULA_COLOR;
      ctx.stroke();
      drawTree(ctx, node.body, bodyX, baseY, fontSize);
      return radicalWidth + gap + body.w + gap * 0.4;
    }
    case 'sup': {
      const base = layoutNode(node.base, fontSize);
      const gap = fontSize * 0.05;
      const raise = fontSize * 0.42;
      drawNode(ctx, node.base, x, baseY, fontSize);
      drawTree(ctx, node.sup, x + base.w + gap, baseY - raise, fontSize * 0.7);
      return base.w + gap + layoutTree(node.sup, fontSize * 0.7).w;
    }
    case 'sub': {
      const base = layoutNode(node.base, fontSize);
      const gap = fontSize * 0.05;
      const lower = fontSize * 0.18;
      drawNode(ctx, node.base, x, baseY, fontSize);
      drawTree(ctx, node.sub, x + base.w + gap, baseY + lower, fontSize * 0.7);
      return base.w + gap + layoutTree(node.sub, fontSize * 0.7).w;
    }
    default:
      return 0;
  }
}

function drawTree(ctx, tree, x, baseY, fontSize) {
  let cursor = x;
  for (let k = 0; k < tree.length; k++) {
    cursor += drawNode(ctx, tree[k], cursor, baseY, fontSize);
  }
}

function cleanText(line) {
  return line
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/`/g, '')
    .trim();
}

function pushInlineFormula(blocks, line) {
  const match = line.match(/(.*?)\$\$(.+?)\$\$(.*)/);
  if (!match) {
    blocks.push({ type: 'text', text: cleanText(line) });
    return;
  }
  const before = cleanText(match[1]);
  const latex = match[2].trim();
  const after = cleanText(match[3]);
  if (before) {
    blocks.push({ type: 'text', text: before });
  }
  blocks.push({ type: 'formula', latex: latex });
  if (after) {
    blocks.push({ type: 'text', text: after });
  }
}

function buildBlocks(text) {
  const lines = String(text || '').split(/\r?\n/);
  const blocks = [];
  for (let k = 0; k < lines.length; k++) {
    const line = lines[k].trim();
    if (line.indexOf('$$') === 0 && line.lastIndexOf('$$') === line.length - 2 && line.length > 4) {
      blocks.push({ type: 'formula', latex: line.slice(2, -2).trim() });
    } else if (line.indexOf('$$') !== -1) {
      pushInlineFormula(blocks, line);
    } else if (line === '') {
      blocks.push({ type: 'gap' });
    } else {
      blocks.push({ type: 'text', text: cleanText(line) });
    }
  }
  return blocks;
}

export default {
  data: {
    phase: 'capture',
    countdown: 3,
    scanTop: 8,
    scanDir: 1,
    progress: 0,
    statusText: '3 秒后自动拍摄',
    solvingLabel: 'AI 解题中',
    errorText: '',
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
    this._formulaLayouts = {};
    this._timers = [];
    this.startCaptureFlow();
  },

  onUnload() {
    this.clearTimers();
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
    this.addTimer(120, () => {
      let top = this.data.scanTop + 2 * this.data.scanDir;
      if (top > 220) {
        top = 220;
        this.setData({ scanDir: -1 });
      }
      if (top < 8) {
        top = 8;
        this.setData({ scanDir: 1 });
      }
      this.setData({ scanTop: top });
    });

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
        photo = await camera.takePhoto({ quality: 'high' });
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
    const mime = (photo && photo.mimeType) || 'image/jpeg';
    const base64 = wx.arrayBufferToBase64(photo.data);
    const dataUrl = 'data:' + mime + ';base64,' + base64;
    this.solveQuestion(dataUrl);
  },

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  async solveQuestion(dataUrl) {
    this.setData({ phase: 'solving', solvingLabel: 'AI 解题中', statusText: '正在识别题目…' });
    this.addTimer(110, () => {
      let progress = this.data.progress + 6;
      if (progress > 300) {
        progress = 0;
      }
      this.setData({ progress: progress });
    });

    try {
      const availability = await LanguageModel.availability();
      if (availability !== 'available') {
        this.fail('当前设备未提供 AI 能力');
        return;
      }
      this.setData({ statusText: '正在解题…' });
      const session = await LanguageModel.create({
        initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }]
      });
      const answer = await session.prompt([
        {
          role: 'user',
          content: [
            { type: 'text', text: '请解答照片中的这道题，按约定格式输出。' },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }
      ]);
      this.showAnswer(answer);
    } catch (e) {
      this.fail('AI 解题失败：' + ((e && e.message) || '未知错误'));
    }
  },

  showAnswer(answer) {
    const blocks = buildBlocks(answer);
    for (let k = 0; k < blocks.length; k++) {
      const block = blocks[k];
      block.id = k;
      if (block.type === 'formula') {
        const fit = fitFormula(block.latex);
        this._formulaLayouts[k] = fit;
        block.width = fit.w;
        block.height = fit.h;
      }
    }
    this.clearTimers();
    this.setData({ phase: 'answer', answerBlocks: blocks, statusText: '' });
    this.drawFormulas();
  },

  drawFormulas() {
    const blocks = this.data.answerBlocks;
    for (let k = 0; k < blocks.length; k++) {
      if (blocks[k].type !== 'formula') {
        continue;
      }
      const layout = this._formulaLayouts[k];
      if (layout) {
        this.drawFormulaCanvas(k, layout);
      }
    }
  },

  drawFormulaCanvas(index, layout) {
    let attempts = 0;
    const run = () => {
      let ctx = null;
      try {
        ctx = wx.createCanvasContext('formula-' + index);
      } catch (e) {
        ctx = null;
      }
      if (!ctx) {
        if (attempts < 40) {
          attempts++;
          setTimeout(run, 25);
        }
        return;
      }
      ctx.fillStyle = FORMULA_COLOR;
      ctx.clearRect(0, 0, layout.w, layout.h);
      drawTree(ctx, layout.tree, 2, layout.asc + 2, layout.fs);
      ctx.flush();
    };
    run();
  },

  fail(message) {
    this.clearTimers();
    this.setData({ phase: 'error', errorText: message });
  }
};
</script>

<page>
  <view class="stage-capture" ink:if="{{phase === 'capture'}}">
    <view class="viewfinder">
      <view class="corner corner-tl"></view>
      <view class="corner corner-tr"></view>
      <view class="corner corner-bl"></view>
      <view class="corner corner-br"></view>
      <view class="scan-line" style="top: {{scanTop}}px;"></view>
    </view>
    <text class="countdown">{{countdown}}</text>
    <text class="hint">请将题目置于视野中央</text>
    <text class="sub-hint">{{statusText}} · 无需操作</text>
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
    <view class="answer-head-wrap">
      <text class="answer-head">解答</text>
    </view>
    <scroll-view class="answer-scroll" scroll-y="true">
      <view class="answer-block" ink:for="{{answerBlocks}}" ink:key="id">
        <text class="answer-text" ink:if="{{item.type === 'text'}}">{{item.text}}</text>
        <view class="formula-wrap" ink:elif="{{item.type === 'formula'}}">
          <canvas id="formula-{{index}}" width="{{item.width}}" height="{{item.height}}" style="width: {{item.width}}px; height: {{item.height}}px;"></canvas>
        </view>
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

.viewfinder {
  position: relative;
  width: 336px;
  height: 232px;
  border: 1px solid var(--border-color-muted);
  border-radius: var(--radius-md);
}

.corner {
  position: absolute;
  width: 22px;
  height: 22px;
  border-color: var(--color-primary-60);
  border-style: solid;
  border-width: 0;
}

.corner-tl {
  top: -1px;
  left: -1px;
  border-top-width: 2px;
  border-left-width: 2px;
  border-top-left-radius: var(--radius-md);
}

.corner-tr {
  top: -1px;
  right: -1px;
  border-top-width: 2px;
  border-right-width: 2px;
  border-top-right-radius: var(--radius-md);
}

.corner-bl {
  bottom: -1px;
  left: -1px;
  border-bottom-width: 2px;
  border-left-width: 2px;
  border-bottom-left-radius: var(--radius-md);
}

.corner-br {
  bottom: -1px;
  right: -1px;
  border-bottom-width: 2px;
  border-right-width: 2px;
  border-bottom-right-radius: var(--radius-md);
}

.scan-line {
  position: absolute;
  left: 10px;
  width: 316px;
  height: 2px;
  background-color: var(--color-primary-60);
  box-shadow: 0 0 6px var(--color-primary-40);
}

.countdown {
  margin-top: 20px;
  font-size: 44px;
  font-weight: 500;
  line-height: 52px;
  color: var(--color-primary);
  text-align: center;
}

.hint {
  margin-top: 6px;
  font-size: 14px;
  line-height: 20px;
  color: var(--color-primary-60);
  text-align: center;
}

.sub-hint {
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
  font-size: 16px;
  line-height: 24px;
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
  font-size: 12px;
  line-height: 16px;
  color: var(--color-primary-40);
  text-align: center;
}

.stage-answer {
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
}

.answer-head-wrap {
  flex-shrink: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color-muted);
}

.answer-head {
  font-size: 16px;
  line-height: 22px;
  font-weight: 500;
  color: var(--color-primary);
}

.answer-scroll {
  flex-grow: 1;
  margin-top: 8px;
}

.answer-block {
  margin-bottom: 6px;
}

.answer-text {
  font-size: 14px;
  line-height: 20px;
  color: var(--color-primary-60);
}

.formula-wrap {
  margin: 4px 0;
  padding: 4px 0 4px 8px;
  border-left: 2px solid var(--color-primary-40);
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
</style>