// ===================================================
// 学科工具模块：微积分与代数求解 (Calculus & Algebra)
// ===================================================

function evalFn(expr, varName, xVal) {
  let s = String(expr).replace(/\s+/g, '').replace(/\^/g, '**');
  const allowedMath = ['sin', 'cos', 'tan', 'exp', 'log', 'sqrt', 'abs', 'PI', 'E'];
  for (let k = 0; k < allowedMath.length; k++) {
    const fn = allowedMath[k];
    s = s.replace(new RegExp('\\b' + fn + '\\b', 'g'), 'Math.' + fn);
  }
  const v = varName || 'x';
  const f = new Function(v, 'return (' + s + ');');
  return f(xVal);
}

export function mathDerivative(functionExpr, variable, point) {
  const v = variable || 'x';
  const x = Number(point);
  if (isNaN(x)) throw new Error('求导点必须为有效数值');
  const h = 1e-6;
  const fPlus = evalFn(functionExpr, v, x + h);
  const fMinus = evalFn(functionExpr, v, x - h);
  const deriv = (fPlus - fMinus) / (2 * h);
  return Number(deriv.toFixed(8).replace(/\.?0+$/, ''));
}

export function mathIntegrate(functionExpr, variable, lowerBound, upperBound, intervals = 1000) {
  const v = variable || 'x';
  const a = Number(lowerBound);
  const b = Number(upperBound);
  const n = Math.max(10, Math.min(10000, Number(intervals) || 1000));
  if (isNaN(a) || isNaN(b)) throw new Error('积分上下限必须为有效数值');

  const h = (b - a) / n;
  let sum = evalFn(functionExpr, v, a) + evalFn(functionExpr, v, b);
  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    sum += (i % 2 === 1 ? 4 : 2) * evalFn(functionExpr, v, x);
  }
  const result = (sum * h) / 3;
  return Number(result.toFixed(8).replace(/\.?0+$/, ''));
}

export function mathSolveQuadratic(a, b, c) {
  const A = Number(a);
  const B = Number(b);
  const C = Number(c);
  if (A === 0) throw new Error('二次项系数 a 不能为 0');
  const delta = B * B - 4 * A * C;
  if (Math.abs(delta) < 1e-12) {
    const x = -B / (2 * A);
    return [{ type: 'real', value: Number(x.toFixed(8)) }];
  } else if (delta > 0) {
    const sqrtD = Math.sqrt(delta);
    return [
      { type: 'real', value: Number(((-B + sqrtD) / (2 * A)).toFixed(8)) },
      { type: 'real', value: Number(((-B - sqrtD) / (2 * A)).toFixed(8)) }
    ];
  } else {
    const real = -B / (2 * A);
    const imag = Math.sqrt(-delta) / (2 * A);
    return [
      { type: 'complex', real: Number(real.toFixed(8)), imag: Number(imag.toFixed(8)) },
      { type: 'complex', real: Number(real.toFixed(8)), imag: Number((-imag).toFixed(8)) }
    ];
  }
}

export function mathSolveLinear2x2(a1, b1, c1, a2, b2, c2) {
  const D = a1 * b2 - a2 * b1;
  if (Math.abs(D) < 1e-12) {
    throw new Error('方程组系数矩阵奇异 (行列式为0)，无唯一解');
  }
  const Dx = c1 * b2 - c2 * b1;
  const Dy = a1 * c2 - a2 * c1;
  return {
    status: 'success',
    x: Number((Dx / D).toFixed(8)),
    y: Number((Dy / D).toFixed(8))
  };
}

export function mathFindRoot(functionExpr, variable, initialGuess = 1.0) {
  const v = variable || 'x';
  let x = Number(initialGuess) || 1.0;
  const h = 1e-5;
  for (let iter = 0; iter < 100; iter++) {
    const fx = evalFn(functionExpr, v, x);
    if (Math.abs(fx) < 1e-10) break;
    const dfx = (evalFn(functionExpr, v, x + h) - evalFn(functionExpr, v, x - h)) / (2 * h);
    if (Math.abs(dfx) < 1e-12) break;
    x = x - fx / dfx;
  }
  return { status: 'success', root: Number(x.toFixed(8)) };
}

export const CALCULUS_ALGEBRA_TOOL_SCHEMAS = [
  {
    type: 'function',
    function: {
      name: 'differentiate',
      description: '数值微分：计算函数在指定点的导数值 f\'(x0)',
      parameters: {
        type: 'object',
        properties: {
          function_expr: { type: 'string', description: '函数表达式，如 "x*x*x - 3*x + 2"' },
          variable: { type: 'string', description: '自变量名称，默认 x' },
          point: { type: 'number', description: '求导点坐标 x0' }
        },
        required: ['function_expr', 'point']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'integrate',
      description: '数值定积分：计算 ∫_a^b f(x) dx 的精确数值',
      parameters: {
        type: 'object',
        properties: {
          function_expr: { type: 'string', description: '被积函数表达式，如 "x*x + sin(x)"' },
          variable: { type: 'string', description: '积分变量，默认 x' },
          lower_bound: { type: 'number', description: '积分下限 a' },
          upper_bound: { type: 'number', description: '积分上限 b' }
        },
        required: ['function_expr', 'lower_bound', 'upper_bound']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'solve_quadratic',
      description: '求解一元二次方程 ax^2 + bx + c = 0 的精确实根或共轭复根',
      parameters: {
        type: 'object',
        properties: {
          a: { type: 'number' }, b: { type: 'number' }, c: { type: 'number' }
        },
        required: ['a', 'b', 'c']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'solve_linear_system_2x2',
      description: '求解二元一次方程组 { a1*x + b1*y = c1; a2*x + b2*y = c2 }',
      parameters: {
        type: 'object',
        properties: {
          a1: { type: 'number' }, b1: { type: 'number' }, c1: { type: 'number' },
          a2: { type: 'number' }, b2: { type: 'number' }, c2: { type: 'number' }
        },
        required: ['a1', 'b1', 'c1', 'a2', 'b2', 'c2']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'find_equation_root',
      description: '牛顿迭代求解非线性单变量方程 f(x) = 0 的数值根',
      parameters: {
        type: 'object',
        properties: {
          function_expr: { type: 'string', description: '方程表达式 f(x)，如 "exp(x) - 3*x"' },
          variable: { type: 'string', description: '自变量，默认 x' },
          initial_guess: { type: 'number', description: '初始猜测初值，如 1' }
        },
        required: ['function_expr']
      }
    }
  }
];
