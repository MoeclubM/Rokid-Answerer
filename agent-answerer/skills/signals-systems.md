# 信号与系统 (signals-systems)

## 解题策略
1. 离散卷积和 → 调用 `discrete_convolution(x, h)` 直接出结果数组
2. 频率响应 H(jω) → 调用 `frequency_response(numerator_coeffs, denominator_coeffs, omega)`
3. 连续卷积积分 → 手动推导积分区间后用 `integrate` 或 `calculate` 验算
4. 系统稳定性判断 → 用 `solve_quadratic` 求特征方程根，检查实部正负

## 知识库检索
遇到标准变换对或性质时：
- `search_knowledge_base(query="卷积积分 指数信号", domain="signals-systems")`
- `search_knowledge_base(query="拉普拉斯变换 初值终值定理", domain="signals-systems")`
- `search_knowledge_base(query="傅里叶变换 时移频移", domain="signals-systems")`

## 联网搜索
遇到特殊窗函数或滤波器设计 → `web_search(query="巴特沃斯滤波器 频率响应")`
