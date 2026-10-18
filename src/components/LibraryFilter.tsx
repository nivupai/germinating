import { useEffect, useMemo, useRef, useState } from 'react'
import type { Book } from '../data/books'

type Props = {
  books: Book[]
  onChange: (visible: Book[] | null) => void
}

function clientSearch(books: Book[], q: string): Book[] {
  const needle = q.toLowerCase()
  return books.filter((b) => {
    const hay = `${b.title} ${b.author} ${(b.genres ?? []).join(' ')} ${b.blurb}`.toLowerCase()
    return hay.includes(needle)
  })
}

export function LibraryFilter({ books, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<Book[] | null>(null)
  const reqId = useRef(0)

  const genres = useMemo(() => {
    const counts = new Map<string, number>()
    for (const b of books) {
      for (const g of b.genres ?? []) counts.set(g, (counts.get(g) ?? 0) + 1)
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [books])

  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchResult(null)
      setSearching(false)
      return
    }
    const id = ++reqId.current
    setSearching(true)
    const t = setTimeout(() => {
      const result = clientSearch(books, query.trim())
      if (reqId.current === id) {
        setSearchResult(result)
        setSearching(false)
      }
    }, 600)
    return () => clearTimeout(t)
  }, [query, books])

  useEffect(() => {
    let visible: Book[] | null = searchResult
    if (genre) {
      const base = visible ?? books
      visible = base.filter((b) => b.genres?.includes(genre))
    }
    onChange(visible)
  }, [searchResult, genre, books, onChange])

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What are you looking for?"
          className="w-full rounded-full border border-border bg-card px-4 py-2.5 font-sans text-sm outline-none focus:border-primary transition-colors"
        />
        {query.trim().length >= 2 && (
          <p className="mt-1.5 px-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {searching ? 'Reading the shelves…' : `${searchResult?.length ?? 0} found`}
          </p>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {genres.map(([g, count]) => (
          <button
            key={g}
            onClick={() => setGenre((cur) => (cur === g ? null : g))}
            className={`shrink-0 rounded-full border px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors ${
              genre === g
                ? 'border-primary bg-primary text-background'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {g} <span className="opacity-60">{count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
