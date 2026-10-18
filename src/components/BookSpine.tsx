import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Book } from '../data/books'
import { COVER_W, faceFont, finishSheen } from './bookFaces'

type Props = {
  book: Book
  ry: number
  onOpen: (rect: DOMRect) => void
}

export function BookSpine({ book, ry, onOpen }: Props) {
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
  const showAuthor = book.width >= 44
  const showPublisher = book.width >= 30 && book.publisher.length > 0

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
        aria-label={`${book.title} by ${book.author}`}
      >
        <span
          className="absolute inset-0 block transition-transform duration-300 ease-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateY(${ry}deg) rotateZ(${lean}deg) translateZ(${pull + book.depth}px) translateY(${lift}px)`,
          }}
        >
          {/* page block (top edge) */}
          <span
            className="absolute left-0 right-0 -top-1 h-2 rounded-t-[1px]"
            style={{
              background: '#f1ead9',
              transform: 'rotateX(78deg)',
              transformOrigin: 'bottom',
            }}
          />
          {book.binding === 'hardcover' && (
            <span
              className="absolute left-0 right-0 top-0 h-[3px]"
              style={{
                background: `repeating-linear-gradient(90deg, ${book.band ?? book.spine} 0 3px, #f1ead9 3px 6px)`,
              }}
            />
          )}

          {/* spine face */}
          <span
            className="absolute inset-0 overflow-hidden rounded-[1px] shadow-[0_6px_18px_rgba(0,0,0,0.25)]"
            style={{ background: book.spine, backfaceVisibility: 'hidden' }}
          >
            {/* head/foot rules */}
            <span
              className="absolute left-0 right-0 top-[8%] h-[2px] opacity-70"
              style={{ background: book.band ?? book.ink }}
            />
            <span
              className="absolute left-0 right-0 bottom-[10%] h-[2px] opacity-70"
              style={{ background: book.band ?? book.ink }}
            />

            {/* title */}
            <span
              className={`absolute inset-x-0 top-[14%] bottom-[22%] flex items-center justify-center ${faceFont[book.face]} ${vertical}`}
              style={{
                writingMode: 'vertical-rl',
                color: book.ink,
                fontSize: book.face === 'serif' ? 13 : 10,
                lineHeight: 1.15,
                padding: '0 2px',
              }}
            >
              {book.caps ? book.title.toUpperCase() : book.title}
            </span>

            {showAuthor && (
              <span
                className={`absolute right-[3px] top-[14%] bottom-[22%] flex items-center justify-center font-sans text-[9px] opacity-80`}
                style={{ writingMode: 'vertical-rl', color: book.ink }}
              >
                {book.author}
              </span>
            )}

            {showPublisher && (
              <span
                className="absolute inset-x-0 bottom-[3%] flex items-center justify-center font-mono text-[6px] uppercase tracking-widest opacity-60"
                style={{ color: book.ink }}
              >
                {book.publisher}
              </span>
            )}

            {/* material texture + sheen, drawn over lettering */}
            <span
              className="absolute inset-0 pointer-events-none"
              style={{ background: finishSheen[book.finish] }}
            />
            {/* edge wear */}
            <span
              className="absolute inset-0 pointer-events-none"
              style={{
                opacity: book.wear,
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, transparent 12%, transparent 88%, rgba(0,0,0,0.3) 100%)',
              }}
            />
            {/* inset highlight */}
            <span className="absolute inset-0 pointer-events-none shadow-[inset_1px_0_0_rgba(255,255,255,0.08),inset_-1px_0_0_rgba(0,0,0,0.25)]" />
          </span>

          {/* front cover (hinged) */}
          <span
            className="absolute top-0 bottom-0 overflow-hidden rounded-r-[2px] shadow-[2px_4px_14px_rgba(0,0,0,0.35)]"
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
              <p className="font-display text-[20px] leading-tight text-foreground">{book.title}</p>
              <p className="font-sans text-[15px] text-muted-foreground mt-0.5">{book.author}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[14px] uppercase tracking-wide text-muted-foreground">
                <span>{book.year}</span>
                <span>·</span>
                <span className="capitalize">{book.binding}</span>
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
