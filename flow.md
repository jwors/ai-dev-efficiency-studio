## 初始化

page.tsx 页面调用handleRun 函数，该函数内部POST调用后端接口 /api/run,
该接口接受两个参数，分别是uuid、input。
该接口内部首先调用函数inputGuard，该函数接受一个参数 input,返回值
blocked,blocked 为 true的情况下接口结束。
  
然后 调用 getSession(uuid) 函数，返回值为state，在调用updateSession(input,state)。

其中函数getSession接受一个参数sessionId，并返回一个类型为Promise<SessionState>的值。

函数updateSession接受两个参数，分别是input和state。
然后内部执行 updateSummaryIfNeeded(state,callLLmSummary)


关于updateSummaryIfNeeded 首先是判断state的history是否
小于 MAX_HISTORY ，是就直接return 结束，大于就然后取出 OVERFLOW ，最后生成摘要并添加到state上

然后再执行 const pluginResults = await runPlugins(pluginList, input, state);
state.plan = planPlugin?.data?.plan ?? null;
state.results = planPlugin?.data?.results ?? [];
state.outputs = planPlugin?.data?.outputs ?? [];

runPlugins 函数本质是执行第一个参数，第一个参数是一个插件——runPlanExecutePlugin，然后在input、state 这两个参数传递给这个插件。

runPlanExecutePlugin函数内部首先调用函数planner(input, state)，

planner函数的功能包含
 1. 对内容进行摘要
 2. 获取该plugin对应的 prompt
 3. 调正该次访问的Token 预算
 4. 调用LLM
 5. 对LLM返回的内容进行校验
 6. 最后返回内容

在调用完planner函数之后调用runPlan(plan, state)
runPlan函数的的主要作用是循环调用taskFromPlanStep(step);
针对不同的 step.action操作执行不一样的结果，返回的变量叫做task;

目前action包含一下类型
	1. log,
	2. emit,
	3. http,
	4. export_flow,
	5. web.search,
	6. web.fetch,
	7. file.write,
	8. artifact.export

然后再调用executeTask(task,state) 函数



await saveSession(state)

，最后返回NextResponse.json({
    plan: planPlugin?.data?.plan ?? null,
    observation: state.observation ?? null,
    results: planPlugin?.data?.results ?? [],
    outputs: planPlugin?.data?.outputs ?? [],
    plugins: pluginResults,
    sessionId: state.sessionId,
  }) 并调用结束。


