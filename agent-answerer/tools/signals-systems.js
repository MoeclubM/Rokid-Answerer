// ===================================================
// 学科工具模块：信号与系统计算 (Signals & Systems)
// ===================================================

export function mathDiscreteConvolution(xArr, hArr) {
  if (!Array.isArray(xArr) || !Array.isArray(hArr) || xArr.length === 0 || hArr.length === 0) {
    throw new Error('卷积序列必须为非空数组');
  }
  const N = xArr.length;
  const M = hArr.length;
  const outLen = N + M - 1;
  const y = new Array(outLen).fill(0);

  for (let n = 0; n < outLen; n++) {
    let sum = 0;
    for (let k = 0; k < N; k++) {
      if (n - k >= 0 && n - k < M) {
        sum += Number(xArr[k]) * Number(hArr[n - k]);
      }
    }
    y[n] = Number(sum.toFixed(8).replace(/\.?0+$/, ''));
  }

  return {
    status: 'success',
    length: outLen,
    result: y
  };
}

export function mathFrequencyResponse(numCoeffs, denCoeffs, omega) {
  const w = Number(omega);
  if (isNaN(w)) throw new Error('角频率 omega 必须为有效数值');

  let numReal = 0, numImag = 0;
  for (let i = 0; i < numCoeffs.length; i++) {
    const power = numCoeffs.length - 1 - i;
    const a = Number(numCoeffs[i]);
    const pMod = power % 4;
    const val = a * Math.pow(w, power);
    if (pMod === 0) numReal += val;
    else if (pMod === 1) numImag += val;
    else if (pMod === 2) numReal -= val;
    else if (pMod === 3) numImag -= val;
  }

  let denReal = 0, denImag = 0;
  for (let i = 0; i < denCoeffs.length; i++) {
    const power = denCoeffs.length - 1 - i;
    const b = Number(denCoeffs[i]);
    const pMod = power % 4;
    const val = b * Math.pow(w, power);
    if (pMod === 0) denReal += val;
    else if (pMod === 1) denImag += val;
    else if (pMod === 2) denReal -= val;
    else if (pMod === 3) denImag -= val;
  }

  const dDenom = denReal * denReal + denImag * denImag;
  if (dDenom < 1e-15) throw new Error('分母在指定频率处为 0');

  const HReal = (numReal * denReal + numImag * denImag) / dDenom;
  const HImag = (numImag * denReal - numReal * denImag) / dDenom;
  const mag = Math.sqrt(HReal * HReal + HImag * HImag);
  const phaseRad = Math.atan2(HImag, HReal);
  const phaseDeg = (phaseRad * 180) / Math.PI;
  const magDb = 20 * Math.log10(Math.max(1e-12, mag));

  return {
    status: 'success',
    omega: w,
    magnitude: Number(mag.toFixed(6)),
    magnitude_dB: Number(magDb.toFixed(4)),
    phase_rad: Number(phaseRad.toFixed(6)),
    phase_deg: Number(phaseDeg.toFixed(4)),
    h_jw: `${HReal.toFixed(4)} ${HImag >= 0 ? '+' : '-'} ${Math.abs(HImag).toFixed(4)}j`
  };
}

export const SIGNALS_SYSTEMS_TOOL_SCHEMAS = [
  {
    type: 'function',
    function: {
      name: 'discrete_convolution',
      description: '信号与系统：离散卷积和 y[n] = x[n] * h[n]',
      parameters: {
        type: 'object',
        properties: {
          x: { type: 'array', items: { type: 'number' }, description: '序列 x[n]' },
          h: { type: 'array', items: { type: 'number' }, description: '序列 h[n]' }
        },
        required: ['x', 'h']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'frequency_response',
      description: '信号与系统：连续系统传递函数 H(s) 在角频率 omega 下的幅频、分贝 dB 与相频响应',
      parameters: {
        type: 'object',
        properties: {
          numerator_coeffs: { type: 'array', items: { type: 'number' }, description: '分子降幂系数' },
          denominator_coeffs: { type: 'array', items: { type: 'number' }, description: '分母降幂系数' },
          omega: { type: 'number', description: '角频率 omega (rad/s)' }
        },
        required: ['numerator_coeffs', 'denominator_coeffs', 'omega']
      }
    }
  }
];
