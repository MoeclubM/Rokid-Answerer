// ===================================================
// 学科工具模块：复变函数与复数计算 (Complex Analysis)
// ===================================================

export function mathComplexCalc(operation, z1, z2) {
  const r1 = Number(z1[0]) || 0;
  const i1 = Number(z1[1]) || 0;
  const r2 = z2 ? (Number(z2[0]) || 0) : 0;
  const i2 = z2 ? (Number(z2[1]) || 0) : 0;

  let resReal = 0;
  let resImag = 0;

  switch (operation) {
    case 'add':
      resReal = r1 + r2;
      resImag = i1 + i2;
      break;
    case 'sub':
      resReal = r1 - r2;
      resImag = i1 - i2;
      break;
    case 'mul':
      resReal = r1 * r2 - i1 * i2;
      resImag = r1 * i2 + i1 * r2;
      break;
    case 'div':
      const denom = r2 * r2 + i2 * i2;
      if (Math.abs(denom) < 1e-15) throw new Error('复数除法分母不能为 0');
      resReal = (r1 * r2 + i1 * i2) / denom;
      resImag = (i1 * r2 - r1 * i2) / denom;
      break;
    case 'polar':
      const mod = Math.sqrt(r1 * r1 + i1 * i1);
      const arg = Math.atan2(i1, r1);
      return {
        status: 'success',
        modulus: Number(mod.toFixed(8)),
        argument_rad: Number(arg.toFixed(8)),
        argument_deg: Number(((arg * 180) / Math.PI).toFixed(4)),
        euler_form: `${mod.toFixed(4)} * e^(j * ${((arg * 180) / Math.PI).toFixed(2)}°)`
      };
    case 'exp':
      const expR = Math.exp(r1);
      resReal = expR * Math.cos(i1);
      resImag = expR * Math.sin(i1);
      break;
    case 'pow':
      const p = typeof z2 === 'number' ? z2 : r2;
      const m = Math.sqrt(r1 * r1 + i1 * i1);
      const theta = Math.atan2(i1, r1);
      const newM = Math.pow(m, p);
      const newTheta = theta * p;
      resReal = newM * Math.cos(newTheta);
      resImag = newM * Math.sin(newTheta);
      break;
    default:
      throw new Error('未支持的复数操作: ' + operation);
  }

  return {
    status: 'success',
    real: Number(resReal.toFixed(8)),
    imag: Number(resImag.toFixed(8)),
    latex: `${resReal.toFixed(4)} ${resImag >= 0 ? '+' : '-'} ${Math.abs(resImag).toFixed(4)}j`
  };
}

export const COMPLEX_ANALYSIS_TOOL_SCHEMAS = [
  {
    type: 'function',
    function: {
      name: 'complex_calculate',
      description: '复变函数运算：加(add)、减(sub)、乘(mul)、除(div)、极坐标欧拉形式转换(polar)、复数幂(pow)、复指数(exp)',
      parameters: {
        type: 'object',
        properties: {
          operation: { type: 'string', enum: ['add', 'sub', 'mul', 'div', 'polar', 'pow', 'exp'] },
          z1: { type: 'array', items: { type: 'number' }, description: '复数 1 [实部, 虚部]' },
          z2: { type: 'array', items: { type: 'number' }, description: '复数 2 或标量指数' }
        },
        required: ['operation', 'z1']
      }
    }
  }
];
