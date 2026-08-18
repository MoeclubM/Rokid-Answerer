// ===================================================
// 专业学科知识库：信号与系统 (Signals & Systems)
// 包含：连续/离散卷积、傅里叶级数与变换、拉氏变换、Z变换、抽样定理、状态变量、因果性与稳定性
// ===================================================

export const SIGNALS_SYSTEMS_KNOWLEDGE = [
  {
    id: 'sig_conv_continuous',
    domain: 'signals-systems',
    title: '连续时间系统的卷积积分 (Convolution Integral)',
    keywords: ['卷积积分', '时域卷积', '零状态响应', '冲激响应', 'LTI系统', '积分性质', '时移性'],
    summary: 'y(t) = x(t) * h(t) = ∫_{-∞}^{+∞} x(τ) h(t - τ) dτ',
    formulas: [
      'y(t) = x(t) * h(t) = \\int_{-\\infty}^{+\\infty} x(\\tau) h(t - \\tau) d\\tau',
      'x(t) * \\delta(t - t_0) = x(t - t_0)',
      'x(t) * u(t) = \\int_{-\\infty}^t x(\\tau) d\\tau',
      'e^{-a t} u(t) * e^{-b t} u(t) = \\frac{e^{-a t} - e^{-b t}}{b - a} u(t) \\quad (a \\neq b)',
      't e^{-a t} u(t) \\quad (当 a = b 时)'
    ],
    method: [
      '1. 确定信号时域非零区间：例如 $x(\\tau)$ 在 $[a, b]$，$h(t-\\tau)$ 在 $[t-d, t-c]$；',
      '2. 沿 $t$ 轴分区间讨论重叠区域：无重叠、部分重叠、完全重叠、脱离重叠；',
      '3. 分段积分计算，并在每段结果后乘以对应的时间窗门函数或步阶函数 $u(t)$；',
      '4. 特殊信号可利用卷积微分性质：$(f_1 * f_2)\' = f_1\' * f_2 = f_1 * f_2\'$。'
    ]
  },
  {
    id: 'sig_conv_discrete',
    domain: 'signals-systems',
    title: '离散时间系统的卷积和 (Convolution Sum)',
    keywords: ['卷积和', '离散卷积', '差分方程', '序列卷积', '单位脉冲响应', '有限长序列'],
    summary: 'y[n] = x[n] * h[n] = ∑_{k=-∞}^{+∞} x[k] h[n - k]',
    formulas: [
      'y[n] = x[n] * h[n] = \\sum_{k=-\\infty}^{+\\infty} x[k] h[n - k]',
      'x[n] * \\delta[n - n_0] = x[n - n_0]',
      'L_y = L_x + L_h - 1 \\quad (有限长因果序列卷积后长度)'
    ],
    method: [
      '1. 解析法：代入定义式，对求和变量 $k$ 分区间求和；',
      '2. 图解法/列表对位相乘法：将 $h[n]$ 翻转平移为 $h[n-k]$，与 $x[k]$ 对应项相乘累加；',
      '3. 多项式乘积法：利用 Z 变换性质 $Y(z) = X(z) H(z)$，将序列看作多项式系数做代数乘法。'
    ]
  },
  {
    id: 'sig_fourier_series',
    domain: 'signals-systems',
    title: '周期信号的连续傅里叶级数 (Fourier Series)',
    keywords: ['傅里叶级数', 'FS', '谐波', '基频', '狄里赫利条件', '帕斯瓦尔定理', '三角形式', '指数形式'],
    summary: 'x(t) = ∑_{k=-∞}^{+∞} a_k e^{j k ω_0 t}, a_k = (1/T) ∫_T x(t) e^{-j k ω_0 t} dt',
    formulas: [
      'a_k = \\frac{1}{T} \\int_{T} x(t) e^{-j k \\omega_0 t} dt, \\quad \\omega_0 = \\frac{2\\pi}{T}',
      'x(t) = a_0 + 2 \\sum_{k=1}^\\infty |a_k| \\cos(k \\omega_0 t + \\angle a_k)',
      'P = \\frac{1}{T} \\int_T |x(t)|^2 dt = \\sum_{k=-\\infty}^{+\\infty} |a_k|^2 \\quad (帕斯瓦尔功率守恒定理)'
    ],
    method: [
      '1. 观察对称性：偶函数 $a_k$ 为纯实数；奇函数 $a_k$ 为纯虚数；半波对称只含奇次谐波；',
      '2. 对方波、三角波、周期冲激串等典型波形，可先求导化为冲激串再求系数；',
      '3. 计算平均功率：直接应用帕斯瓦尔定理计算各次谐波幅值平方和。'
    ]
  },
  {
    id: 'sig_fourier_transform',
    domain: 'signals-systems',
    title: '连续傅里叶变换与频域分析 (Fourier Transform)',
    keywords: ['傅里叶变换', 'FT', '频域', '频谱', '对偶性', '频移性质', '频域卷积', '调制定理', '能量谱'],
    summary: 'X(jω) = ∫_{-∞}^{+∞} x(t) e^{-jωt} dt, x(t) = (1/2π) ∫_{-∞}^{+∞} X(jω) e^{jωt} dω',
    formulas: [
      '\\mathcal{F}[e^{-a t} u(t)] = \\frac{1}{a + j\\omega} \\quad (a > 0)',
      '\\mathcal{F}[u(t)] = \\frac{1}{j\\omega} + \\pi \\delta(\\omega)',
      '\\mathcal{F}[\\text{rect}(t/\\tau)] = \\tau \\text{Sa}\\left(\\frac{\\omega \\tau}{2}\\right)',
      'x(t - t_0) \\Longleftrightarrow e^{-j \\omega t_0} X(j\\omega) \\quad (时移)',
      'e^{j \\omega_0 t} x(t) \\Longleftrightarrow X(j(\\omega - \\omega_0)) \\quad (频移/调制)',
      'x_1(t) * x_2(t) \\Longleftrightarrow X_1(j\\omega) X_2(j\\omega) \\quad (时域卷积定理)',
      'x_1(t) x_2(t) \\Longleftrightarrow \\frac{1}{2\\pi} [X_1(j\\omega) * X_2(j\\omega)] \\quad (频域卷积定理)'
    ],
    method: [
      '1. 典型信号直接查表：指数衰减、门函数、冲激函数、符号函数；',
      '2. 复杂信号分解为门函数与调制正弦波的乘积，应用调制定理；',
      '3. 求系统频域响应：$Y(j\\omega) = X(j\\omega) H(j\\omega)$，再求傅里叶逆变换得时域输出。'
    ]
  },
  {
    id: 'sig_sampling_theorem',
    domain: 'signals-systems',
    title: '时域与频域抽样定理 (Sampling Theorem)',
    keywords: ['抽样定理', '奈奎斯特频率', '采样率', '频谱混叠', '重建滤波器', '低通抽样', '带通抽样'],
    summary: '无混叠恢复连续信号的最低采样频率 fs >= 2 fm (奈奎斯特率)，抽样间隔 Ts <= 1 / (2 fm)',
    formulas: [
      '\\omega_s \\geq 2 \\omega_m, \\quad f_s \\geq 2 f_m \\quad (奈奎斯特抽样率)',
      'T_s \\leq \\frac{1}{2 f_m} = \\frac{\\pi}{\\omega_m} \\quad (最大允许抽样周期)',
      'X_s(j\\omega) = \\frac{1}{T_s} \\sum_{k=-\\infty}^{+\\infty} X(j(\\omega - k \\omega_s)) \\quad (抽样后频谱周期延拓)',
      'x(t) = \\sum_{n=-\\infty}^{+\\infty} x(n T_s) \\text{Sa}\\left(\\frac{\\pi}{T_s}(t - n T_s)\\right) \\quad (理想低通插值重建公式)'
    ],
    method: [
      '1. 找输入信号的最高截止角频率 $\\omega_m$（对乘积信号 $x_1(t)x_2(t)$，最高频率为 $\\omega_{m1} + \\omega_{m2}$；对卷积信号为 $\\min(\\omega_{m1}, \\omega_{m2})$）；',
      '2. 计算奈奎斯特抽样率：$f_N = 2 f_m$；',
      '3. 判断是否发生频谱混叠：若采样频率 $f_s < 2 f_m$，则周期延拓频谱重叠发生混叠，无法通过理想低通无失真重建。'
    ]
  },
  {
    id: 'sig_laplace_transform',
    domain: 'signals-systems',
    title: '拉普拉斯变换与 s 域系统分析 (Laplace Transform)',
    keywords: ['拉氏变换', '拉普拉斯', 's域', 'ROC', '收敛域', '转移函数', '初值定理', '终值定理'],
    summary: '单边拉氏变换 X(s) = ∫_{0^-}^{+∞} x(t) e^{-st} dt，系统函数 H(s) = Y(s) / X(s)',
    formulas: [
      '\\mathcal{L}[u(t)] = \\frac{1}{s}, \\quad \\mathcal{L}[e^{-a t} u(t)] = \\frac{1}{s + a}',
      '\\mathcal{L}[t^n u(t)] = \\frac{n!}{s^{n+1}}, \\quad \\mathcal{L}[\\sin(\\omega_0 t) u(t)] = \\frac{\\omega_0}{s^2 + \\omega_0^2}',
      '\\mathcal{L}[\\cos(\\omega_0 t) u(t)] = \\frac{s}{s^2 + \\omega_0^2}',
      '\\mathcal{L}[f\'(t)] = s F(s) - f(0^-) \\quad (时域微分)',
      '\\mathcal{L}[f\'\'(t)] = s^2 F(s) - s f(0^-) - f\'(0^-)',
      '\\lim_{t \\to 0^+} f(t) = \\lim_{s \\to \\infty} s F(s) \\quad (初值定理)',
      '\\lim_{t \\to \\infty} f(t) = \\lim_{s \\to 0} s F(s) \\quad (终值定理，所有极点必须在左半平面或原点单极点)'
    ],
    method: [
      '1. 微分方程求解：两边取单边拉氏变换，代入 $f(0^-), f\'(0^-)$ 解出 $Y(s) = Y_{zi}(s) + Y_{zs}(s)$；',
      '2. 部分分式分解：将 $Y(s) = \\frac{B(s)}{A(s)}$ 分解为简单极点项的和 $\\sum \\frac{K_i}{s - p_i}$；',
      '3. 逆变换：查表还原为时域信号；',
      '4. 因果系统稳定性判据：因果系统稳定充要条件是 $H(s)$ 的全部极点严格位于 $s$ 平面的左半开平面（$\\text{Re}(p_i) < 0$）。'
    ]
  },
  {
    id: 'sig_z_transform',
    domain: 'signals-systems',
    title: 'Z 变换与离散系统分析 (Z-Transform)',
    keywords: ['Z变换', 'z域', '逆Z变换', '差分方程', 'H(z)', '单位圆', '部分分式法'],
    summary: 'X(z) = ∑_{n=-∞}^{+∞} x[n] z^{-n}，ROC 决定了因果性与稳定性',
    formulas: [
      '\\mathcal{Z}[u[n]] = \\frac{1}{1 - z^{-1}} = \\frac{z}{z - 1} \\quad (|z| > 1)',
      '\\mathcal{Z}[a^n u[n]] = \\frac{1}{1 - a z^{-1}} = \\frac{z}{z - a} \\quad (|z| > |a|)',
      '\\mathcal{Z}[n a^n u[n]] = \\frac{a z^{-1}}{(1 - a z^{-1})^2} = \\frac{a z}{(z - a)^2}',
      '\\mathcal{Z}[x[n - m] u[n - m]] = z^{-m} X(z) \\quad (时移性质)'
    ],
    method: [
      '1. 解差分方程：两端取单边 Z 变换，求出 $Y(z) = X(z) H(z) + Y_{zi}(z)$；',
      '2. 逆 Z 变换通常先分解 $\\frac{X(z)}{z} = \\sum \\frac{A_k}{z - p_k}$，再两边乘以 $z$ 还原；',
      '3. 稳定性分析：因果 LTI 系统稳定等价于 $H(z)$ 的所有极点都在单位圆内部（$|p_k| < 1$）。'
    ]
  },
  {
    id: 'sig_stability_causality',
    domain: 'signals-systems',
    title: 'LTI 系统因果性、BIBO 稳定性与零极点分析 (Causality & Stability)',
    keywords: ['因果性', '稳定性', 'BIBO稳定', '零极点分布', '收敛域', '左半平面', '单位圆内', '虚轴', '充要条件'],
    summary: '连续系统稳定：H(s)极点全部在左半开平面(Re(p)<0)；离散系统稳定：H(z)极点全部在单位圆内部(|p|<1)',
    formulas: [
      '\\int_{-\\infty}^{+\\infty} |h(t)| dt < \\infty \\quad (连续 LTI 系统 BIBO 稳定性充要条件)',
      '\\sum_{n=-\\infty}^{+\\infty} |h[n]| < \\infty \\quad (离散 LTI 系统 BIBO 稳定性充要条件)',
      '\\text{Re}(p_k) < 0 \\quad (连续因果系统稳定的极点分布)',
      '|p_k| < 1 \\quad (离散因果系统稳定的极点分布)'
    ],
    method: [
      '1. 因果性判据：时域 $h(t)=0 (t<0)$ 或 $h[n]=0 (n<0)$；$s$ 域收敛域为最右极点右侧的右半平面；$z$ 域收敛域为最外极点外侧（$|z| > r_{max}$）；',
      '2. 稳定性判据：连续系统收敛域必须包含 $j\\omega$ 虚轴；离散系统收敛域必须包含单位圆 $|z|=1$；',
      '3. 因果且稳定的充要条件：连续系统所有极点必须严格位于左半开平面；离散系统所有极点必须严格位于单位圆内部。'
    ]
  },
  {
    id: 'sig_state_space',
    domain: 'signals-systems',
    title: '连续与离散系统的状态变量分析法 (State-Space Analysis)',
    keywords: ['状态变量', '状态方程', '输出方程', '状态转移矩阵', 'A矩阵', 'B矩阵', 'C矩阵', 'D矩阵', '传递函数矩阵'],
    summary: '连续系统：ẋ(t) = A x(t) + B u(t), y(t) = C x(t) + D u(t)，转移矩阵 Φ(t) = e^{At} = L^{-1}[(sI - A)^{-1}]',
    formulas: [
      '\\dot{\\mathbf{x}}(t) = \\mathbf{A} \\mathbf{x}(t) + \\mathbf{B} u(t), \\quad y(t) = \\mathbf{C} \\mathbf{x}(t) + D u(t)',
      '\\mathbf{\\Phi}(t) = e^{\\mathbf{A} t} = \\mathcal{L}^{-1}\\left[(s \\mathbf{I} - \\mathbf{A})^{-1}\\right]',
      'H(s) = \\mathbf{C} (s \\mathbf{I} - \\mathbf{A})^{-1} \\mathbf{B} + D',
      '\\mathbf{x}(t) = \\mathbf{\\Phi}(t) \\mathbf{x}(0) + \\int_0^t \\mathbf{\\Phi}(t - \\tau) \\mathbf{B} u(\\tau) d\\tau'
    ],
    method: [
      '1. 选状态变量：电路中通常选电容电压 $u_C$ 和电感电流 $i_L$；',
      '2. 列状态方程：利用 KCL, KVL 表达 $\\dot{x}_1, \\dot{x}_2$，整理为矩阵标准形式；',
      '3. 求转移矩阵：计算 $(sI - A)^{-1}$ 后逐项求逆拉氏变换；',
      '4. 求传递函数：套公式 $H(s) = C(sI - A)^{-1}B + D$。'
    ]
  }
];
