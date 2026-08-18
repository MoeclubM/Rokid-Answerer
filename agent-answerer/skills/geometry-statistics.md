# 空间几何与概率统计 (geometry-statistics)

## 解题策略
1. 向量运算(点积/叉积/模) → 调用 `vector_calculate(operation, v1, v2)`
2. 统计量(均值/方差/标准差/中位数) → 调用 `statistics_calculate(numbers)`
3. 组合数/排列数 → 调用 `calculate("C(n,k)")` 或 `calculate("P(n,k)")`
4. 概率分布数值 → 用 `calculate` 代入公式

## 知识库检索
遇到几何定理或分布性质时：
- `search_knowledge_base(query="点到平面距离公式")`
- `search_knowledge_base(query="正态分布标准化")`

## 联网搜索
遇到高阶统计检验或特殊分布 → `web_search(query="卡方检验 自由度")`
