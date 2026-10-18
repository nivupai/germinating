import { useEffect, useRef, useState } from 'react'
import type { Book } from '../data/books'
import { BookSpine } from './BookSpine'

type Props = {
  books: Book[]
  justAdded?: string | null
  onOpen: (book: Book, rect: DOMRect) => void
}

const SEGMENT_THRESHOLD = 2600

export function Shelf({ books, justAdded, onOpen }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const [rys, setRys] = useState<number[]>([])
  const [overflowing, setOverflowing] = useState(true)
  const dragging = useRef(false)
  const dragStartX = useRef(0)
  const dragScrollLeft = useRef(0)
  const justCopiedOnce = useRef(false)

  const estWidth = books.reduce((sum, b) => sum + b.width + 2, 0)
  const copies = estWidth > SEGMENT_THRESHOLD ? 3 : 1
  const list = copies === 3 ? [...books, ...books, ...books] : books

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setOverflowing(el.scrollWidth > el.clientWidth + 4)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [books])

  useEffect(() => {
    if (copies === 3 && scrollRef.current && !justCopiedOnce.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth / 3
      justCopiedOnce.current = true
    }
  }, [copies, books])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const updateCurve = () => {
      const rect = el.getBoundingClientRect()
      const center = rect.left + rect.width / 2
      const spines = Array.from(el.querySelectorAll<HTMLElement>('[data-spine]'))
      const next = spines.map((s) => {
        const r = s.getBoundingClientRect()
        const sCenter = r.left + r.width / 2
        const dist = (sCenter - center) / (rect.width / 2)
        const clamped = Math.max(-1, Math.min(1, dist))
        const eased = Math.sign(clamped) * Math.pow(Math.abs(clamped), 1.35)
        return eased * 34
      })
      setRys(next)

      if (copies === 3) {
        const seg = el.scrollWidth / 3
        if (el.scrollLeft < seg * 0.5) el.scrollLeft += seg
        else if (el.scrollLeft > seg * 1.5) el.scrollLeft -= seg
      }
    }

    updateCurve()
    el.addEventListener('scroll', updateCurve, { passive: true })
    window.addEventListener('resize', updateCurve)
    return () => {
      el.removeEventListener('scroll', updateCurve)
      window.removeEventListener('resize', updateCurve)
    }
  }, [copies, list.length])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault()
        el.scrollLeft += e.deltaY
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    if (!justAdded) return
    const el = scrollRef.current
    if (!el) return
    const target = el.querySelector<HTMLElement>(`[data-id="${justAdded}"]`)
    target?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
  }, [justAdded])

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true
    dragStartX.current = e.clientX
    dragScrollLeft.current = scrollRef.current?.scrollLeft ?? 0
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !scrollRef.current) return
    scrollRef.current.scrollLeft = dragScrollLeft.current - (e.clientX - dragStartX.current)
  }
  const endDrag = () => {
    dragging.current = false
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!scrollRef.current) return
    if (e.key === 'ArrowLeft') scrollRef.current.scrollLeft -= 320
    if (e.key === 'ArrowRight') scrollRef.current.scrollLeft += 320
  }

  if (books.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 font-sans text-muted-foreground">
        No books match.
      </div>
    )
  }

  return (
    <div className="relative">
      {overflowing && (
        <>
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-background to-transparent" />
        </>
      )}
      <div
        ref={scrollRef}
        role="list"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onKeyDown={onKeyDown}
        className={`no-scrollbar overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing outline-none ${
          overflowing ? '' : 'flex justify-center'
        }`}
        style={{ perspective: 1400, perspectiveOrigin: '50% 65%' }}
      >
        <div ref={rowRef} className="flex items-end gap-[2px] pt-16 pb-6 px-6">
          {list.map((book, i) => (
            <div
              key={`${book.id}-${i}`}
              data-spine
              data-id={book.id}
              className={justAdded === book.id ? 'animate-shelve-in' : ''}
              style={{ '--spine-w': `${book.width}px` } as React.CSSProperties}
            >
              <BookSpine book={book} ry={rys[i] ?? 0} onOpen={(rect) => onOpen(book, rect)} />
            </div>
          ))}
        </div>
      </div>
      <div className="h-px mx-auto max-w-4xl bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="h-6 mx-auto max-w-5xl bg-gradient-to-b from-foreground/8 to-transparent blur-sm" />
    </div>
  )
}
