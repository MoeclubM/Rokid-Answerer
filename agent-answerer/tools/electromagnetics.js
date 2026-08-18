// ===================================================
// 学科工具模块：电磁场与电磁波计算 (Electromagnetics)
// ===================================================

const CONST_C = 299792458;
const CONST_EPS0 = 8.8541878128e-12;
const CONST_MU0 = 1.25663706212e-6;

export function mathTransmissionLine(zL, z0) {
  const rL = Number(zL[0]) || 0;
  const xL = Number(zL[1]) || 0;
  const r0 = Number(z0[0]) || 0;
  const x0 = Number(z0[1]) || 0;

  const numR = rL - r0;
  const numI = xL - x0;
  const denR = rL + r0;
  const denI = xL + x0;

  const denom = denR * denR + denI * denI;
  if (denom < 1e-15) throw new Error('阻抗之和不能为 0');

  const gammaR = (numR * denR + numI * denI) / denom;
  const gammaI = (numI * denR - numR * denI) / denom;

  const gammaMag = Math.sqrt(gammaR * gammaR + gammaI * gammaI);
  const gammaPhaseDeg = (Math.atan2(gammaI, gammaR) * 180) / Math.PI;

  const tauR = 1 + gammaR;
  const tauI = gammaI;
  const tauMag = Math.sqrt(tauR * tauR + tauI * tauI);

  let vswr = 1.0;
  if (gammaMag < 1.0) {
    vswr = (1 + gammaMag) / (1 - gammaMag);
  } else {
    vswr = Infinity;
  }

  const returnLossDb = gammaMag > 0 ? -20 * Math.log10(gammaMag) : Infinity;

  return {
    status: 'success',
    gamma: {
      real: Number(gammaR.toFixed(6)),
      imag: Number(gammaI.toFixed(6)),
      magnitude: Number(gammaMag.toFixed(6)),
      phase_deg: Number(gammaPhaseDeg.toFixed(2))
    },
    tau: {
      real: Number(tauR.toFixed(6)),
      imag: Number(tauI.toFixed(6)),
      magnitude: Number(tauMag.toFixed(6))
    },
    vswr: vswr === Infinity ? 'Infinity' : Number(vswr.toFixed(4)),
    return_loss_dB: returnLossDb === Infinity ? 'Infinity' : Number(returnLossDb.toFixed(4))
  };
}

export function mathEmWaveParams(frequency, epsR = 1, muR = 1, sigma = 0) {
  const f = Number(frequency);
  const er = Number(epsR) || 1;
  const ur = Number(muR) || 1;
  const sig = Number(sigma) || 0;

  if (f <= 0) throw new Error('频率必须大于 0');

  const omega = 2 * Math.PI * f;
  const eps = er * CONST_EPS0;
  const mu = ur * CONST_MU0;

  const lossTangent = sig / (omega * eps);
  const v = 1 / Math.sqrt(mu * eps);
  const eta0 = Math.sqrt(mu / eps);

  let alpha = 0;
  let beta = omega * Math.sqrt(mu * eps);
  let skinDepth = Infinity;

  if (sig > 0) {
    const term = Math.sqrt(1 + lossTangent * lossTangent);
    alpha = omega * Math.sqrt((mu * eps / 2) * (term - 1));
    beta = omega * Math.sqrt((mu * eps / 2) * (term + 1));
    skinDepth = 1 / alpha;
  }

  const lambda = (2 * Math.PI) / beta;

  return {
    status: 'success',
    frequency: f,
    omega: Number(omega.toFixed(4)),
    loss_tangent: Number(lossTangent.toExponential(4)),
    phase_velocity: Number(v.toFixed(2)),
    wave_impedance: Number(eta0.toFixed(4)),
    attenuation_constant_alpha: Number(alpha.toFixed(6)),
    phase_constant_beta: Number(beta.toFixed(6)),
    wavelength: Number(lambda.toFixed(6)),
    skin_depth: skinDepth === Infinity ? 'Infinity (无耗)' : Number(skinDepth.toExponential(4))
  };
}

export const ELECTROMAGNETICS_TOOL_SCHEMAS = [
  {
    type: 'function',
    function: {
      name: 'transmission_line_calc',
      description: '电磁场与波：传输线/平面波反射系数 Gamma、透射系数 Tau、驻波比 VSWR 与回波损耗 dB',
      parameters: {
        type: 'object',
        properties: {
          zL: { type: 'array', items: { type: 'number' }, description: '负载阻抗 [实部, 虚部]' },
          z0: { type: 'array', items: { type: 'number' }, description: '特性阻抗 [实部, 虚部]' }
        },
        required: ['zL', 'z0']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'em_wave_calc',
      description: '电磁场与波：介质波阻抗 eta、相位常数 beta、波长 lambda、趋肤深度 delta 与损耗角正切',
      parameters: {
        type: 'object',
        properties: {
          frequency: { type: 'number', description: '频率 f (Hz)' },
          eps_r: { type: 'number', description: '相对介电常数，默认 1' },
          mu_r: { type: 'number', description: '相对磁导率，默认 1' },
          sigma: { type: 'number', description: '电导率 (S/m)，默认 0' }
        },
        required: ['frequency']
      }
    }
  }
];
