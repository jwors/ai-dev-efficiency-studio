'use client'
import { createTaskFromInput } from '@/core/task/createTaskFromInput';
import { runTask } from "@/core/task/runTask";
import { Task } from "@/core/task/types";
import { useRef } from 'react';

export default function Page() {
  const inputRef = useRef<HTMLInputElement>(null)
  async function handleRun() {
    const value = inputRef.current?.value
    if (value) {
      const task = await createTaskFromInput(value);
      await runTask(task);
    }
    return
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className='text-2xl mb-2'>Ai dev efficienncy studio</h1>
      <input type="text" ref={inputRef} className="border border-gray-300 rounded-md p-2" />
      <button className="bg-blue-500 text-white p-2 rounded-md mt-12" onClick={ handleRun }>Run Task</button>
    </div>
  )
}