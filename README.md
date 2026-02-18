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
9. 改善插件wbs,时期在source node 渲染 ❌



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
