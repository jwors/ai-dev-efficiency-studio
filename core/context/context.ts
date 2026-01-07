// core/context/context.ts

import {
  Plan,
  ExecutionResult,
  OutputItem,
  Observation,
  ContextState,
} from '../types/context';

export class Context {
  private state: ContextState = {
    plan: null,
    results: [],
    outputs: [],
    variables: {},
    currentStepIndex: -1,
  };

  setPlan(plan: Plan): void {
    this.state.plan = plan;
    this.state.results = [];
    this.state.outputs = [];
    this.state.currentStepIndex = -1;
  }

  getPlan(): Plan | null {
    return this.state.plan;
  }

  recordResult(result: Omit<ExecutionResult, 'timestamp'>): void {
    const fullResult: ExecutionResult = {
      ...result,
      timestamp: Date.now(),
    };

    this.state.results.push(fullResult);

    if (result.ok && result.type === 'emit' && result.data !== undefined) {
      this.addOutput({ type: 'emit', payload: result.data });
    }
  }

  addOutput(output: OutputItem): void {
    this.state.outputs.push(output);
  }

  getOutputs(): OutputItem[] {
    return [...this.state.outputs];
  }

  setVariable(key: string, value: any): void {
    this.state.variables[key] = value;
  }

  getVariable(key: string): any {
    return this.state.variables[key];
  }

  getAllVariables(): Record<string, any> {
    return { ...this.state.variables };
  }

  getObservation(): Observation {
    const errors = this.state.results
      .filter((result) => !result.ok && typeof result.error === 'string')
      .map((result) => result.error as string);

    return {
      outputs: this.getOutputs(),
      results: [...this.state.results],
      currentStepIndex: this.state.currentStepIndex,
      variables: this.getAllVariables(),
      errors: errors.length ? errors : undefined,
    };
  }

  setCurrentStepIndex(index: number): void {
    this.state.currentStepIndex = index;
  }

  getCurrentStepIndex(): number {
    return this.state.currentStepIndex;
  }

  exportState(): ContextState {
    return JSON.parse(JSON.stringify(this.state));
  }

  restoreState(snapshot: ContextState): void {
    this.state = JSON.parse(JSON.stringify(snapshot));
  }
}
