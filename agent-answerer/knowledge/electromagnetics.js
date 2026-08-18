// ===================================================
// 专业学科知识库：电磁场与电磁波 (Electromagnetic Fields & Waves)
// 包含：亥姆霍兹定理、电磁位函数与能量、平面波介质折算、静态场边值问题、镜像法、麦克斯韦方程组、波导、传输线、天线辐射
// ===================================================

export const ELECTROMAGNETICS_KNOWLEDGE = [
  {
    id: 'em_helmholtz_vector_fields',
    domain: 'electromagnetics',
    title: '亥姆霍兹定理与矢量场唯一确定性 (Helmholtz Theorem & Vector Field Uniqueness)',
    keywords: ['亥姆霍兹', '亥姆霍兹定理', '散度', '旋度', '边界条件', '唯一确定', '无源场', '无旋场', '管形场', '通量源', '涡旋源'],
    summary: '矢量场由它的【散度】、【旋度】以及【边界条件（或边界上的场值）】唯一地确定。',
    formulas: [
      '\\nabla \\cdot \\mathbf{B} = 0 \\implies \\mathbf{B} = \\nabla \\times \\mathbf{A} \\quad (无源/管形场, 散度为 0, 存在矢量磁位)',
      '\\nabla \\times \\mathbf{E} = 0 \\implies \\mathbf{E} = -\\nabla \\Phi \\quad (无旋/保守场, 旋度为 0, 存在标量电位)',
      '\\mathbf{F}(\\mathbf{r}) = -\\nabla \\phi + \\nabla \\times \\mathbf{A} \\quad (任意矢量场均可分解为无旋部分与无源部分之和)'
    ],
    method: [
      '1. 填空题标准结论：在有限区域内，任意矢量场由其【散度】、【旋度】和【边界条件】唯一确定；',
      '2. 散度 $\\nabla \\cdot \\mathbf{B} = 0$ 确定场的散度源（通量源）；由 $\\nabla \\cdot \\mathbf{B} = 0$ 可求待定参数：$\\frac{\\partial B_x}{\\partial x} + \\frac{\\partial B_y}{\\partial y} + \\frac{\\partial B_z}{\\partial z} = 0$；',
      '3. 旋度 $\\nabla \\times \\mathbf{B} = \\mu \\mathbf{J}$ 确定场的旋度源（涡旋源）；',
      '4. 若已知 $\\nabla \\cdot \\mathbf{B} = 0$，则必存在矢量磁位 $\\mathbf{A}$ 满足 $\\mathbf{B} = \\nabla \\times \\mathbf{A}$。'
    ]
  },
  {
    id: 'em_potentials_and_energy',
    domain: 'electromagnetics',
    title: '电磁位函数、能量密度与坡印廷矢量 (Potentials, Energy Density & Poynting Vector)',
    keywords: ['标量位', '矢量位', '矢量磁位', '标量电位', '电场能量密度', '磁场能量密度', '能量密度', '坡印廷矢量', '平均坡印廷矢量', '瞬时值', '复数形式'],
    summary: 'B = ∇×A, E = -∇ϕ - ∂A/∂t；电场能量密度 w_e = (1/2) D·E，磁场能量密度 w_m = (1/2) B·H；坡印廷矢量 S = E×H，平均坡印廷矢量 S_av = (1/2) Re[E × H*]',
    formulas: [
      '\\mathbf{B} = \\nabla \\times \\mathbf{A}, \\quad \\mathbf{E} = -\\nabla \\phi - \\frac{\\partial \\mathbf{A}}{\\partial t} \\quad (时变电磁位函数定义)',
      'w_e = \\frac{1}{2} \\mathbf{D} \\cdot \\mathbf{E} = \\frac{1}{2} \\varepsilon E^2 \\quad (空间电场能量密度, 单位: \\text{J/m}^3)',
      'w_m = \\frac{1}{2} \\mathbf{B} \\cdot \\mathbf{H} = \\frac{1}{2} \\mu H^2 \\quad (空间磁场能量密度, 单位: \\text{J/m}^3)',
      '\\mathbf{S}(t) = \\mathbf{E}(t) \\times \\mathbf{H}(t) \\quad (坡印廷矢量瞬时值形式)',
      '\\mathbf{S}_{av} = \\frac{1}{2} \\text{Re}\\left[ \\mathbf{E} \\times \\mathbf{H}^* \\right] \\quad (正弦稳态中平均坡印廷矢量复数形式)'
    ],
    method: [
      '1. 标量位 $\\phi$ 与矢量位 $\\mathbf{A}$：恒定场中 $\\mathbf{E} = -\\nabla \\phi$；时变场中由于感应电动势，电场包含感生部分 $-\\frac{\\partial \\mathbf{A}}{\\partial t}$；',
      '2. 电磁场能量密度：线性各向同性介质中，电场能量密度为 $\\frac{1}{2}\\mathbf{D}\\cdot\\mathbf{E}$，磁场能量密度为 $\\frac{1}{2}\\mathbf{B}\\cdot\\mathbf{H}$；',
      '3. 坡印廷矢量（功率流密度）：瞬时值为 $\\mathbf{E}(t) \\times \\mathbf{H}(t)$，方向为能量传播方向；正弦场平均能流为 $\\frac{1}{2}\\text{Re}[\\mathbf{E} \\times \\mathbf{H}^*]$。'
    ]
  },
  {
    id: 'em_medium_parameters_conversion',
    domain: 'electromagnetics',
    title: '理想介质中平面波参数折算与瞬时值复数转换 (Medium Parameters & Phasor Conversion)',
    keywords: ['介质参数', '相对介电常数', '波阻抗折算', '传播速度', '波速', '相速', '瞬时值', '复数形式', '电场瞬时值', '相对磁导率', '300MHz', '120pi'],
    summary: '进入理想介质 (εr, μr=1) 后：波阻抗 η = η0/√εr = 120π/√εr，相速 v = c/√εr = (3×10^8)/√εr m/s',
    formulas: [
      '\\eta = \\sqrt{\\frac{\\mu}{\\varepsilon}} = \\frac{\\eta_0}{\\sqrt{\\varepsilon_r}} = \\frac{120\\pi}{\\sqrt{\\varepsilon_r}} \\quad (当 \\mu = \\mu_0 时)',
      'v = \\frac{1}{\\sqrt{\\mu \\varepsilon}} = \\frac{c}{\\sqrt{\\varepsilon_r \\mu_r}} = \\frac{3 \\times 10^8}{\\sqrt{\\varepsilon_r}} \\text{ m/s}',
      'k = \\beta = \\omega \\sqrt{\\mu \\varepsilon} = \\frac{\\omega}{v} = \\frac{2\\pi f \\sqrt{\\varepsilon_r}}{c}',
      '\\mathbf{E} = \\hat{a}_x E_0 e^{-j k z} \\implies \\mathbf{E}(z,t) = \\hat{a}_x E_0 \\cos(\\omega t - k z) \\quad (复数形式转瞬时值形式)'
    ],
    method: [
      '1. 介质参数折算：若空气中波阻抗为 $120\\pi \\ \\Omega$、波速为 $3\\times 10^8\\text{m/s}$，进入 $\\varepsilon_r = 4, \\mu = \\mu_0$ 的介质中：',
      '   - 波阻抗 $\\eta = \\frac{120\\pi}{\\sqrt{4}} = 60\\pi \\ \\Omega \\approx 188.5 \\ \\Omega$；',
      '   - 传播速度 $v = \\frac{3\\times 10^8}{\\sqrt{4}} = 1.5\\times 10^8\\text{ m/s}$；',
      '2. 复数形式 $\\leftrightarrow$ 瞬时值形式转换规范：',
      '   - 复数式 $\\mathbf{E} = \\mathbf{E}_0 e^{-j k z}$ 乘以 $e^{j\\omega t}$ 后取实部：$\\mathbf{E}(z,t) = \\text{Re}[\\mathbf{E} e^{j\\omega t}] = \\mathbf{E}_0 \\cos(\\omega t - k z)$；',
      '3. 理想导体反射振幅关系：垂直入射到理想导体表面时，反射系数 $\\Gamma = -1$，入射波电场振幅与反射波电场振幅【大小相等，相位相反】（$E_r = -E_i$）。'
    ]
  },
  {
    id: 'em_electrostatics_boundary',
    domain: 'electromagnetics',
    title: '静电场边值问题与电位方程 (Electrostatic Boundary Problems)',
    keywords: ['静电场', '电位', '泊松方程', '拉普拉斯方程', '高斯定理', '唯一性定理', '电容计算', '静电能量'],
    summary: '∇^2 Φ = -ρ/ε (泊松方程)，无源区 ∇^2 Φ = 0 (拉普拉斯方程)，电场 E = -∇Φ',
    formulas: [
      '\\mathbf{E} = -\\nabla \\Phi, \\quad \\nabla^2 \\Phi = -\\frac{\\rho}{\\varepsilon}',
      '\\oint_S \\mathbf{D} \\cdot d\\mathbf{S} = Q_{enc} \\quad (高斯定理)',
      'W_e = \\frac{1}{2} \\int_V \\mathbf{D} \\cdot \\mathbf{E} dV = \\frac{1}{2} C U^2 \\quad (静电场能量)',
      'C = \\frac{Q}{U} = \\frac{Q}{\\int_1^2 \\mathbf{E} \\cdot d\\mathbf{l}}'
    ],
    method: [
      '1. 高度对称结构求场强：利用高斯定理选取球对称、柱对称或面对称闭合高斯面；',
      '2. 计算电容步骤：假设带电量 $\\pm Q$ $\\to$ 积分求电场 $\\mathbf{E}$ $\\to$ 线积分求电压 $U = \\int \\mathbf{E} \\cdot dl$ $\\to$ 由 $C = Q/U$ 得出；',
      '3. 静电场能量法求力：虚位移法 $F_x = -\\left(\\frac{\\partial W_e}{\\partial x}\\right)_Q = +\\left(\\frac{\\partial W_e}{\\partial x}\\right)_U$。'
    ]
  },
  {
    id: 'em_method_of_images',
    domain: 'electromagnetics',
    title: '静电场镜像法 (Method of Images)',
    keywords: ['镜像法', '无限大接地导体平面', '接地导体球', '导体球壳', '感应电荷', '介质界面镜像'],
    summary: '用等效镜像电荷替代边界上的感应电荷，保持边界电位不变',
    formulas: [
      'q\' = -q, \\quad d\' = d \\quad (无限大接地导体平面)',
      'q\' = -q \\frac{R}{d}, \\quad d\' = \\frac{R^2}{d} \\quad (接地导体球, 半径 R, 距离 d > R)',
      'q\' = -q \\frac{\\varepsilon_2 - \\varepsilon_1}{\\varepsilon_2 + \\varepsilon_1}, \\quad q\'\' = q \\frac{2\\varepsilon_2}{\\varepsilon_1 + \\varepsilon_2} \\quad (无限大介质平界面)'
    ],
    method: [
      '1. 无限大接地导体平面：在对称位置放置大小相等、极性相反的镜像电荷 $q\' = -q$；',
      '2. 接地导体球：在球心与真实电荷的连线上，离球心 $d\' = R^2/d$ 处放置 $q\' = -q R/d$；',
      '3. 不接地孤立导体球：若导体球总带电量为 $Q_0$ 或带电电位 $V_0$，除镜像电荷 $q\'$ 外，还需在球心放置补充电荷 $q\'\' = Q_0 - q\'$；',
      '4. 计算导体表面感应电荷面密度：由边界条件 $\\rho_s = D_n = \\varepsilon E_n = -\\varepsilon \\left.\\frac{\\partial \\Phi}{\\partial n}\\right|_{\\text{表面}}$ 计算。'
    ]
  },
  {
    id: 'em_maxwell_equations',
    domain: 'electromagnetics',
    title: '麦克斯韦方程组与全套电磁边界条件 (Maxwell Equations & BCs)',
    keywords: ['麦克斯韦', '旋度', '散度', '位移电流', '边界条件', '法拉第电磁感应', '安培环路', '连续性方程'],
    summary: '∇×E = -∂B/∂t, ∇×H = J + ∂D/∂t, ∇·D = ρ, ∇·B = 0',
    formulas: [
      '\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}, \\quad \\nabla \\times \\mathbf{H} = \\mathbf{J} + \\frac{\\partial \\mathbf{D}}{\\partial t}',
      '\\nabla \\cdot \\mathbf{D} = \\rho, \\quad \\nabla \\cdot \\mathbf{B} = 0, \\quad \\nabla \\cdot \\mathbf{J} = -\\frac{\\partial \\rho}{\\partial t}',
      '\\hat{n} \\times (\\mathbf{E}_1 - \\mathbf{E}_2) = 0 \\quad (切向 E 连续)',
      '\\hat{n} \\times (\\mathbf{H}_1 - \\mathbf{H}_2) = \\mathbf{J}_s \\quad (切向 H 突变等于面电流密度)',
      '\\hat{n} \\cdot (\\mathbf{D}_1 - \\mathbf{D}_2) = \\rho_s \\quad (法向 D 突变等于面电荷密度)',
      '\\hat{n} \\cdot (\\mathbf{B}_1 - \\mathbf{B}_2) = 0 \\quad (法向 B 连续)'
    ],
    method: [
      '1. 静态场：时间导数项为 0，电场与磁场解耦；',
      '2. 理想介质分界面（$\\sigma=0$）：无自由面电荷与面电流（$\\rho_s=0, J_s=0$），切向 $E_t, H_t$ 和法向 $D_n, B_n$ 均连续；',
      '3. 理想导体表面（PEC）：内部 $\\mathbf{E}=0, \\mathbf{H}=0$，边界上切向 $\\mathbf{E}_t=0, \\mathbf{H}_t = \\mathbf{J}_s \\times \\hat{n}$，法向 $D_n = \\rho_s, B_n = 0$。'
    ]
  },
  {
    id: 'em_plane_waves',
    domain: 'electromagnetics',
    title: '均匀平面电磁波与极化特性 (Uniform Plane Waves & Polarization)',
    keywords: ['平面波', '波动方程', '波阻抗', '相速', '相位常数', '衰减常数', '趋肤深度', '坡印廷矢量', '线极化', '圆极化', '椭圆极化'],
    summary: 'E(z,t) = E_0 e^{-αz} cos(ωt - βz) a_x，波阻抗 η = √(μ/ε)，平均能流密度 S_av = (1/2) Re[E × H*]',
    formulas: [
      'k = \\omega \\sqrt{\\mu \\varepsilon} = \\frac{\\omega}{v} = \\frac{2\\pi}{\\lambda} \\quad (无耗理想介质)',
      '\\eta = \\sqrt{\\frac{\\mu}{\\varepsilon}} \\approx 120\\pi \\approx 377\\ \\Omega \\quad (真空中)',
      '\\gamma = \\alpha + j\\beta = j\\omega \\sqrt{\\mu \\varepsilon \\left(1 - j \\frac{\\sigma}{\\omega \\varepsilon}\\right)}',
      '\\delta = \\frac{1}{\\alpha} = \\sqrt{\\frac{2}{\\omega \\mu \\sigma}} \\quad (良导体趋肤深度)',
      '\\mathbf{S}_{av} = \\frac{1}{2} \\text{Re}[\\mathbf{E} \\times \\mathbf{H}^*] = \\frac{|E_0|^2}{2 \\eta} \\hat{a}_z \\quad (平均坡印廷矢量/功率流密度)'
    ],
    method: [
      '1. 判别介质类型：计算损耗角正切 $\\tan\\delta = \\frac{\\sigma}{\\omega \\varepsilon}$。若 $\\ll 1$ 为弱有耗介质，若 $\\gg 1$ 为良导体；',
      '2. 良导体中：$\\alpha = \\beta = \\sqrt{\\frac{\\omega \\mu \\sigma}{2}} = \\frac{1}{\\delta}$，$\\eta_c = (1+j)\\sqrt{\\frac{\\omega \\mu}{2\\sigma}}$；',
      '3. 极化状态判据：设 $\\mathbf{E} = E_x \\hat{a}_x + E_y e^{j\\delta} \\hat{a}_y$：',
      '   - 若 $\\delta = 0$ 或 $\\pi$：线极化；',
      '   - 若 $E_x = E_y$ 且 $\\delta = \\pm \\pi/2$：圆极化（面向波传播方向看去，顺时针为右旋，逆时针为左旋）；',
      '   - 一般情况为椭圆极化。'
    ]
  },
  {
    id: 'em_reflection_transmission',
    domain: 'electromagnetics',
    title: '平界面垂直与斜入射反射与透射 (Reflection & Transmission)',
    keywords: ['反射系数', '透射系数', '驻波比', '全反射', '布儒斯特角', 'SWR', '垂直入射', '斜入射', '菲涅尔公式', '理想导体反射'],
    summary: '垂直入射反射系数 Γ = (η2 - η1)/(η2 + η1)，透射系数 τ = 2η2/(η2 + η1)；理想导体表面 Γ = -1',
    formulas: [
      '\\Gamma = \\frac{\\eta_2 - \\eta_1}{\\eta_2 + \\eta_1}, \\quad \\tau = \\frac{2\\eta_2}{\\eta_2 + \\eta_1} = 1 + \\Gamma',
      'S = \\frac{1 + |\\Gamma|}{1 - |\\Gamma|} \\quad (电压驻波比 SWR)',
      '\\theta_c = \\arcsin\\sqrt{\\frac{\\varepsilon_2}{\\varepsilon_1}} \\quad (全反射临界角, \\varepsilon_1 > \\varepsilon_2)',
      '\\theta_B = \\arctan\\sqrt{\\frac{\\varepsilon_2}{\\varepsilon_1}} \\quad (平行极化布儒斯特角/全透射角)'
    ],
    method: [
      '1. 垂直入射：计算两种介质的波阻抗 $\\eta_1, \\eta_2$，套公式求 $\\Gamma$ 与 $\\tau$；',
      '2. 若第二介质为理想导体（PEC），$\\eta_2 = 0 \\implies \\Gamma = -1, \\tau = 0$，介质 1 中形成纯驻波，入射波与反射波电场大小相等、相位相反；',
      '3. 斜入射：根据斯奈尔折射定律 $k_1 \\sin\\theta_i = k_2 \\sin\\theta_t$，区分垂直极化（TE，电场垂直入射面）与平行极化（TM，磁场垂直入射面）计算菲涅尔公式。'
    ]
  },
  {
    id: 'em_waveguides',
    domain: 'electromagnetics',
    title: '导行电磁波与矩形金属波导 (Waveguides & TE/TM Modes)',
    keywords: ['矩形波导', '波导', 'TE模', 'TM模', '主模', 'TE10', '截止频率', '截止波长', '波导波长', '相速', '群速'],
    summary: '矩形波导(a>b)主模为 TE10 模，截止波长 λ_c = 2a，波导波长 λ_g = λ / √(1 - (λ/λ_c)^2)',
    formulas: [
      'k_c = \\sqrt{\\left(\\frac{m\\pi}{a}\\right)^2 + \\left(\\frac{n\\pi}{b}\\right)^2}, \\quad \\lambda_c = \\frac{2}{\\sqrt{(m/a)^2 + (n/b)^2}}',
      'f_c = \\frac{c}{2} \\sqrt{\\left(\\frac{m}{a}\\right)^2 + \\left(\\frac{n}{b}\\right)^2} \\quad (真空中截止频率)',
      '\\lambda_c(\\text{TE}_{10}) = 2a, \\quad f_c(\\text{TE}_{10}) = \\frac{c}{2a}',
      '\\lambda_g = \\frac{\\lambda}{\\sqrt{1 - (f_c/f)^2}} = \\frac{\\lambda}{\\sqrt{1 - (\\lambda/\\lambda_c)^2}} > \\lambda',
      'v_p = \\frac{c}{\\sqrt{1 - (f_c/f)^2}} > c, \\quad v_g = c \\sqrt{1 - (f_c/f)^2} < c, \\quad v_p v_g = c^2'
    ],
    method: [
      '1. 传播条件判断：工作频率 $f > f_c$ 或工作波长 $\\lambda < \\lambda_c$ 方可传输，若 $f < f_c$ 则发生截止衰减（消逝模）；',
      '2. 单模传输工作频段设计：保证主模 $TE_{10}$ 传输同时截止次高模（通常为 $TE_{20}$ 或 $TE_{01}$），单模工作频带为 $\\frac{c}{2a} < f < \\min\\left(\\frac{c}{a}, \\frac{c}{2b}\\right)$；',
      '3. 计算波导内传播常数：$\\beta_g = \\frac{2\\pi}{\\lambda_g} = \\sqrt{k^2 - k_c^2}$。'
    ]
  },
  {
    id: 'em_transmission_lines',
    domain: 'electromagnetics',
    title: '均匀传输线理论与阻抗匹配 (Transmission Line Theory & Impedance Matching)',
    keywords: ['传输线', '特征阻抗', '输入阻抗', '反射系数', '四分之一波长匹配', 'Smith圆图', '驻波比', '无耗线'],
    summary: '无耗线特征阻抗 Z_0 = √(L/C)，输入阻抗 Zin(l) = Z_0 (ZL + j Z_0 tan(βl)) / (Z_0 + j ZL tan(βl))',
    formulas: [
      'Z_0 = \\sqrt{\\frac{R + j\\omega L}{G + j\\omega C}} \\approx \\sqrt{\\frac{L}{C}} \\quad (无耗传输线特征阻抗)',
      'Z_{in}(l) = Z_0 \\frac{Z_L + j Z_0 \\tan(\\beta l)}{Z_0 + j Z_L \\tan(\\beta l)} \\quad (距负载 l 处的输入阻抗)',
      'Z_{in}(\\lambda/4) = \\frac{Z_0^2}{Z_L} \\quad (\\lambda/4 阻抗变换器)',
      'Z_{in}(\\lambda/2) = Z_L \\quad (\\lambda/2 阻抗重复性)',
      'Z_{in,sc} = j Z_0 \\tan(\\beta l) \\quad (终端短路), \\quad Z_{in,oc} = -j Z_0 \\cot(\\beta l) \\quad (终端开路)'
    ],
    method: [
      '1. 求传输线上任意点阻抗：代入输入阻抗公式，注意 $\\beta l = \\frac{2\\pi}{\\lambda} l$；',
      '2. 四分之一波长阻抗变换：若负载阻抗 $R_L$ 与传输线 $Z_0$ 均为纯电阻且不相等，插入一段特性阻抗为 $Z_{01} = \\sqrt{Z_0 R_L}$ 的 $\\lambda/4$ 线实现完全匹配；',
      '3. 终端短路与开路性质：$l < \\lambda/4$ 时短路线呈电感性，开路线呈电容性。'
    ]
  },
  {
    id: 'em_antenna_radiation',
    domain: 'electromagnetics',
    title: '时变电磁辐射与对称振子天线 (Electromagnetic Radiation & Antennas)',
    keywords: ['电偶极子', '赫兹偶极子', '辐射功率', '辐射电阻', '方向图', '天线增益', '半波对称振子'],
    summary: '赫兹偶极子远区场 E_θ ∝ (sinθ)/r e^{-jkr}，辐射电阻 R_r = 80π^2 (l/λ)^2；半波振子 R_r ≈ 73.1 Ω',
    formulas: [
      '\\mathbf{E}_{远} = j \\frac{\\eta I_0 l k}{4\\pi r} \\sin\\theta e^{-j k r} \\hat{a}_\\theta, \\quad \\mathbf{H}_{远} = \\frac{\\mathbf{E}_{远}}{\\eta} \\hat{a}_\\phi',
      'P_{rad} = 40\\pi^2 I_0^2 \\left(\\frac{l}{\\lambda}\\right)^2, \\quad R_r = 80\\pi^2 \\left(\\frac{l}{\\lambda}\\right)^2 \\quad (赫兹偶极子)',
      'R_r(\\text{半波振子}) \\approx 73.1\\ \\Omega, \\quad D_{max} = 1.64 \\quad (2.15\\text{ dBi})'
    ],
    method: [
      '1. 远区场判断条件：满足 $r \\gg \\lambda$ 且 $r \\gg D^2/\\lambda$（$D$ 为天线最大孔径尺寸）；',
      '2. 远区场特征：$\\mathbf{E}$ 与 $\\mathbf{H}$ 同相位且空间正交，波阻抗为自由空间阻抗 $\\eta_0 \\approx 120\\pi\\ \\Omega$，功率流沿径向 $\\hat{a}_r$ 扩散，幅度按 $1/r$ 衰减。'
    ]
  }
];
