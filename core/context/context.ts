// core/context.ts

import { 
  Plan, 
  ExecutionResult, 
  OutputItem, 
  Observation, 
  ContextState 
} from '../types/context';

export class Context {
  private state: ContextState = {
    plan: null,
    results: [],
    outputs: [],
    variables: {},
    currentStepIndex: -1,
  };

  // ====== 1. 计划管理 ======
  setPlan(plan: Plan): void {
    this.state.plan = plan;
    this.state.results = []; // 重置结果
    this.state.outputs = []; // 重置输出
    this.state.currentStepIndex = -1;
  }

  getPlan(): Plan | null {
    return this.state.plan;
  }

  // ====== 2. 结果记录 ======
  recordResult(result: Omit<ExecutionResult, 'timestamp'>): void {
    const fullResult: ExecutionResult = {
      ...result,
      timestamp: Date.now(),
    };
    this.state.results.push(fullResult);
    
    // 如果是成功的 emit，自动加入 outputs
    if (result.ok && result.type === 'emit' && result.data) {
      this.addOutput({ type: 'emit', payload: result.data });
    }
  }

  // ====== 3. 输出管理 ======
  addOutput(output: OutputItem): void {
    this.state.outputs.push(output);
  }

  getOutputs(): OutputItem[] {
    return [...this.state.outputs]; // 返回副本，防止外部修改
  }

  // ====== 4. 变量管理（步骤间传值）======
  setVariable(key: string, value: any): void {
    this.state.variables[key] = value;
  }

  getVariable(key: string): any {
    return this.state.variables[key];
  }

  getAllVariables(): Record<string, any> {
    return { ...this.state.variables };
  }

  // ====== 5. 状态快照（用于 observation）======
  getObservation(): Observation {
    return {
      outputs: this.getOutputs(),
      // 未来可加：errors: this.getErrors(), etc.
    };
  }

  // ====== 6. 执行进度 ======
  setCurrentStepIndex(index: number): void {
    this.state.currentStepIndex = index;
  }

  getCurrentStepIndex(): number {
    return this.state.currentStepIndex;
  }

  // ====== 7. 完整状态导出（用于日志/重放）======
  exportState(): ContextState {
    return JSON.parse(JSON.stringify(this.state)); // 深拷贝
  }

  // ====== 8. 从快照恢复（用于重放）======
  restoreState(snapshot: ContextState): void {
    this.state = JSON.parse(JSON.stringify(snapshot));
  }
}