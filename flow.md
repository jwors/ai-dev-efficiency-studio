## 初始化

page.tsx 页面调用handleRun 函数，该函数内部POST调用后端接口 /api/run,
该接口接受两个参数，分别是uuid、input。
该接口内部首先调用函数inputGuard，该函数接受一个参数 input,返回值
blocked,blocked 为 true的情况下接口结束。
  
然后 调用 getSession(uuid) 函数，返回值为state，在调用updateSession(input,state)。

在调用 const pluginResults = await runPlugins(pluginList, input, state);
state.plan = planPlugin?.data?.plan ?? null;
state.results = planPlugin?.data?.results ?? [];
state.outputs = planPlugin?.data?.outputs ?? [];
await saveSession(state)
，最后返回NextResponse.json({
    plan: planPlugin?.data?.plan ?? null,
    observation: state.observation ?? null,
    results: planPlugin?.data?.results ?? [],
    outputs: planPlugin?.data?.outputs ?? [],
    plugins: pluginResults,
    sessionId: state.sessionId,
  }) 并调用结束。

其中函数getSession接受一个参数sessionId，并返回一个类型为Promise<SessionState>的值。

函数updateSession接受两个参数，分别是input和state。
然后内部执行 updateSummaryIfNeeded(state,callLLmSummary)

