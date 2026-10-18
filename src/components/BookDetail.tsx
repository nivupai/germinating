import { useEffect, useState } from 'react'
import type { Book } from '../data/books'
import { COVER_W } from './bookFaces'

type Props = {
  book: Book
  rect: DOMRect
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
}

export function BookDetail({ book, rect, onClose, onPrev, onNext }: Props) {
  const [out, setOut] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setOut(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') retract()
      if (e.key === 'ArrowLeft') onPrev?.()
      if (e.key === 'ArrowRight') onNext?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onPrev, onNext])

  const retract = () => {
    setClosing(true)
    setOut(false)
    setTimeout(onClose, 620)
  }

  const vp = { w: window.innerWidth, h: window.innerHeight }
  const narrow = vp.w < 720
  const coverH = Math.min(vp.h * (narrow ? 0.42 : 0.6), 480)
  const coverW = COVER_W * (coverH / 320)

  const targetLeft = narrow ? vp.w / 2 - coverW / 2 : vp.w * 0.32 - coverW / 2
  const targetTop = narrow ? vp.h * 0.1 : vp.h / 2 - coverH / 2

  const style: React.CSSProperties = {
    position: 'fixed',
    left: out ? targetLeft : rect.left,
    top: out ? targetTop : rect.top,
    width: out ? coverW : rect.width,
    height: out ? coverH : rect.height,
    transformStyle: 'preserve-3d',
    transition: 'left 900ms cubic-bezier(0.16, 1, 0.3, 1), top 900ms cubic-bezier(0.16, 1, 0.3, 1), width 900ms cubic-bezier(0.16, 1, 0.3, 1), height 900ms cubic-bezier(0.16, 1, 0.3, 1), transform 900ms cubic-bezier(0.16, 1, 0.3, 1)',
    transform: out ? 'rotateY(0deg)' : 'rotateY(-70deg)',
    zIndex: 200,
  }

  return (
    <div className="fixed inset-0 z-[150]">
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-xl transition-opacity duration-700"
        style={{ opacity: out && !closing ? 1 : 0 }}
        onClick={retract}
      />

      <div style={style}>
        <div
          className="absolute inset-0 overflow-hidden rounded-r-[3px] shadow-2xl"
          style={{ backgroundColor: book.spine }}
        >
          {book.cover ? (
            <img src={book.cover} alt={book.title} className="w-full h-full object-cover" draggable={false} />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
              <p className="font-display italic text-xl" style={{ color: book.ink }}>
                {book.title}
              </p>
              <p className="font-sans text-sm mt-2 opacity-80" style={{ color: book.ink }}>
                {book.author}
              </p>
            </div>
          )}
        </div>
      </div>

      <div
        className="absolute transition-all duration-700"
        style={{
          left: narrow ? '50%' : `${(targetLeft + coverW + 40) / vp.w * 100}%`,
          top: narrow ? `${(targetTop + coverH + 24) / vp.h * 100}%` : '50%',
          transform: narrow ? 'translate(-50%, 0)' : 'translateY(-50%)',
          width: narrow ? '85%' : 420,
          opacity: out && !closing ? 1 : 0,
          transitionDelay: '260ms',
        }}
      >
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {book.recommender ? `Recommended by ${book.recommender}` : book.finished ? `Finished ${book.finished}` : ''}
        </p>
        <h2 className="font-display text-4xl italic mt-2 text-foreground">{book.title}</h2>
        <p className="font-sans text-lg text-muted-foreground mt-1">{book.author}</p>
        <p className="font-sans text-base leading-relaxed mt-4 text-foreground/90">{book.blurb}</p>
        <p className="font-mono text-sm mt-4 text-primary">
          {book.rating > 0 ? '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating) : 'Unrated'}
        </p>
        <div className="mt-6 flex items-center gap-4 font-mono text-xs uppercase tracking-widest">
          {onPrev && (
            <button onClick={onPrev} className="text-muted-foreground hover:text-foreground transition-colors">
              ← Previous
            </button>
          )}
          {onNext && (
            <button onClick={onNext} className="text-muted-foreground hover:text-foreground transition-colors">
              Next →
            </button>
          )}
          <button onClick={retract} className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
            Shelve it
          </button>
        </div>
      </div>
    </div>
  )
}
