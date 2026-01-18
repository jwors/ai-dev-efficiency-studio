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