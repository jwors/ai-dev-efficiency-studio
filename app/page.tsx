'use client'
import { useRef, useState } from 'react';

export default function Page() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

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
      const response = await fetch('/api/plan', {
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
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className='text-2xl mb-2'>Ai dev efficienncy studio</h1>
      <input 
        type="text" 
        ref={inputRef} 
        className="border border-gray-300 rounded-md p-2 w-80" 
        placeholder="输入任务描述..."
        disabled={loading}
      />
      <button 
        className="bg-blue-500 text-white p-2 rounded-md mt-4 disabled:bg-gray-400 disabled:cursor-not-allowed" 
        onClick={handleRun}
        disabled={loading}
      >
        {loading ? '处理中...' : 'Run Task'}
      </button>
      
      {error && (
        <div className="mt-4 text-red-500">{error}</div>
      )}
      
      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded-md max-w-2xl">
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}