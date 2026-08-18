// ===================================================
// 学科解题技能文档中心 (Skill Document Registry)
// 技能 = 解题策略 + 工具调用指南 + 知识库检索方法
// 技能 ≠ 知识库（知识库在 knowledge/ 目录独立存储）
// ===================================================

export const SKILL_DOCS = {
  'calculus-algebra': `# 微积分与高等代数 (calculus-algebra)
## 解题策略
1. 数值求导/定积分 → 调用 differentiate 或 integrate 工具验算
2. 一元二次方程 → 调用 solve_quadratic(a, b, c) 直接出根
3. 二元一次方程组 → 调用 solve_linear_system_2x2
4. 非线性方程 f(x)=0 → 调用 find_equation_root 牛顿迭代
5. 通用表达式计算 → 调用 calculate (支持阶乘、组合数、三角/对数)
## 知识库检索
遇到定理公式记忆模糊时：search_knowledge_base(query="等价无穷小替换") 或 search_knowledge_base(query="分部积分")
## 联网搜索
遇到陌生题型或超纲内容 → web_search(query="泰勒展开 余项估计")`,

  'complex-analysis': `# 复变函数与积分变换 (complex-analysis)
## 解题策略
1. 复数运算(加减乘除/模/辐角) → 调用 complex_calculate(operation, z1, z2)
2. 判断解析性 → 手动验 C-R 方程，需要数值验算时用 calculate
3. 留数/围道积分 → 先判断奇点阶数，再用公式推导，数值部分用 calculate 验证
## 知识库检索
遇到定理细节时：search_knowledge_base(query="柯西积分公式", domain="complex-analysis") 或 search_knowledge_base(query="留数定理 实积分", domain="complex-analysis")
## 联网搜索
遇到冷门变换或特殊函数 → web_search(query="Gamma函数 留数计算")`,

  'signals-systems': `# 信号与系统 (signals-systems)
## 解题策略
1. 离散卷积和 → 调用 discrete_convolution(x, h) 直接出结果数组
2. 频率响应 H(jω) → 调用 frequency_response(numerator_coeffs, denominator_coeffs, omega)
3. 连续卷积积分 → 手动推导积分区间后用 integrate 或 calculate 验算
4. 系统稳定性判断 → 用 solve_quadratic 求特征方程根，检查实部正负
## 知识库检索
遇到标准变换对或性质时：search_knowledge_base(query="卷积积分 指数信号", domain="signals-systems") 或 search_knowledge_base(query="拉普拉斯变换 初值终值定理", domain="signals-systems")
## 联网搜索
遇到特殊窗函数或滤波器设计 → web_search(query="巴特沃斯滤波器 频率响应")`,

  'electromagnetics': `# 电磁场与电磁波 (electromagnetics)
## 解题策略
1. 传输线参数(反射系数/驻波比/输入阻抗) → 调用 transmission_line_calc(zL, z0)
2. 平面波参数(波阻抗/相速/波长/穿透深度) → 调用 em_wave_calc(frequency, eps_r, mu_r, sigma)
3. 向量叉积/点积(坡印廷矢量 S=E×H 等) → 调用 vector_calculate(operation, v1, v2)
4. 数值计算验证 → 用 calculate 代入具体数值
## 知识库检索
遇到定理与公式推导时：search_knowledge_base(query="麦克斯韦方程组 时谐形式", domain="electromagnetics") 或 search_knowledge_base(query="坡印廷矢量 时间平均", domain="electromagnetics")
## 联网搜索
遇到天线理论或介质分界面问题 → web_search(query="半波偶极子天线 方向图")`,

  'geometry-statistics': `# 空间几何与概率统计 (geometry-statistics)
## 解题策略
1. 向量运算(点积/叉积/模) → 调用 vector_calculate(operation, v1, v2)
2. 统计量(均值/方差/标准差/中位数) → 调用 statistics_calculate(numbers)
3. 组合数/排列数 → 调用 calculate("C(n,k)") 或 calculate("P(n,k)")
4. 概率分布数值 → 用 calculate 代入公式
## 知识库检索
遇到几何定理或分布性质时：search_knowledge_base(query="点到平面距离公式") 或 search_knowledge_base(query="正态分布标准化")
## 联网搜索
遇到高阶统计检验或特殊分布 → web_search(query="卡方检验 自由度")`,

  'general-qa': `# 通用问答与代码分析 (general-qa)
## 解题策略
1. 文史/政治/法律/地理常识 → 优先 web_search(query="...") 联网搜索确认事实
2. 编程代码/Bug分析 → 直接推理，需要验证数值时用 calculate
3. 外语翻译 → 直接输出翻译，遇到专业术语联网确认 web_search(query="...")
## 知识库检索
通用问答一般不需要学科知识库，但如涉及理工交叉内容：search_knowledge_base(query="相关主题关键词")
## 联网搜索
通识类问题的核心手段：web_search(query="具体问题描述") 确保事实准确性`
};

export function getSkillDoc(name) {
  if (!name) return null;
  const key = String(name).trim().toLowerCase();
  return SKILL_DOCS[key] || null;
}

export function listAvailableSkills() {
  return Object.keys(SKILL_DOCS);
}

/**
 * 根据题目文本内容智能自动匹配学科领域技能 (Auto Load Skill)
 */
export function matchSkillsForQuestion(questionText) {
  if (!questionText || typeof questionText !== 'string') {
    return ['calculus-algebra'];
  }

  const text = questionText.toLowerCase();
  const matched = [];

  // 1. 复变函数与积分变换
  if (/(复数|复变|留数|柯西|围道|解析函数|奇点|极点|辐角|c-r|洛朗|调和函数|cauchy|residue|complex|contour|laurent|z\s*=|\|\s*z\s*\|)/i.test(text)) {
    matched.push('complex-analysis');
  }

  // 2. 信号与系统
  if (/(信号|系统|卷积|傅里叶|傅立叶|拉普拉斯|z变换|频率响应|冲激|阶跃|传递函数|零极点|稳定性|滤波|奈奎斯特|采样定理|fourier|laplace|convolution|impulse|transfer function|frequency response|h\(t\)|x\(t\)|h\(n\)|x\(n\)|h\(s\)|h\(z\))/i.test(text)) {
    matched.push('signals-systems');
  }

  // 3. 电磁场与电磁波
  if (/(电磁|麦克斯韦|坡印廷|传输线|驻波比|反射系数|波阻抗|平面波|介质|趋肤|穿透深度|maxwell|poynting|transmission line|vswr|wave|electromagnetic|z_0|z_l|z0|zl)/i.test(text)) {
    matched.push('electromagnetics');
  }

  // 4. 空间几何与概率统计
  if (/(向量|点积|叉积|空间几何|平面方程|直线方程|概率|统计|方差|均值|标准差|正态分布|二项分布|期望|协方差|卡方|排列|组合|vector|probability|statistics|variance|expectation|normal distribution|c\(\d+,\d+\)|p\(\d+,\d+\))/i.test(text)) {
    matched.push('geometry-statistics');
  }

  // 5. 微积分与高等代数
  if (/(求导|导数|积分|微积分|极限|微分方程|通解|特解|泰勒|极值|单调|方程|矩阵|特征值|特征向量|行列式|二次型|lim|integral|derivative|differential|matrix|eigenvalue|taylor|\\int|\\sum|\\lim|\\frac)/i.test(text)) {
    matched.push('calculus-algebra');
  }

  // 6. 通用问答与代码
  if (/(代码|编程|程序|python|java|c\+\+|javascript|bug|算法|翻译|英文|历史|文史|常识|解释|简述)/i.test(text)) {
    matched.push('general-qa');
  }

  if (matched.length === 0) {
    matched.push('calculus-algebra');
  }

  return Array.from(new Set(matched));
}
