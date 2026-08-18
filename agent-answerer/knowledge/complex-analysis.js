// ===================================================
// 专业学科知识库：复变函数 (Complex Analysis)
// 包含：解析函数、复积分、洛朗级数、留数定理与实积分、保形映射、儒歇定理
// ===================================================

export const COMPLEX_ANALYSIS_KNOWLEDGE = [
  {
    id: 'cx_elementary_multivalued',
    domain: 'complex-analysis',
    title: '复变初等函数、对数多值性与主值 (Elementary Functions)',
    keywords: ['初等函数', '对数函数', '复指数', '多值函数', '主值', 'Ln', '支点', '复数三角函数'],
    summary: 'e^z = e^x (cos y + i sin y), Ln z = ln|z| + i(Arg z + 2kπ)，主值 ln z = ln|z| + i Arg z (-π < Arg z ≤ π)',
    formulas: [
      'e^z = e^x (\\cos y + i \\sin y)',
      '\\text{Ln } z = \\ln|z| + i(\\text{Arg } z + 2k\\pi) \\quad (k \\in \\mathbb{Z})',
      '\\text{ln } z = \\ln|z| + i \\text{Arg } z \\quad (-\\pi < \\text{Arg } z \\le \\pi)',
      'z^a = e^{a \\text{Ln } z}, \\quad \\sin z = \\frac{e^{iz} - e^{-iz}}{2i}, \\quad \\cos z = \\frac{e^{iz} + e^{-iz}}{2}',
      '|\\sin z|^2 = \\sin^2 x + \\sinh^2 y, \\quad |\\cos z|^2 = \\cos^2 x + \\sinh^2 y'
    ],
    method: [
      '1. 求复数幂与对数：将底数化为极坐标形式 $z = r e^{i\\theta}$，代入对数公式；',
      '2. 三角方程求解：若解 $\\sin z = 2$，换元令 $w = e^{iz}$，解二次方程 $\\frac{w - 1/w}{2i} = 2 \\implies w^2 - 4iw - 1 = 0$；',
      '3. 注意：复变三角函数 $\\sin z, \\cos z$ 无界，可大于 1。'
    ]
  },
  {
    id: 'cx_cauchy_riemann',
    domain: 'complex-analysis',
    title: '柯西-黎曼方程与解析函数 (Cauchy-Riemann Equations)',
    keywords: ['柯西黎曼', 'CR方程', 'C-R', '解析函数', '调和函数', '共轭调和函数', 'u(x,y)', 'v(x,y)'],
    summary: 'f(z) = u(x,y) + i v(x,y) 在区域内解析的充要条件：u, v 可微且满足 ∂u/∂x = ∂v/∂y, ∂u/∂y = -∂v/∂x',
    formulas: [
      '\\frac{\\partial u}{\\partial x} = \\frac{\\partial v}{\\partial y}, \\quad \\frac{\\partial u}{\\partial y} = -\\frac{\\partial v}{\\partial x}',
      'f\'(z) = \\frac{\\partial u}{\\partial x} + i \\frac{\\partial v}{\\partial x} = \\frac{\\partial v}{\\partial y} - i \\frac{\\partial u}{\\partial y}',
      '\\nabla^2 u = \\frac{\\partial^2 u}{\\partial x^2} + \\frac{\\partial^2 u}{\\partial y^2} = 0 \\quad (调和方程)'
    ],
    method: [
      '1. 验证解析性：分别计算四个偏导数，检查 CR 方程是否恒成立且偏导数是否连续；',
      '2. 求共轭调和函数 v(x,y)：已知 u(x,y)，由 $dv = \\frac{\\partial v}{\\partial x} dx + \\frac{\\partial v}{\\partial y} dy = -\\frac{\\partial u}{\\partial y} dx + \\frac{\\partial u}{\\partial x} dy$ 进行全微分偏积分求出 $v(x,y) + C$；',
      '3. 构造 f(z)：代入 $x=z, y=0$，即 $f(z) = u(z, 0) + i v(z, 0)$，快速求出以 $z$ 表示的解析函数。'
    ]
  },
  {
    id: 'cx_cauchy_integral',
    domain: 'complex-analysis',
    title: '柯西积分定理与高阶求导公式 (Cauchy Integral Formula)',
    keywords: ['柯西积分公式', '复积分', '高阶导数公式', '闭曲线积分', '环路积分', '莫雷拉定理'],
    summary: '若 f(z) 在周线 C 及其内部解析，则 ∮_C f(z)/(z-z_0)^{n+1} dz = (2πi / n!) f^{(n)}(z_0)',
    formulas: [
      '\\oint_C f(z) dz = 0 \\quad (柯西-古萨定理)',
      'f(z_0) = \\frac{1}{2\\pi i} \\oint_C \\frac{f(z)}{z - z_0} dz',
      'f^{(n)}(z_0) = \\frac{n!}{2\\pi i} \\oint_C \\frac{f(z)}{(z - z_0)^{n+1}} dz',
      '\\oint_C \\frac{f(z)}{(z - z_0)^{n+1}} dz = \\frac{2\\pi i}{n!} f^{(n)}(z_0)'
    ],
    method: [
      '1. 找奇点：令被积函数分母为 0，求出所有孤立奇点 $z_k$；',
      '2. 判位置：判断哪些奇点落在积分闭路径 $C$ 内部，落在外部的奇点对应的项在内部解析，积分贡献为 0；',
      '3. 算积分：内部单个 $n+1$ 阶极点直接套用高阶求导公式 $\\frac{2\\pi i}{n!} g^{(n)}(z_0)$；若有多个内部奇点，拆分为多条互不包含的小圆圈分别积分或直接用留数定理。'
    ]
  },
  {
    id: 'cx_laurent_series',
    domain: 'complex-analysis',
    title: '洛朗级数展开与孤立奇点分类 (Laurent Series & Singularities)',
    keywords: ['洛朗级数', '泰勒级数', '可去奇点', '极点', '本性奇点', '展开式', '收敛圆环'],
    summary: '在圆环域 r < |z-z_0| < R 内，f(z) = ∑_{n=-∞}^{+∞} a_n (z-z_0)^n',
    formulas: [
      'f(z) = \\sum_{n=0}^\\infty a_n (z - z_0)^n + \\sum_{n=1}^\\infty \\frac{b_n}{(z - z_0)^n}',
      '\\text{Res}[f(z), z_0] = b_1 \\quad (洛朗级数中 \\frac{1}{z-z_0} 的系数)'
    ],
    method: [
      '1. 典型展开：利用标准公式 $\\frac{1}{1-w} = \\sum w^n (|w|<1), e^w = \\sum \\frac{w^n}{n!}, \\cos w = \\sum (-1)^n \\frac{w^{2n}}{(2n)!}$；',
      '2. 分区展开（如 $1 < |z| < 2$）：对分母含 $(z-1)(z-2)$ 的有理式，分解为部分分式，在 $|z|>1$ 处将 $\\frac{1}{z-1}$ 提出 $z$ 展开为 $\\frac{1}{z}\\frac{1}{1 - 1/z}$；在 $|z|<2$ 处将 $\\frac{1}{z-2}$ 提出 $-2$ 展开；',
      '3. 奇点分类判断：',
      '   - 无负幂项：可去奇点（$\\lim_{z\\to z_0} f(z)$ 存在且有限）；',
      '   - 负幂项有限项（最高为 $(z-z_0)^{-m}$）：$m$ 阶极点；',
      '   - 负幂项无限项：本性奇点（如 $e^{1/z}, \\sin(1/z)$ 在 $z=0$ 处）。'
    ]
  },
  {
    id: 'cx_residue_theorem',
    domain: 'complex-analysis',
    title: '留数定理与典型实积分计算 (Residue Theorem & Real Integrals)',
    keywords: ['留数定理', '留数', '极点', '实积分', '广义积分', '三角积分', '若当引理', 'Res'],
    summary: '∮_C f(z) dz = 2πi ∑_{k=1}^m Res[f(z), z_k]',
    formulas: [
      '\\text{Res}[f, z_0] = \\lim_{z \\to z_0} (z - z_0) f(z) \\quad (单极点)',
      '\\text{Res}[f, z_0] = \\frac{P(z_0)}{Q\'(z_0)} \\quad (f(z)=\\frac{P(z)}{Q(z)}, Q(z_0)=0, Q\'(z_0)\\neq 0)',
      '\\text{Res}[f, z_0] = \\frac{1}{(m-1)!} \\lim_{z \\to z_0} \\frac{d^{m-1}}{dz^{m-1}} \\left[ (z - z_0)^m f(z) \\right] \\quad (m阶极点)',
      '\\int_0^{2\\pi} R(\\cos\\theta, \\sin\\theta) d\\theta = \\oint_{|z|=1} R\\left(\\frac{z+z^{-1}}{2}, \\frac{z-z^{-1}}{2i}\\right) \\frac{dz}{iz}',
      '\\int_{-\\infty}^{+\\infty} \\frac{P(x)}{Q(x)} dx = 2\\pi i \\sum_{\\text{Im}(z_k)>0} \\text{Res}\\left[\\frac{P(z)}{Q(z)}, z_k\\right] \\quad (\\text{deg}(Q) \\ge \\text{deg}(P)+2)',
      '\\int_{-\\infty}^{+\\infty} \\frac{P(x)}{Q(x)} e^{i m x} dx = 2\\pi i \\sum_{\\text{Im}(z_k)>0} \\text{Res}\\left[\\frac{P(z)}{Q(z)} e^{i m z}, z_k\\right] \\quad (m>0, 若当引理)'
    ],
    method: [
      '1. 三角有理式积分：令 $z = e^{i\\theta}, dz = i z d\\theta$，转换为单位圆周 $|z|=1$ 上的复积分，求圆内极点留数；',
      '2. 无穷区间有理式积分：构造上半圆闭路径，计算上半平面所有极点的留数和，乘以 $2\\pi i$；',
      '3. 傅里叶型积分 $\\int_{-\\infty}^\\infty f(x) \\cos(mx) dx$：计算 $\\int_{-\\infty}^\\infty f(x) e^{imx} dx$ 的实部。'
    ]
  },
  {
    id: 'cx_rouche_theorem',
    domain: 'complex-analysis',
    title: '辐角原理与儒歇定理 (Rouché Theorem & Roots Counting)',
    keywords: ['儒歇定理', '辐角原理', '方程根的个数', '零点个数', '代数基本定理'],
    summary: '若在闭曲线 C 上 |f(z)| > |g(z)|，则 f(z) 与 f(z) + g(z) 在 C 内部具有相同数目的零点',
    formulas: [
      'N - P = \\frac{1}{2\\pi} \\Delta_C \\text{arg } f(z) = \\frac{1}{2\\pi i} \\oint_C \\frac{f\'(z)}{f(z)} dz \\quad (辐角原理)',
      '|f(z)| > |g(z)| \\quad (\\forall z \\in C) \\implies Z_{f+g} = Z_f \\quad (儒歇定理)'
    ],
    method: [
      '1. 设待求零点个数的多项式为 $P(z)$，如 $z^5 + 3z + 1 = 0$ 在 $|z|<2$ 或 $1<|z|<2$ 内；',
      '2. 选主导项 $f(z)$：',
      '   - 在 $|z|=2$ 上，模最大的项为主导项，取 $f(z)=z^5$（$|f(z)|=32$），余项 $g(z)=3z+1$（$|g(z)| \\le 3\\times 2+1=7 < 32$），故内部有 5 个零点；',
      '   - 在 $|z|=1$ 上，取 $f(z)=3z$（$|f|=3$），余项 $g(z)=z^5+1$（$|g| \\le 2 < 3$），内部有 1 个零点；',
      '3. 环域 $1<|z|<2$ 内的零点数 = $5 - 1 = 4$ 个。'
    ]
  },
  {
    id: 'cx_conformal_mapping',
    domain: 'complex-analysis',
    title: '保形映射与分式线性变换 (Conformal Mapping)',
    keywords: ['保形映射', '分式线性变换', '莫比乌斯变换', '保交角性', '保圆性', '三点定变换', '对称点原理'],
    summary: 'w = (a z + b) / (c z + d) (ad - bc ≠ 0)，具有保圆性、保交角性、保对称点性',
    formulas: [
      'w = \\frac{a z + b}{c z + d} \\quad (a d - b c \\neq 0)',
      '\\frac{(w - w_1)(w_2 - w_3)}{(w - w_3)(w_2 - w_1)} = \\frac{(z - z_1)(z_2 - z_3)}{(z - z_3)(z_2 - z_1)} \\quad (交比不变/三点定变换)',
      'w = e^{i\\theta} \\frac{z - z_0}{z - \\bar{z}_0} \\quad (上半平面映射到单位圆盘, \\text{Im}(z_0) > 0)',
      'w = e^{i\\theta} \\frac{z - z_0}{1 - \\bar{z}_0 z} \\quad (单位圆盘映射到单位圆盘, |z_0| < 1)'
    ],
    method: [
      '1. 三点定变换：在边界上选取 3 个对应点 $(z_1, z_2, z_3) \\to (w_1, w_2, w_3)$，代入交比公式求解 $w(z)$；',
      '2. 区域对应方向判定：沿着 $z_1 \\to z_2 \\to z_3$ 前进，目标区域在左侧，则像点 $w_1 \\to w_2 \\to w_3$ 前进时目标区域也必须在左侧（保方向性）；',
      '3. 典型几何映射：幂函数 $w=z^n$ 用于角形区域展平，指数函数 $w=e^z$ 用于带状区域展平。'
    ]
  }
];
