import { useEffect, useRef, useState } from 'react'
import { searchBooks, type OpenLibraryResult } from '../lib/openLibrary'

type Props = {
  open: boolean
  onClose: () => void
  onRecommend: (input: { result: OpenLibraryResult; recommender: string; note: string }) => Promise<unknown>
}

export function RecommendBookDialog({ open, onClose, onRecommend }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OpenLibraryResult[]>([])
  const [loading, setLoading] = useState(false)
  const [picked, setPicked] = useState<OpenLibraryResult | null>(null)
  const [recommender, setRecommender] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setPicked(null)
      setRecommender('')
      setNote('')
      setError('')
    }
  }, [open])

  useEffect(() => {
    if (picked || query.trim().length < 2) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      try {
        const r = await searchBooks(query, controller.signal)
        setResults(r)
      } catch {
        // aborted or failed, ignore
      } finally {
        setLoading(false)
      }
    }, 280)
    return () => clearTimeout(t)
  }, [query, picked])

  if (!open) return null

  const submit = async () => {
    if (!picked) return
    if (recommender.trim().length < 1 || recommender.trim().length > 60) {
      setError('Your name must be 1–60 characters.')
      return
    }
    if (note.length > 500) {
      setError('Keep the note under 500 characters.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await onRecommend({ result: picked, recommender: recommender.trim(), note: note.trim() })
      onClose()
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl animate-rise">
        <h3 className="font-display text-2xl italic text-foreground">Recommend a book</h3>

        {!picked ? (
          <>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or author…"
              className="mt-4 w-full rounded-md border border-border bg-background px-3 py-2 font-sans text-sm outline-none focus:border-primary"
            />
            <div className="mt-3 max-h-72 overflow-y-auto space-y-1">
              {loading && <p className="font-mono text-xs text-muted-foreground px-1">Searching…</p>}
              {results.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setPicked(r)}
                  className="w-full flex items-center gap-3 rounded-md p-2 text-left hover:bg-muted transition-colors"
                >
                  <img src={r.cover} alt="" className="h-12 w-8 object-cover rounded-sm shrink-0" />
                  <div className="min-w-0">
                    <p className="font-sans text-sm text-foreground truncate">{r.title}</p>
                    <p className="font-mono text-xs text-muted-foreground truncate">
                      {r.author} {r.year ? `· ${r.year}` : ''}
                    </p>
                  </div>
                  <span className="ml-auto font-mono text-xs text-primary shrink-0">Pick</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-3">
              <img src={picked.cover} alt="" className="h-20 w-14 object-cover rounded-sm shrink-0" />
              <div className="min-w-0">
                <p className="font-sans text-sm text-foreground">{picked.title}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {picked.author} {picked.year ? `· ${picked.year}` : ''}
                </p>
                <button
                  onClick={() => setPicked(null)}
                  className="mt-1 font-mono text-xs text-primary hover:underline"
                >
                  Change book
                </button>
              </div>
            </div>

            <label className="block mt-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Your name
            </label>
            <input
              value={recommender}
              onChange={(e) => setRecommender(e.target.value)}
              maxLength={60}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 font-sans text-sm outline-none focus:border-primary"
            />

            <label className="block mt-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Why should I read it?
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 font-sans text-sm outline-none focus:border-primary resize-none"
            />

            {error && <p className="mt-2 font-sans text-sm text-red-500">{error}</p>}

            <div className="mt-4 flex items-center justify-end gap-3">
              <button onClick={onClose} className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="rounded-full bg-primary px-4 py-2 font-mono text-xs uppercase tracking-widest text-background disabled:opacity-50"
              >
                {submitting ? 'Sending…' : 'Shelve it'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
