// ===================================================
// 学科工具模块：向量几何与统计分析 (Geometry & Statistics)
// ===================================================

export function mathVectorCalc(operation, v1, v2) {
  const a = Array.isArray(v1) ? v1.map(Number) : [];
  const b = Array.isArray(v2) ? v2.map(Number) : [];

  if (operation === 'norm') {
    const sumSq = a.reduce((acc, val) => acc + val * val, 0);
    return { status: 'success', norm: Number(Math.sqrt(sumSq).toFixed(8)) };
  }

  if (operation === 'dot') {
    if (a.length !== b.length) throw new Error('点乘向量维度必须相同');
    const dot = a.reduce((acc, val, i) => acc + val * b[i], 0);
    return { status: 'success', dot_product: Number(dot.toFixed(8)) };
  }

  if (operation === 'cross') {
    if (a.length !== 3 || b.length !== 3) throw new Error('叉乘仅支持三维空间向量');
    const c = [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
    return { status: 'success', cross_product: c };
  }

  if (operation === 'angle') {
    const dot = a.reduce((acc, val, i) => acc + val * b[i], 0);
    const nA = Math.sqrt(a.reduce((acc, val) => acc + val * val, 0));
    const nB = Math.sqrt(b.reduce((acc, val) => acc + val * val, 0));
    if (nA < 1e-15 || nB < 1e-15) throw new Error('零向量无定义夹角');
    const cosTheta = Math.max(-1, Math.min(1, dot / (nA * nB)));
    const rad = Math.acos(cosTheta);
    return {
      status: 'success',
      angle_rad: Number(rad.toFixed(6)),
      angle_deg: Number(((rad * 180) / Math.PI).toFixed(4)),
      cos_theta: Number(cosTheta.toFixed(6))
    };
  }

  throw new Error('未支持的向量操作: ' + operation);
}

export function mathStatistics(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    throw new Error('统计数据必须为非空数值数组');
  }
  const arr = numbers.map(Number).filter((n) => !isNaN(n));
  const n = arr.length;
  const sum = arr.reduce((acc, val) => acc + val, 0);
  const mean = sum / n;
  const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
  const sampleVariance = n > 1 ? arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1) : 0;
  const stdDev = Math.sqrt(variance);

  const sorted = arr.slice().sort((a, b) => a - b);
  const median = n % 2 === 1 ? sorted[Math.floor(n / 2)] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;

  return {
    status: 'success',
    count: n,
    sum: Number(sum.toFixed(6)),
    mean: Number(mean.toFixed(6)),
    median: Number(median.toFixed(6)),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    variance: Number(variance.toFixed(6)),
    sample_variance: Number(sampleVariance.toFixed(6)),
    std_dev: Number(stdDev.toFixed(6))
  };
}

export const GEOMETRY_STATISTICS_TOOL_SCHEMAS = [
  {
    type: 'function',
    function: {
      name: 'vector_calculate',
      description: '平面与空间向量运算：模长 (norm)、点乘 (dot)、叉乘 (cross)、夹角 (angle)',
      parameters: {
        type: 'object',
        properties: {
          operation: { type: 'string', enum: ['norm', 'dot', 'cross', 'angle'] },
          v1: { type: 'array', items: { type: 'number' } },
          v2: { type: 'array', items: { type: 'number' } }
        },
        required: ['operation', 'v1']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'statistics_calculate',
      description: '统计指标计算：平均数、方差、标准差、中位数、总和、极值',
      parameters: {
        type: 'object',
        properties: {
          numbers: { type: 'array', items: { type: 'number' }, description: '数值列表' }
        },
        required: ['numbers']
      }
    }
  }
];
