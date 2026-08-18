// ===================================================
// LaTeX 专业数学排版与 Canvas 2D 渲染引擎 (Rokid AIUI 专用)
// 支持分式、根式、上下标、求和、积分、极限等完整 AST 级图形化公式渲染
// ===================================================

export const SYMBOLS = {
  '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\epsilon': 'ε', '\\varepsilon': 'ε',
  '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ', '\\vartheta': 'θ', '\\iota': 'ι', '\\kappa': 'κ',
  '\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π', '\\varpi': 'ϖ',
  '\\rho': 'ρ', '\\varrho': 'ϱ', '\\sigma': 'σ', '\\varsigma': 'ς', '\\tau': 'τ', '\\upsilon': 'υ',
  '\\phi': 'φ', '\\varphi': 'ϕ', '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
  '\\Gamma': 'Γ', '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ', '\\Xi': 'Ξ', '\\Pi': 'Π',
  '\\Sigma': 'Σ', '\\Upsilon': 'Υ', '\\Phi': 'Φ', '\\Psi': 'Ψ', '\\Omega': 'Ω',
  '\\sum': '∑', '\\prod': '∏', '\\coprod': '∐', '\\int': '∫', '\\iint': '∬', '\\iiint': '∭', '\\oint': '∮',
  '\\partial': '∂', '\\nabla': '∇', '\\infty': '∞', '\\pm': '±', '\\mp': '∓',
  '\\times': '×', '\\div': '÷', '\\cdot': '·', '\\ast': '*', '\\star': '⋆',
  '\\leq': '≤', '\\le': '≤', '\\geq': '≥', '\\ge': '≥', '\\neq': '≠', '\\ne': '≠',
  '\\approx': '≈', '\\equiv': '≡', '\\sim': '~', '\\simeq': '≃', '\\cong': '≅', '\\propto': '∝',
  '\\leftarrow': '←', '\\rightarrow': '→', '\\to': '→', '\\Leftarrow': '⇐', '\\Rightarrow': '⇒',
  '\\leftrightarrow': '↔', '\\Leftrightarrow': '⇔', '\\Longleftrightarrow': '⟺', '\\iff': '⟺',
  '\\implies': '⟹', '\\uparrow': '↑', '\\downarrow': '↓',
  '\\forall': '∀', '\\exists': '∃', '\\nexists': '∄', '\\in': '∈', '\\notin': '∉',
  '\\subset': '⊂', '\\supset': '⊃', '\\subseteq': '⊆', '\\supseteq': '⊇',
  '\\cap': '∩', '\\cup': '∪', '\\setminus': '\\', '\\emptyset': '∅',
  '\\angle': '∠', '\\perp': '⊥', '\\parallel': '∥', '\\circ': '°', '\\prime': '′',
  '\\dots': '…', '\\ldots': '…', '\\cdots': '…', '\\vdots': '⋮', '\\ddots': '⋱',
  '\\quad': ' ', '\\qquad': '  ', '\\,': ' ', '\\;': ' ', '\\!': '',
  '\\left': '', '\\right': '', '\\big': '', '\\Big': '', '\\bigg': '', '\\Bigg': '', '\\limits': '',
  '\\left.': '', '\\right.': '', '\\hat': '', '\\bar': '', '\\tilde': '', '\\dot': '', '\\ddot': '', '\\over': '/',
  '\\vec': '', '\\mathbf': '', '\\mathrm': '', '\\text': '', '\\bm': '', '\\boldsymbol': '', '\\mathbb': '', '\\mathcal': ''
};

export const BIG_OPERATORS = new Set(['∫', '∬', '∭', '∮', '∑', '∏', '∐', 'lim']);

const MATH_FUNCS = [
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'sinh', 'cosh', 'tanh', 'coth',
  'arcsin', 'arccos', 'arctan',
  'ln', 'log', 'exp', 'lim', 'max', 'min',
  'inf', 'sup', 'arg', 'Arg', 'det', 'ker', 'dim', 'deg',
  'Re', 'Im', 'Res'
];
for (let k = 0; k < MATH_FUNCS.length; k++) {
  SYMBOLS['\\' + MATH_FUNCS[k]] = MATH_FUNCS[k];
}

export const SUB_MAP = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'b': 'ᵦ', 'c': '𝒸', 'd': '𝒹', 'e': 'ₑ', 'f': '𝒻', 'g': '₉',
  'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ',
  'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ', 'y': 'ᵧ', 'z': 'z',
  'A': 'ₐ', 'B': 'ᵦ', 'C': '𝒸', 'D': '𝒹', 'E': 'ₑ', 'F': '𝒻', 'G': '₉',
  'H': 'ₕ', 'I': 'ᵢ', 'J': 'ⱼ', 'K': 'ₖ', 'L': 'ₗ', 'M': 'ₘ', 'N': 'ₙ',
  'O': 'ₒ', 'P': 'ₚ', 'R': 'ᵣ', 'S': 'ₛ', 'T': 'ₜ', 'U': 'ᵤ', 'V': 'ᵥ', 'X': 'ₓ', 'Y': 'ᵧ', 'Z': 'z',
  'α': 'ᵅ', 'β': 'ᵦ', 'γ': 'ᵧ', 'ρ': 'ᵨ', 'φ': 'ᵩ', 'χ': 'ᵪ',
  '→': '→', '∞': '∞'
};

export const SUP_MAP = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ',
  'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ',
  'o': 'ᵒ', 'p': 'ᵖ', 'q': 'ᑫ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ',
  'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
  'A': 'ᴬ', 'B': 'ᴮ', 'C': 'ᶜ', 'D': 'ᴰ', 'E': 'ᴱ', 'F': 'ᶠ', 'G': 'ᴳ',
  'H': 'ᴴ', 'I': 'ᴵ', 'J': 'ᴶ', 'K': 'ᴷ', 'L': 'ᴸ', 'M': 'ᴹ', 'N': 'ᴺ',
  'O': 'ᴼ', 'P': 'ᴾ', 'Q': 'ᑫ', 'R': 'ᴿ', 'S': 'ˢ', 'T': 'ᵀ', 'U': 'ᵁ',
  'V': 'ⱽ', 'W': 'ᵂ', 'X': 'ˣ', 'Y': 'ʸ', 'Z': 'ᶻ',
  '*': '﹡', '\'': '′', '′': '′', '″': '″', '"': '″', '˙': '˙',
  'α': 'ᵅ', 'β': 'ᵝ', 'γ': 'ᵞ', 'δ': 'ᵟ', 'ε': 'ᵋ', 'θ': 'ᶿ', 'ι': 'ᶥ',
  'π': 'ᵖ', 'φ': 'ᵠ', 'χ': 'ᵡ', 'ω': 'ʷ', 'μ': 'ᵐ',
  '∞': '∞'
};

export function takeGroup(src, i) {
  while (i < src.length && src[i] === ' ') i++;
  if (i >= src.length) return { text: '', i: i };
  const ch = src[i];
  if (ch === '{' || ch === '(' || ch === '[') {
    const close = ch === '{' ? '}' : (ch === '(' ? ')' : ']');
    let depth = 1;
    let j = i + 1;
    const start = j;
    while (j < src.length && depth > 0) {
      if (src[j] === ch) depth++;
      else if (src[j] === close) depth--;
      j++;
    }
    return { text: src.slice(start, j - 1), i: j };
  }
  if (src[i] === '\\') {
    let j = i + 1;
    while (j < src.length && /[a-zA-Z]/.test(src[j])) j++;
    return { text: src.slice(i, j), i: j };
  }
  let j = i;
  if (src[j] === '+' || src[j] === '-') j++;
  if (j < src.length && /[0-9a-zA-Z]/.test(src[j])) {
    while (j < src.length && /[0-9a-zA-Z]/.test(src[j])) j++;
    return { text: src.slice(i, j), i: j };
  }
  return { text: src[i], i: i + 1 };
}

export function takeArgs(src, i, count) {
  const args = [];
  while (args.length < count && i < src.length) {
    while (i < src.length && src[i] === ' ') i++;
    if (i >= src.length) break;
    const ch = src[i];
    if (ch === '{' || ch === '(' || ch === '[') {
      const close = ch === '{' ? '}' : (ch === '(' ? ')' : ']');
      let depth = 1;
      let j = i + 1;
      const start = j;
      while (j < src.length && depth > 0) {
        if (src[j] === ch) depth++;
        else if (src[j] === close) depth--;
        j++;
      }
      args.push(src.slice(start, j - 1));
      i = j;
    } else if (ch === '\\') {
      let j = i + 1;
      while (j < src.length && /[a-zA-Z]/.test(src[j])) j++;
      args.push(src.slice(i, j));
      i = j;
    } else {
      args.push(src[i]);
      i++;
    }
  }
  return { args: args, i: i };
}

export function wrapIfOperator(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  if (/^\([^\)]+\)[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ]*$/.test(t)) return t;
  if (/^\[[^\]]+\]$/.test(t)) return t;
  if (/^\|[^\|]+\|$/.test(t)) return t;

  const stripped = t.replace(/\([^\)]*\)/g, '').replace(/\[[^\]]*\]/g, '');
  if (!/[+\-=]/.test(stripped)) return t;

  return '(' + t + ')';
}

export function mapToScript(inner, isSup) {
  const clean = String(inner || '').trim().replace(/\s+/g, '');
  if (clean === '\\infty' || clean === '∞') return isSup ? '∞' : '₋∞';
  if (clean === '-\\infty' || clean === '-∞') return isSup ? '⁻∞' : '₋∞';
  if (clean === '+\\infty' || clean === '+∞') return isSup ? '⁺∞' : '₊∞';

  const map = isSup ? SUP_MAP : SUB_MAP;
  let res = '';
  let allMapped = true;
  for (let k = 0; k < clean.length; k++) {
    const ch = clean[k];
    if (map[ch] !== undefined) {
      res += map[ch];
    } else {
      allMapped = false;
      break;
    }
  }

  if (allMapped && res.length > 0) return res;

  if (!isSup) {
    return '₍' + clean + '₎';
  }
  return '⁽' + clean + '⁾';
}

export function parseLatex(src) {
  const cleanSrc = String(src || '').trim();
  const nodes = [];
  let i = 0;
  while (i < cleanSrc.length) {
    const ch = cleanSrc[i];
    if (ch === '\\') {
      let j = i + 1;
      while (j < cleanSrc.length && /[a-zA-Z]/.test(cleanSrc[j])) j++;
      const cmd = cleanSrc.slice(i, j);

      if (cmd === '\\frac' || cmd === '\\dfrac' || cmd === '\\tfrac') {
        const args = takeArgs(cleanSrc, j, 2);
        nodes.push({ type: 'frac', num: parseLatex(args.args[0] || ''), den: parseLatex(args.args[1] || '') });
        i = args.i;
      } else if (cmd === '\\sqrt') {
        const args = takeArgs(cleanSrc, j, 1);
        nodes.push({ type: 'sqrt', body: parseLatex(args.args[0] || '') });
        i = args.i;
      } else if (cmd === '\\left' || cmd === '\\right') {
        if (cleanSrc[j] === '.') j++;
        i = j;
      } else if (cmd === '\\limits') {
        i = j;
      } else if (
        cmd === '\\vec' || cmd === '\\mathbf' || cmd === '\\mathrm' || cmd === '\\text' ||
        cmd === '\\bm' || cmd === '\\boldsymbol' || cmd === '\\mathbb' || cmd === '\\mathcal'
      ) {
        const g1 = takeGroup(cleanSrc, j);
        const innerNodes = parseLatex(g1.text);
        for (let idx = 0; idx < innerNodes.length; idx++) nodes.push(innerNodes[idx]);
        i = g1.i;
      } else {
        const sym = SYMBOLS[cmd] || (cmd === '\\lim' ? 'lim' : cmd.slice(1));
        let nextIdx = j;
        if (BIG_OPERATORS.has(sym)) {
          let subNode = null;
          let supNode = null;
          while (nextIdx < cleanSrc.length) {
            while (nextIdx < cleanSrc.length && cleanSrc[nextIdx] === ' ') nextIdx++;
            if (nextIdx < cleanSrc.length && cleanSrc[nextIdx] === '_') {
              const gSub = takeGroup(cleanSrc, nextIdx + 1);
              subNode = parseLatex(gSub.text);
              nextIdx = gSub.i;
            } else if (nextIdx < cleanSrc.length && cleanSrc[nextIdx] === '^') {
              const gSup = takeGroup(cleanSrc, nextIdx + 1);
              supNode = parseLatex(gSup.text);
              nextIdx = gSup.i;
            } else {
              break;
            }
          }
          nodes.push({ type: 'bigop', text: sym, sub: subNode, sup: supNode });
          i = nextIdx;
        } else {
          nodes.push({ type: 'text', text: sym });
          i = j;
        }
      }
    } else if (ch === '^') {
      const g1 = takeGroup(cleanSrc, i + 1);
      nodes.push({ type: 'sup', exp: parseLatex(g1.text) });
      i = g1.i;
    } else if (ch === '_') {
      const g1 = takeGroup(cleanSrc, i + 1);
      nodes.push({ type: 'sub', sub: parseLatex(g1.text) });
      i = g1.i;
    } else if (ch === ' ' || ch === '{' || ch === '}') {
      if (ch === ' ' && nodes.length > 0 && nodes[nodes.length - 1].type === 'text') {
        nodes[nodes.length - 1].text += ' ';
      }
      i++;
    } else {
      let text = ch;
      let k = i + 1;
      while (k < cleanSrc.length && !/[\\^_{} ]/.test(cleanSrc[k])) {
        text += cleanSrc[k];
        k++;
      }
      nodes.push({ type: 'text', text: text });
      i = k;
    }
  }
  return nodes;
}

export function measureMathAst(nodes, fontSize = 22) {
  let width = 0;
  let maxAscent = fontSize * 0.8;
  let maxDescent = fontSize * 0.3;

  const measured = [];
  for (let k = 0; k < nodes.length; k++) {
    const node = nodes[k];
    if (node.type === 'bigop') {
      const isLim = node.text === 'lim';
      const opFont = isLim ? fontSize * 1.15 : fontSize * 1.55;
      const opW = isLim ? fontSize * 1.6 : opFont * 0.72;
      const subM = node.sub ? measureMathAst(node.sub, fontSize * 0.68) : null;
      const supM = node.sup ? measureMathAst(node.sup, fontSize * 0.68) : null;
      const limitsW = Math.max(subM ? subM.w : 0, supM ? supM.w : 0);
      const w = Math.max(opW, limitsW) + 4;
      const ascent = Math.max(opFont * 0.75, supM ? (fontSize * 0.60 + supM.h) : 0);
      const descent = Math.max(opFont * 0.35, subM ? (fontSize * 0.40 + subM.h) : 0);
      measured.push({
        node: node,
        w: w,
        opW: opW,
        fontSize: opFont,
        ascent: ascent,
        descent: descent,
        subM: subM,
        supM: supM
      });
      width += w;
    } else if (node.type === 'text') {
      const w = node.text.length * (fontSize * 0.58);
      measured.push({ node: node, w: w, fontSize: fontSize, ascent: fontSize * 0.8, descent: fontSize * 0.25 });
      width += w;
    } else if (node.type === 'frac') {
      const numM = measureMathAst(node.num, fontSize * 0.88);
      const denM = measureMathAst(node.den, fontSize * 0.88);
      const w = Math.max(numM.w, denM.w) + 14;
      const ascent = numM.h + 5;
      const descent = denM.h + 5;
      measured.push({ node: node, w: w, ascent: ascent, descent: descent, numM: numM, denM: denM });
      width += w;
    } else if (node.type === 'sqrt') {
      const bodyM = measureMathAst(node.body, fontSize * 0.95);
      const w = bodyM.w + 16;
      const ascent = bodyM.ascent + 6;
      const descent = bodyM.descent + 3;
      measured.push({ node: node, w: w, ascent: ascent, descent: descent, bodyM: bodyM });
      width += w;
    } else if (node.type === 'sup') {
      const expM = measureMathAst(node.exp, fontSize * 0.75);
      const w = expM.w;
      const ascent = maxAscent + expM.h * 0.55;
      measured.push({ node: node, w: w, ascent: ascent, descent: 0, expM: expM });
      width += w;
    } else if (node.type === 'sub') {
      const subM = measureMathAst(node.sub, fontSize * 0.75);
      const w = subM.w;
      const descent = maxDescent + subM.h * 0.45;
      measured.push({ node: node, w: w, ascent: 0, descent: descent, subM: subM });
      width += w;
    }
  }

  for (let k = 0; k < measured.length; k++) {
    const m = measured[k];
    if (m.ascent > maxAscent) maxAscent = m.ascent;
    if (m.descent > maxDescent) maxDescent = m.descent;
  }

  return {
    w: width,
    h: maxAscent + maxDescent,
    ascent: maxAscent,
    descent: maxDescent,
    items: measured
  };
}

export function drawMathAst(ctx, measuredRow, startX, baselineY, fontSize, color) {
  let curX = startX;
  ctx.fillStyle = color || '#40FF5E';
  ctx.strokeStyle = color || '#40FF5E';
  ctx.lineWidth = 1.8;

  for (let k = 0; k < measuredRow.items.length; k++) {
    const item = measuredRow.items[k];
    const node = item.node;

    if (node.type === 'bigop') {
      const opFont = Math.round(item.fontSize || fontSize * 1.55);
      ctx.font = opFont + 'px sans-serif';
      ctx.textBaseline = 'middle';
      const midY = baselineY - fontSize * 0.28;
      const opX = curX + (item.w - item.opW) / 2;
      ctx.fillText(node.text, opX, midY);

      if (item.supM) {
        const supX = curX + (item.w - item.supM.w) / 2;
        const supBaseline = baselineY - fontSize * 0.65;
        drawMathAst(ctx, item.supM, supX, supBaseline, fontSize * 0.68, color);
      }
      if (item.subM) {
        const subX = curX + (item.w - item.subM.w) / 2;
        const subBaseline = baselineY + fontSize * 0.48;
        drawMathAst(ctx, item.subM, subX, subBaseline, fontSize * 0.68, color);
      }
    } else if (node.type === 'text') {
      ctx.font = Math.round(item.fontSize || fontSize) + 'px sans-serif';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(node.text, curX, baselineY);
    } else if (node.type === 'frac') {
      const fracW = item.w;
      const midY = baselineY - fontSize * 0.3;
      ctx.beginPath();
      ctx.moveTo(curX + 2, midY);
      ctx.lineTo(curX + fracW - 2, midY);
      ctx.stroke();

      const numX = curX + (fracW - item.numM.w) / 2;
      const numBaseline = midY - 4 - item.numM.descent;
      drawMathAst(ctx, item.numM, numX, numBaseline, fontSize * 0.88, color);

      const denX = curX + (fracW - item.denM.w) / 2;
      const denBaseline = midY + 4 + item.denM.ascent;
      drawMathAst(ctx, item.denM, denX, denBaseline, fontSize * 0.88, color);
    } else if (node.type === 'sqrt') {
      const sqrtW = item.w;
      const botY = baselineY + item.descent;
      const topY = baselineY - item.ascent + 2;
      ctx.beginPath();
      ctx.moveTo(curX, botY - 5);
      ctx.lineTo(curX + 3, botY - 1);
      ctx.lineTo(curX + 7, topY);
      ctx.lineTo(curX + sqrtW, topY);
      ctx.stroke();

      drawMathAst(ctx, item.bodyM, curX + 9, baselineY, fontSize * 0.95, color);
    } else if (node.type === 'sup') {
      const supBaseline = baselineY - fontSize * 0.48;
      drawMathAst(ctx, item.expM, curX, supBaseline, fontSize * 0.75, color);
    } else if (node.type === 'sub') {
      const subBaseline = baselineY + fontSize * 0.32;
      drawMathAst(ctx, item.subM, curX, subBaseline, fontSize * 0.75, color);
    }
    curX += item.w;
  }
}

export function latexToUnicode(src) {
  const convert = (s) => {
    let out = '';
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (ch === '\\') {
        let j = i + 1;
        while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
        const cmd = s.slice(i, j);

        if (cmd === '\\frac' || cmd === '\\dfrac' || cmd === '\\tfrac') {
          const args = takeArgs(s, j, 2);
          const num = convert(args.args[0] || '').trim();
          const den = convert(args.args[1] || '').trim();
          out += wrapIfOperator(num) + '/' + wrapIfOperator(den);
          i = args.i;
        } else if (cmd === '\\sqrt') {
          const args = takeArgs(s, j, 1);
          const body = convert(args.args[0] || '').trim();
          out += '√' + wrapIfOperator(body);
          i = args.i;
        } else if (
          cmd === '\\text' || cmd === '\\mathrm' || cmd === '\\mathbf' || cmd === '\\mathbb' ||
          cmd === '\\mathcal' || cmd === '\\vec' || cmd === '\\bm' || cmd === '\\boldsymbol'
        ) {
          const g1 = takeGroup(s, j);
          out += convert(g1.text || '');
          i = g1.i;
        } else if (cmd === '\\left' || cmd === '\\right') {
          if (s[j] === '.') j++;
          i = j;
        } else if (cmd === '\\limits') {
          i = j;
        } else if (SYMBOLS[cmd] !== undefined) {
          out += SYMBOLS[cmd];
          i = j;
        } else {
          out += cmd.slice(1);
          i = j;
        }
      } else if (ch === '^' || ch === '_') {
        const isSup = ch === '^';
        const g1 = takeGroup(s, i + 1);
        const inner = convert(g1.text || '').trim();
        out += mapToScript(inner, isSup);
        i = g1.i;
      } else if (ch === '{' || ch === '}') {
        i++;
      } else {
        out += ch;
        i++;
      }
    }
    return out;
  };

  let res = convert(String(src || ''));

  res = res.replace(/\(\(([^()]+)\)\)/g, '($1)');
  res = res.replace(/_\{([^}]+)\}/g, (m, p1) => mapToScript(p1, false));
  res = res.replace(/\^\{([^}]+)\}/g, (m, p1) => mapToScript(p1, true));
  res = res.replace(/\{([^}]+)\}/g, '$1');

  res = res.replace(/(\d|[πei])\s+([πei])\b/g, '$1$2');
  res = res.replace(/(\d|[πei])\s+([πei])\b/g, '$1$2');

  res = res.replace(/∂\s+([a-zA-Z0-9])/g, '∂$1');
  res = res.replace(/d\s*\/\s*d([a-zA-Z])/g, 'd/d$1');
  res = res.replace(/([0-9a-zA-Z\)\}\]²³⁴⁵⁶⁷⁸⁹])\s*(d[xyztrθτω])/g, '$1 $2');

  res = res.replace(/\|\s*\{?([a-zA-Z0-9_=+-]+)\}?/g, '|$1');
  res = res.replace(/[ \t]{2,}/g, ' ').trim();

  return res;
}

export function cleanText(line) {
  let s = String(line || '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/`/g, '')
    .trim();

  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (m, p1) => latexToUnicode(p1));
  s = s.replace(/\$([^\$\n]+?)\$/g, (m, p1) => latexToUnicode(p1));

  if (s.indexOf('\\') !== -1 || s.indexOf('^') !== -1 || s.indexOf('_') !== -1 || s.indexOf('{') !== -1) {
    s = latexToUnicode(s);
  }

  s = s.replace(/_\{([^}]+)\}/g, (m, p1) => mapToScript(p1, false));
  s = s.replace(/\^\{([^}]+)\}/g, (m, p1) => mapToScript(p1, true));
  s = s.replace(/\{([^}]+)\}/g, '$1');

  return s.replace(/\$/g, '').trim();
}

export function isFormulaLine(line) {
  const t = String(line || '').trim();
  if (!t) return false;
  if (t.startsWith('$$') || t.startsWith('\\[') || (t.startsWith('$') && t.endsWith('$') && t.length > 2)) return true;
  if (/\\[a-zA-Z]+/.test(t)) return true;
  if (/[=_^]/.test(t) && !/[，。！？：；]/.test(t)) return true;
  if (/∑|∫|∬|∭|∮|∏|lim|√|±|×|÷|∂|∇|∝|≡|≈|≠|≤|≥/.test(t)) return true;
  return false;
}

// 全局 LaTeX 与 Markdown 分块解析器 (自动识别公式并构建 Canvas AST)
export function buildBlocks(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return [];

  const lines = text.split(/\r?\n/);
  const blocks = [];
  let blockId = 0;
  let inBlockMath = false;
  let blockMathBuffer = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!inBlockMath) {
      if ((line.startsWith('$$') && line.endsWith('$$') && line.length > 2) ||
          (line.startsWith('\\[') && line.endsWith('\\]') && line.length > 2)) {
        const latex = line.slice(2, -2).trim();
        if (latex) {
          const ast = parseLatex(latex);
          const layout = measureMathAst(ast, 22);
          blocks.push({
            id: blockId++,
            type: 'formula',
            latex: latex,
            unicode: latexToUnicode(latex),
            canvasId: 'cv_' + blockId,
            canvasWidth: Math.min(460, Math.max(80, Math.ceil(layout.w) + 24)),
            canvasHeight: Math.max(38, Math.ceil(layout.h) + 16),
            astLayout: layout
          });
        }
      } else if (line.startsWith('$$')) {
        inBlockMath = true;
        blockMathBuffer = line.slice(2);
      } else if (isFormulaLine(line)) {
        const latex = line.replace(/^\$+|\$+$/g, '').trim();
        const ast = parseLatex(latex);
        const layout = measureMathAst(ast, 22);
        blocks.push({
          id: blockId++,
          type: 'formula',
          latex: latex,
          unicode: latexToUnicode(latex),
          canvasId: 'cv_' + blockId,
          canvasWidth: Math.min(460, Math.max(80, Math.ceil(layout.w) + 24)),
          canvasHeight: Math.max(38, Math.ceil(layout.h) + 16),
          astLayout: layout
        });
      } else if (line) {
        const cleaned = cleanText(line);
        if (cleaned) {
          blocks.push({ id: blockId++, type: 'text', text: cleaned });
        }
      } else {
        blocks.push({ id: blockId++, type: 'gap' });
      }
    } else {
      if (line.endsWith('$$')) {
        inBlockMath = false;
        blockMathBuffer += '\n' + line.slice(0, -2);
        const latex = blockMathBuffer.trim();
        if (latex) {
          const ast = parseLatex(latex);
          const layout = measureMathAst(ast, 22);
          blocks.push({
            id: blockId++,
            type: 'formula',
            latex: latex,
            unicode: latexToUnicode(latex),
            canvasId: 'cv_' + blockId,
            canvasWidth: Math.min(460, Math.max(80, Math.ceil(layout.w) + 24)),
            canvasHeight: Math.max(38, Math.ceil(layout.h) + 16),
            astLayout: layout
          });
        }
        blockMathBuffer = '';
      } else {
        blockMathBuffer += '\n' + line;
      }
    }
  }

  return blocks;
}

export function buildStreamingBlocks(text) {
  const count = (text.match(/\$\$/g) || []).length;
  if (count % 2 === 0) {
    return buildBlocks(text);
  }
  const lastIndex = text.lastIndexOf('$$');
  const head = text.slice(0, lastIndex);
  const tail = text.slice(lastIndex + 2);
  const blocks = buildBlocks(head);
  blocks.push({ id: blocks.length, type: 'formula-pending', text: cleanText(tail) });
  return blocks;
}
