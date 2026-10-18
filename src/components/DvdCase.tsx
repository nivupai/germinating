import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Book } from '../data/books'
import { COVER_W, faceFont } from './bookFaces'

type Props = {
  book: Book
  ry: number
  onOpen: (rect: DOMRect) => void
}

export function DvdCase({ book, ry, onOpen }: Props) {
  const [hovered, setHovered] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [cardPos, setCardPos] = useState<{ left: number; top: number } | null>(null)

  const handleEnter = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) setCardPos({ left: rect.left + rect.width / 2, top: rect.top - 14 })
    setHovered(true)
  }
  const handleLeave = () => {
    leaveTimer.current = setTimeout(() => setHovered(false), 90)
  }

  const pull = hovered ? 96 : 0
  const lift = hovered ? -26 : 0
  const lean = hovered ? 0 : book.lean

  const vertical = book.face === 'mono' ? 'uppercase tracking-wide' : ''

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onClick={() => {
          const rect = btnRef.current?.getBoundingClientRect()
          if (rect) onOpen(rect)
        }}
        className="relative shrink-0 outline-none"
        style={{
          width: book.width,
          height: book.height,
          zIndex: hovered ? 40 : 1,
          perspective: 1400,
        }}
        aria-label={`${book.title}, directed by ${book.author}`}
      >
        <span
          className="absolute inset-0 block transition-transform duration-300 ease-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateY(${ry}deg) rotateZ(${lean}deg) translateZ(${pull + book.depth}px) translateY(${lift}px)`,
          }}
        >
          {/* case face: flat glossy plastic, sharp edges */}
          <span
            className="absolute inset-0 overflow-hidden shadow-[0_6px_16px_rgba(0,0,0,0.3)]"
            style={{ background: book.spine, backfaceVisibility: 'hidden' }}
          >
            {/* accent stripe (studio-label band) */}
            <span
              className="absolute inset-x-0 bottom-0 h-[14%]"
              style={{ background: book.band ?? book.ink }}
            />

            {/* title */}
            <span
              className={`absolute inset-x-0 top-[4%] bottom-[18%] flex items-center justify-center font-sans font-semibold ${vertical}`}
              style={{
                writingMode: 'vertical-rl',
                color: book.ink,
                fontSize: 10,
                letterSpacing: '0.02em',
                lineHeight: 1.1,
                padding: '0 1px',
              }}
            >
              {book.title.toUpperCase()}
            </span>

            {/* plastic gloss sheen */}
            <span
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(100deg, transparent 15%, rgba(255,255,255,0.16) 38%, rgba(255,255,255,0.03) 50%, transparent 70%)',
              }}
            />
            {/* edge bevel */}
            <span className="absolute inset-0 pointer-events-none shadow-[inset_1px_0_0_rgba(255,255,255,0.12),inset_-1px_0_0_rgba(0,0,0,0.4)]" />
          </span>

          {/* front cover (hinged) */}
          <span
            className="absolute top-0 bottom-0 overflow-hidden shadow-[2px_4px_14px_rgba(0,0,0,0.4)]"
            style={{
              left: '100%',
              width: COVER_W,
              transformOrigin: 'left center',
              transform: 'rotateY(90deg)',
              backgroundColor: book.spine,
            }}
          >
            {book.cover && (
              <img
                src={book.cover}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                draggable={false}
              />
            )}
          </span>
        </span>
      </button>

      {hovered &&
        cardPos &&
        createPortal(
          <div
            className="fixed z-[100] w-[248px] -translate-x-1/2 -translate-y-full animate-rise"
            style={{ left: cardPos.left, top: cardPos.top }}
            onMouseEnter={() => leaveTimer.current && clearTimeout(leaveTimer.current)}
          >
            <div className="rounded-lg border border-border bg-card/95 backdrop-blur-sm p-3 shadow-xl">
              <p className={`${faceFont.serif} text-[20px] leading-tight text-foreground`}>
                {book.title}
              </p>
              <p className="font-sans text-[15px] text-muted-foreground mt-0.5">
                Dir. {book.author}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[14px] uppercase tracking-wide text-muted-foreground">
                <span>{book.year}</span>
                {book.rating > 0 && (
                  <>
                    <span>·</span>
                    <span>{'★'.repeat(book.rating)}</span>
                  </>
                )}
              </div>
              {book.genres && book.genres.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {book.genres.map((g) => (
                    <span
                      key={g}
                      className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
