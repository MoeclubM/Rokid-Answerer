# 复变函数与积分变换 (complex-analysis)

## 解题策略
1. 复数运算(加减乘除/模/辐角) → 调用 `complex_calculate(operation, z1, z2)`
2. 判断解析性 → 手动验 C-R 方程，需要数值验算时用 `calculate`
3. 留数/围道积分 → 先判断奇点阶数，再用公式推导，数值部分用 `calculate` 验证

## 知识库检索
遇到定理细节时：
- `search_knowledge_base(query="柯西积分公式", domain="complex-analysis")`
- `search_knowledge_base(query="留数定理 实积分", domain="complex-analysis")`
- `search_knowledge_base(query="洛朗展开 孤立奇点", domain="complex-analysis")`

## 联网搜索
遇到冷门变换或特殊函数 → `web_search(query="Gamma函数 留数计算")`
