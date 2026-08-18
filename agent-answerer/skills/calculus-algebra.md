# 微积分与高等代数 (calculus-algebra)

## 解题策略
1. 遇到数值求导/定积分 → 调用 `differentiate` 或 `integrate` 工具验算
2. 一元二次方程 → 调用 `solve_quadratic(a, b, c)` 直接出根
3. 二元一次方程组 → 调用 `solve_linear_system_2x2`
4. 非线性方程 f(x)=0 → 调用 `find_equation_root` 牛顿迭代
5. 通用表达式计算 → 调用 `calculate` (支持阶乘、组合数、三角/对数)

## 知识库检索
遇到定理公式记忆模糊时：
- `search_knowledge_base(query="等价无穷小替换")`
- `search_knowledge_base(query="分部积分")`

## 联网搜索
遇到陌生题型或超纲内容 → `web_search(query="泰勒展开 余项估计")`
