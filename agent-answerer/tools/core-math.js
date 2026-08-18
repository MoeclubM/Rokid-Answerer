// ===================================================
// 学科工具模块：核心数学与通用代数 (Core Math)
// ===================================================

const CONSTANTS = {
  CONST_E: Math.E,
  CONST_PI: Math.PI,
  CONST_G: 9.80665,
  CONST_C: 299792458,
  CONST_H: 6.62607015e-34,
  CONST_K: 1.380649e-23,
  CONST_NA: 6.02214076e23,
  CONST_R: 8.314462618,
  CONST_EPS0: 8.8541878128e-12,
  CONST_MU0: 1.25663706212e-6
};

function factorial(n) {
  if (n < 0 || Math.floor(n) !== n) throw new Error('阶乘仅支持非负整数');
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function comb(n, k) {
  if (k < 0 || k > n || Math.floor(n) !== n || Math.floor(k) !== k) return 0;
  return factorial(n) / (factorial(k) * factorial(n - k));
}

function perm(n, k) {
  if (k < 0 || k > n || Math.floor(n) !== n || Math.floor(k) !== k) return 0;
  return factorial(n) / factorial(n - k);
}

function gcd(a, b) {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return Math.abs(Math.round(a) * Math.round(b)) / gcd(a, b);
}

export function mathEvaluateExpression(expr) {
  if (!expr || typeof expr !== 'string') {
    throw new Error('表达式必须为非空字符串');
  }

  let sanitized = expr.replace(/\s+/g, '');
  sanitized = sanitized.replace(/(\d+)!/g, 'factorial($1)');
  sanitized = sanitized.replace(/\bC\((\d+),(\d+)\)/g, 'comb($1,$2)');
  sanitized = sanitized.replace(/\bP\((\d+),(\d+)\)/g, 'perm($1,$2)');
  sanitized = sanitized.replace(/\bgcd\(([^,]+),([^)]+)\)/g, 'gcd($1,$2)');
  sanitized = sanitized.replace(/\blcm\(([^,]+),([^)]+)\)/g, 'lcm($1,$2)');
  sanitized = sanitized.replace(/\^/g, '**');

  const allowedMath = [
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
    'sinh', 'cosh', 'tanh',
    'exp', 'log', 'log10', 'log2', 'ln',
    'sqrt', 'cbrt', 'abs', 'round', 'floor', 'ceil',
    'min', 'max', 'PI', 'E', 'pow'
  ];

  for (let k = 0; k < allowedMath.length; k++) {
    const fn = allowedMath[k];
    if (fn === 'ln') {
      sanitized = sanitized.replace(/\bln\(/g, 'Math.log(');
    } else {
      const reg = new RegExp('\\b' + fn + '\\b', 'g');
      sanitized = sanitized.replace(reg, 'Math.' + fn);
    }
  }

  const constKeys = Object.keys(CONSTANTS);
  for (let k = 0; k < constKeys.length; k++) {
    const ck = constKeys[k];
    const reg = new RegExp('\\b' + ck + '\\b', 'g');
    sanitized = sanitized.replace(reg, '(' + CONSTANTS[ck] + ')');
  }

  if (/[^0-9+\-*/().,eE\sMathfactorialcombpermgcdlcm*]/.test(sanitized.replace(/Math\.[a-zA-Z0-9]+/g, ''))) {
    throw new Error('表达式包含未受信任的字符或函数');
  }

  const fn = new Function('factorial', 'comb', 'perm', 'gcd', 'lcm', 'return (' + sanitized + ');');
  const result = fn(factorial, comb, perm, gcd, lcm);

  if (typeof result !== 'number' || isNaN(result)) {
    throw new Error('计算结果非有效实数');
  }

  return Number(result.toFixed(10).replace(/\.?0+$/, ''));
}

export const CORE_MATH_TOOL_SCHEMAS = [
  {
    type: 'function',
    function: {
      name: 'calculate',
      description: '通用代数计算：四则运算、乘方(^)、阶乘(n!)、排列组合C(n,k)/P(n,k)、开方、三角对数及常用物理数学常数(CONST_G, CONST_C, CONST_EPS0等)',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: '待计算的数学表达式' }
        },
        required: ['expression']
      }
    }
  }
];
