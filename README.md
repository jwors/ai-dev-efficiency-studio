## instroduce project

what is the definition of this project ?

## 这是一个以 AI 为 Planner、以程序为 Executor 的开发效率工具，用于把自然语言需求转化为可重复、可审计的工程执行流程。


```mathematica
用户
 ↓
Planner（AI）
 ↓
Task Graph（结构化）
 ↓
Executor（程序）
 ↓
Result / Log / State

```


core/
  config/       ← 系统配置
  llm/          ← 模型适配
  planner/      ← AI 决策
  task/         ← 动作定义（类型）
  executor/     ← 执行动作
  observation/   ← 观察结果



app/
  page.tsx      ← UI
  api/
    plan/       ← Planner API
    run/        ← Executor API（未来）


# todo
1. history 保存上下文 ✅
2. summary 生成对话摘要 ✅
3. 聊天窗口栏目（就是最大多少轮对话） ✅
4. observationDigest 实现已经确实交付的  ✅
5. 安全词  ✅
6. 数据持久化 ✅
7. plugin ✅
8. 网页关闭后，打开重新渲染 ✅
9. 改善插件wbs,时期在source node 渲染 ✅



---

## ✅ history：最近 N 条对话原文（滚动窗口）

你说的对：

> **history = 最近 12（可配置）条 message**

它的意义是：

* 给模型提供“刚刚发生了什么”的近场语境
* 保持对话连贯

它的缺点是：

* 会有噪声（闲聊、重复、无关句）
* 容易超长（所以要窗口化）

---

## ✅ summary：长期历史的压缩纪要

你说的也对：

> **summary = 对更早的对话做摘要（压缩成可携带的一段话）**

它的意义是：

* history 被裁掉后，仍然保留“重要背景/目标/约束”
* 防止模型完全失忆

它的缺点是：

* 摘要可能不完美（毕竟是 LLM 生成的）
* 有时会丢细节

---


更工程化的说法是：

* **history**：会议全过程录音（最近 12 句）
* **summary**：会议纪要
* **observationDigest**：会议决议 + 已完成事项（最可信、最应该被复用）

它的特点是：

* 来自 executor（系统真实执行结果）
* 可信度最高
* 信息密度最高
* 最省 token

---

## 一句话终极总结（你可以记这个）

1. history 解决“连贯性”
2. summary 解决“长期记忆”
3. observationDigest 解决“可复用的已交付事实”
4. Plan AI 的“意图与规划” 
5. Results：程序的“执行事实与轨迹 
6. Outputs：系统“交付给用户的结果” 

---

## 后续增加内容
**最有价值的 6 个方向**（从高收益到可选）：

**1. 可审计（来源与证据链）**
- 让 Executor 输出带引用的报告（来源 URL、抓取时间、摘要依据）
- 价值：解决“可信度”和“复用”问题，真正可用于交付

**2. 任务产物系统（Artifacts）**
- 统一产物存储、版本化、可下载  
- 支持 `report.md / report.pdf / data.json / chart.png` 多种
- 价值：从“回答”升级成“交付”

**3. 可复用模板**
- 报告模板库、任务模板库（行业报告、竞品分析、项目计划）
- 价值：效率提升、质量稳定

**4. 任务回放与差异**
- 保存每次执行的 plan + results  
- 可视化 diff：这次和上次的变化  
- 价值：可追踪、可复盘

**5. 插件生态**
- 允许自定义插件（比如：爬虫、PDF 生成、图表生成）  
- 价值：扩展边界，让别人也能用

**6. 可控执行预算**
- Token、网络次数、执行时长预算  
- 价值：真实可用的工程化约束

---
