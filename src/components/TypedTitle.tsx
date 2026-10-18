import { useEffect, useState } from 'react'
import { CatCompanion } from './CatCompanion'

const FULL = 'Welcome to my library'

export function TypedTitle() {
  const [count, setCount] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (count >= FULL.length) {
      setDone(true)
      return
    }
    const t = setTimeout(() => setCount((c) => c + 1), 95)
    return () => clearTimeout(t)
  }, [count])

  return (
    <h1
      aria-label={FULL}
      className="font-display text-5xl md:text-6xl italic font-light text-foreground tracking-tight"
    >
      <span aria-hidden="true">
        {FULL.slice(0, count)}
        <span
          className={`inline-block w-[2px] h-[0.9em] bg-primary ml-1 align-middle ${
            done ? 'animate-pulse' : 'opacity-80'
          }`}
        />
        {done && <CatCompanion />}
      </span>
    </h1>
  )
}
