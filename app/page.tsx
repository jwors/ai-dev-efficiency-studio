'use client'
import { useRef, useState } from 'react';
import ReactFlow, { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css'

type FlowNode = {
  id: string,
  type: 'input' | 'planner' | 'step' | 'output',
  label:string
}

type FlowEdge = {
  from: string,
  to:string
}

export default function Page() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [result, setResult] = useState<any>(null);
  const [flow, setFlow] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);


  function buildFlow(data: any): { nodes: Node[], edges: Edge[] } { 
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    debugger;
    // User Input
    nodes.push({
      id: 'input',
      data: { label: 'User Input' },
      position: { x: 0, y: 0 }
    });
  
    // Planner / Goal
    nodes.push({
      id: 'planner',
      data: { label: `Goal: ${data.plan.goal}` },
      position: { x: 0, y: 100 }
    });
  
    edges.push({
      id: 'e-input-planner',
      source: 'input',
      target: 'planner'
    });
  
    // Steps
    data.plan.steps.forEach((step: any, index: number) => {
      const stepId = `step-${index}`;
  
      nodes.push({
        id: stepId,
        data: { label: `${step.action}` },
        position: { x: 0, y: 200 + index * 100 }
      });
  
      edges.push({
        id: `e-${index}`,
        source: index === 0 ? 'planner' : `step-${index - 1}`,
        target: stepId
      });
    });
  
    // Output
    if (data.outputs?.length) {
      nodes.push({
        id: 'output',
        data: { label: 'Output' },
        position: { x: 0, y: 200 + data.plan.steps.length * 100 }
      });
  
      edges.push({
        id: 'e-output',
        source: `step-${data.plan.steps.length - 1}`,
        target: 'output'
      });
    }
  
    return { nodes, edges };
  }

  async function handleRun() {
    const input = inputRef.current?.value
    if (!input) {
      setError('请输入内容')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input })
      })

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`)
      }

      const data = await response.json()
      setResult(data);
      setFlow(buildFlow(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex  items-center justify-center h-screen">
      <div className='flex flex-col'>
        <input 
          type="text" 
          ref={inputRef} 
          className="border border-gray-300 rounded-md p-2 w-80 customInput" 
          placeholder="输入任务描述..."
          disabled={loading}
        />
        <button 
          className="bg-blue-500 mt-6 text-white p-2 rounded-md  disabled:bg-gray-400 disabled:cursor-not-allowed" 
          onClick={handleRun}
          disabled={loading}
        >
          {loading ? '处理中...' : 'Run Task'}
        </button>
      </div>
      
      {flow && (
        <div
          className='w-md h-256 bg-cyan-500 ml-20'
        >
          <ReactFlow nodes={flow.nodes} edges={flow.edges} />
        </div>
      )}
    </div>
  )
}