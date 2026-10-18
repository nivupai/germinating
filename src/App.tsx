import { useState } from 'react'
import { books as allBooks, type Book } from './data/books'
import { Shelf } from './components/Shelf'
import { BookDetail } from './components/BookDetail'
import { TypedTitle } from './components/TypedTitle'
import { LibraryFilter } from './components/LibraryFilter'
import { RecommendBookDialog } from './components/RecommendBookDialog'
import { useRecommendations } from './hooks/useRecommendations'

type OpenState = { book: Book; rect: DOMRect; list: Book[] } | null

function App() {
  const [visible, setVisible] = useState<Book[] | null>(null)
  const [openState, setOpenState] = useState<OpenState>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { recommendations, recommend, justAdded } = useRecommendations()

  const shown = visible ?? allBooks

  const handleOpen = (book: Book, rect: DOMRect, list: Book[]) => {
    setOpenState({ book, rect, list })
  }

  const step = (dir: 1 | -1) => {
    if (!openState) return
    const idx = openState.list.findIndex((b) => b.id === openState.book.id)
    const next = openState.list[(idx + dir + openState.list.length) % openState.list.length]
    const rect = document.querySelector<HTMLElement>(`[data-id="${next.id}"] button`)?.getBoundingClientRect()
    setOpenState({ book: next, rect: rect ?? openState.rect, list: openState.list })
  }

  return (
    <div className="grain min-h-screen relative">
      <div
        className="pointer-events-none fixed inset-0 animate-drift opacity-60"
        style={{
          background:
            'radial-gradient(60% 50% at 30% 10%, oklch(0.8 0.04 60 / 0.4), transparent), radial-gradient(50% 40% at 80% 30%, oklch(0.78 0.03 40 / 0.3), transparent)',
        }}
      />

      <div className="relative z-[1] mx-auto max-w-7xl px-6 pt-14 pb-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          A personal archive
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <TypedTitle />
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {allBooks.length} volumes
            </span>
            <button
              onClick={() => setDialogOpen(true)}
              className="rounded-full border border-border px-4 py-2 font-mono text-xs uppercase tracking-widest text-foreground hover:border-primary hover:text-primary transition-colors"
            >
              Recommend a book
            </button>
          </div>
        </div>

        <div className="mt-8 max-w-xl">
          <LibraryFilter books={allBooks} onChange={setVisible} />
        </div>
      </div>

      <main className="relative z-[1] pb-2">
        <Shelf books={shown} onOpen={(book, rect) => handleOpen(book, rect, shown)} />
      </main>

      {recommendations.length > 0 && (
        <section className="relative z-[1] pt-2">
          <div className="mx-auto max-w-7xl px-6">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Recommended to me
            </p>
          </div>
          <Shelf
            books={recommendations}
            justAdded={justAdded}
            onOpen={(book, rect) => handleOpen(book, rect, recommendations)}
          />
        </section>
      )}

      {openState && (
        <BookDetail
          book={openState.book}
          rect={openState.rect}
          onClose={() => setOpenState(null)}
          onPrev={openState.list.length > 1 ? () => step(-1) : undefined}
          onNext={openState.list.length > 1 ? () => step(1) : undefined}
        />
      )}

      <RecommendBookDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onRecommend={recommend}
      />
    </div>
  )
}

export default App
