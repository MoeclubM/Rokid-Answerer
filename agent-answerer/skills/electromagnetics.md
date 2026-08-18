# 电磁场与电磁波 (electromagnetics)

## 解题策略
1. 传输线参数(反射系数/驻波比/输入阻抗) → 调用 `transmission_line_calc(zL, z0)`
2. 平面波参数(波阻抗/相速/波长/穿透深度) → 调用 `em_wave_calc(frequency, eps_r, mu_r, sigma)`
3. 向量叉积/点积(坡印廷矢量 S=E×H 等) → 调用 `vector_calculate(operation, v1, v2)`
4. 数值计算验证 → 用 `calculate` 代入具体数值

## 知识库检索
遇到定理与公式推导时：
- `search_knowledge_base(query="麦克斯韦方程组 时谐形式", domain="electromagnetics")`
- `search_knowledge_base(query="坡印廷矢量 时间平均", domain="electromagnetics")`
- `search_knowledge_base(query="传输线 四分之一波长变换器", domain="electromagnetics")`
- `search_knowledge_base(query="亥姆霍兹定理 矢量位", domain="electromagnetics")`

## 联网搜索
遇到天线理论或介质分界面问题 → `web_search(query="半波偶极子天线 方向图")`
