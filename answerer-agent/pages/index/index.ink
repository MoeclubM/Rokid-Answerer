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

let canvasSupported = true;

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
  let fontSize = 22;
  let measured = layoutTree(tree, fontSize);
  while (measured.w > MAX_FORMULA_W && fontSize > 12) {
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
    confirmCountdown: 5,
    scanTop: 8,
    scanDir: 1,
    progress: 0,
    statusText: '单击触摸板拍摄',
    solvingLabel: 'AI 解题中',
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
    this._formulaLayouts = {};
    this._timers = [];
    this._lastTapAt = 0;
    this.startCaptureFlow();
  },

  onUnload() {
    this.clearTimers();
  },

  onKeyUp(event) {
    const code = event.code;
    if (code === 'Enter' || code === 'GlobalHook') {
      event.preventDefault();
      this.handleTap();
      return;
    }
    if (this.data.phase !== 'answer') {
      return;
    }
    if (code === 'ArrowUp') {
      event.preventDefault();
      this.setData({
        autoScroll: false,
        scrollTop: Math.max(0, (this.data.scrollTop || 0) - 240)
      });
    } else if (code === 'ArrowDown') {
      event.preventDefault();
      this.setData({
        autoScroll: true,
        scrollTop: (this.data.scrollTop || 0) + 240
      });
    }
  },

  handleTap() {
    const phase = this.data.phase;
    const now = Date.now();
    const gap = now - (this._lastTapAt || 0);
    this._lastTapAt = now;
    if (phase === 'capture') {
      this.openConfirm();
    } else if (phase === 'confirm') {
      if (gap < 400) {
        this.cancelConfirm();
      } else {
        this.clearTimers();
        this.capturePhoto();
      }
    } else if (phase === 'answer' || phase === 'error') {
      this.resetSearch();
    }
  },

  openConfirm() {
    this.setData({
      phase: 'confirm',
      confirmCountdown: 5,
      statusText: '等待确认…'
    });
    this.addTimer(1000, () => {
      const next = this.data.confirmCountdown - 1;
      if (next <= 0) {
        this.cancelConfirm();
        return;
      }
      this.setData({ confirmCountdown: next });
    });
  },

  cancelConfirm() {
    this.clearTimers();
    this.startCaptureFlow();
    this.setData({
      phase: 'capture',
      confirmCountdown: 5,
      statusText: '单击触摸板拍摄'
    });
  },

  resetSearch() {
    this.clearTimers();
    this._formulaLayouts = {};
    this.setData({
      phase: 'capture',
      photoSrc: '',
      answerBlocks: [],
      scrollTop: 0,
      autoScroll: true,
      confirmCountdown: 5,
      progress: 0,
      statusText: '单击触摸板拍摄'
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
      this.setData({ photoSrc: dataUrl });
      this.solveQuestion(dataUrl);
    } catch (e) {
      this.fail('拍摄数据处理失败，请重试');
    }
  },

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  async solveQuestion(dataUrl) {
    this.setData({ phase: 'solving', solvingLabel: 'AI 解题中', statusText: '正在识别题目…' });
    this.startProgress();
    try {
      await this.withTimeout(this.streamSolve(dataUrl), 60000, 'AI 解题超时，请重试');
    } catch (e) {
      this.fail('AI 解题失败：' + ((e && e.message) || '未知错误'));
    }
  },

  async streamSolve(dataUrl) {
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
    }
    if (text === null) {
      this.setData({ statusText: '正在解题…' });
      text = await session.prompt(messages);
      this.cancelStream();
    }
    this.renderStream(text, true);
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
    const blocks = isFinal ? buildBlocks(text) : buildStreamingBlocks(text);
    const formulaDraws = [];
    for (let k = 0; k < blocks.length; k++) {
      const block = blocks[k];
      block.id = k;
      if (block.type === 'formula') {
        if (!canvasSupported) {
          block.type = 'text';
          block.text = latexToUnicode(block.latex);
          block.latex = '';
          continue;
        }
        const fit = fitFormula(block.latex);
        this._formulaLayouts[k] = fit;
        block.width = fit.w;
        block.height = fit.h;
        formulaDraws.push([k, fit]);
      }
    }
    this.clearTimers();
    const patch = { phase: 'answer', answerBlocks: blocks, statusText: '' };
    if (this.data.autoScroll) {
      patch.scrollTop = (this.data.scrollTop || 0) + 5000;
    }
    this.setData(patch);
    for (let d = 0; d < formulaDraws.length; d++) {
      this.drawFormulaCanvas(formulaDraws[d][0], formulaDraws[d][1]);
    }
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
          return;
        }
        canvasSupported = false;
        this.markFormulaFallback(index);
        return;
      }
      ctx.fillStyle = FORMULA_COLOR;
      ctx.clearRect(0, 0, layout.w, layout.h);
      drawTree(ctx, layout.tree, 2, layout.asc + 2, layout.fs);
      ctx.flush();
    };
    run();
  },

  markFormulaFallback(index) {
    const current = this.data.answerBlocks;
    if (!current || !current[index] || current[index].type !== 'formula') {
      return;
    }
    const blocks = [];
    for (let k = 0; k < current.length; k++) {
      if (k === index) {
        blocks.push({ type: 'text', text: latexToUnicode(current[k].latex), id: current[k].id });
      } else {
        blocks.push(current[k]);
      }
    }
    this.setData({ answerBlocks: blocks });
  },

  fail(message) {
    this.clearTimers();
    this.cancelStream();
    this.setData({ phase: 'error', errorText: message });
  }
};
</script>

<page>
  <view class="stage-capture" ink:if="{{phase === 'capture' || phase === 'confirm'}}">
    <view class="viewfinder">
      <view class="corner corner-tl"></view>
      <view class="corner corner-tr"></view>
      <view class="corner corner-bl"></view>
      <view class="corner corner-br"></view>
      <view class="scan-line" style="top: {{scanTop}}px;"></view>
      <view class="confirm-dialog" ink:if="{{phase === 'confirm'}}">
        <text class="confirm-title">是否立刻拍照？</text>
        <text class="confirm-count">{{confirmCountdown}}</text>
        <text class="confirm-hint">再次单击确认 · 双击取消</text>
      </view>
    </view>
    <text class="hint">请将题目置于视野中央</text>
    <text class="sub-hint">{{statusText}}</text>
  </view>

  <view class="stage-solving" ink:elif="{{phase === 'solving'}}">
    <view class="photo-preview">
      <image class="photo-img" src="{{photoSrc}}" mode="widthFix"></image>
    </view>
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
      <view class="answer-thumb-wrap" ink:if="{{photoSrc}}">
        <image class="answer-thumb" src="{{photoSrc}}" mode="widthFix"></image>
      </view>
      <text class="answer-head">解答</text>
    </view>
    <scroll-view class="answer-scroll" scroll-y="true" scroll-top="{{scrollTop}}">
      <view class="answer-block" ink:for="{{answerBlocks}}" ink:key="id">
        <text class="answer-text" ink:if="{{item.type === 'text'}}">{{item.text}}</text>
        <view class="formula-wrap" ink:elif="{{item.type === 'formula'}}">
          <canvas id="formula-{{index}}" width="{{item.width}}" height="{{item.height}}" style="width: {{item.width}}px; height: {{item.height}}px;"></canvas>
        </view>
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

.answer-head-wrap {
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color-muted);
}

.answer-head {
  font-size: 18px;
  line-height: 26px;
  font-weight: 500;
  color: var(--color-primary);
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

.photo-preview {
  width: 280px;
  height: 150px;
  overflow: hidden;
  border: 1px solid var(--border-color-muted);
  border-radius: var(--radius-md);
  margin-bottom: 14px;
}

.photo-img {
  width: 280px;
  opacity: 0.35;
}

.answer-thumb-wrap {
  width: 64px;
  height: 36px;
  overflow: hidden;
  border: 1px solid var(--border-color-muted);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.answer-thumb {
  width: 64px;
  opacity: 0.5;
}

.answer-text-pending {
  font-size: 16px;
  line-height: 24px;
  color: var(--color-primary-40);
}

.confirm-dialog {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 280px;
  margin-left: -140px;
  margin-top: -64px;
  padding: 16px 12px;
  background-color: rgba(0, 0, 0, 0.85);
  border: 1px solid var(--color-primary-60);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.confirm-title {
  font-size: 16px;
  line-height: 24px;
  color: var(--color-primary-60);
  text-align: center;
}

.confirm-count {
  margin-top: 8px;
  font-size: 40px;
  line-height: 48px;
  font-weight: 500;
  color: var(--color-primary);
  text-align: center;
}

.confirm-hint {
  margin-top: 4px;
  font-size: 12px;
  line-height: 16px;
  color: var(--color-primary-40);
  text-align: center;
}
</style>