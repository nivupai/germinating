import { useEffect, useMemo, useRef, useState } from 'react'
import type { Book } from '../data/books'
import { BookSpine } from './BookSpine'

type Props = {
  books: Book[]
  justAdded?: string | null
  onOpen: (book: Book, rect: DOMRect) => void
}

const SEGMENT_THRESHOLD = 2600
const GAP = 2
const RENDER_BUFFER = 1200

export function Shelf({ books, justAdded, onOpen }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [rys, setRys] = useState<number[]>([])
  const [overflowing, setOverflowing] = useState(true)
  const [range, setRange] = useState<[number, number]>([0, 0])
  const dragging = useRef(false)
  const dragStartX = useRef(0)
  const dragScrollLeft = useRef(0)
  const justCopiedOnce = useRef(false)
  const rafId = useRef<number | null>(null)

  const estWidth = books.reduce((sum, b) => sum + b.width + GAP, 0)
  const copies = estWidth > SEGMENT_THRESHOLD ? 3 : 1
  const list = copies === 3 ? [...books, ...books, ...books] : books

  // cumulative left offset (within the row, before container padding) + total width
  const { offsets, totalWidth } = useMemo(() => {
    const offs: number[] = []
    let x = 0
    for (const book of list) {
      offs.push(x)
      x += book.width + GAP
    }
    return { offsets: offs, totalWidth: x }
  }, [list])

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
    justCopiedOnce.current = false
  }, [list])

  useEffect(() => {
    if (copies === 3 && scrollRef.current && !justCopiedOnce.current) {
      scrollRef.current.scrollLeft = totalWidth / 3
      justCopiedOnce.current = true
    }
  }, [copies, totalWidth])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const update = () => {
      rafId.current = null
      const scrollLeft = el.scrollLeft
      const clientWidth = el.clientWidth

      // wrap for seamless infinite loop
      if (copies === 3) {
        const seg = totalWidth / 3
        if (scrollLeft < seg * 0.5) {
          el.scrollLeft += seg
          return
        }
        if (scrollLeft > seg * 1.5) {
          el.scrollLeft -= seg
          return
        }
      }

      const lo = scrollLeft - RENDER_BUFFER
      const hi = scrollLeft + clientWidth + RENDER_BUFFER
      let start = 0
      let end = offsets.length
      for (let i = 0; i < offsets.length; i++) {
        if (offsets[i] + list[i].width >= lo) {
          start = i
          break
        }
      }
      for (let i = start; i < offsets.length; i++) {
        if (offsets[i] > hi) {
          end = i
          break
        }
      }
      setRange([start, end])

      const center = scrollLeft + clientWidth / 2
      const next: number[] = []
      for (let i = start; i < end; i++) {
        const itemCenter = offsets[i] + list[i].width / 2
        const dist = (itemCenter - center) / (clientWidth / 2)
        const clamped = Math.max(-1, Math.min(1, dist))
        const eased = Math.sign(clamped) * Math.pow(Math.abs(clamped), 1.35)
        next[i] = eased * 34
      }
      setRys(next)
    }

    const onScroll = () => {
      if (rafId.current != null) return
      rafId.current = requestAnimationFrame(update)
    }

    update()
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (rafId.current != null) cancelAnimationFrame(rafId.current)
    }
  }, [copies, totalWidth, offsets, list])

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
    const idx = list.findIndex((b) => b.id === justAdded)
    if (idx === -1) return
    const itemCenter = offsets[idx] + list[idx].width / 2
    el.scrollTo({ left: itemCenter - el.clientWidth / 2, behavior: 'smooth' })
  }, [justAdded, list, offsets])

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
        <div className="flex items-end gap-[2px] pt-16 pb-6 px-6">
          {list.map((book, i) => {
            const inRange = i >= range[0] && i < range[1]
            return (
              <div
                key={`${book.id}-${i}`}
                data-id={book.id}
                className={justAdded === book.id ? 'animate-shelve-in' : ''}
                style={{
                  '--spine-w': `${book.width}px`,
                  width: book.width,
                  height: inRange ? undefined : book.height,
                  flexShrink: 0,
                } as React.CSSProperties}
              >
                {inRange && (
                  <BookSpine book={book} ry={rys[i] ?? 0} onOpen={(rect) => onOpen(book, rect)} />
                )}
              </div>
            )
          })}
        </div>
      </div>
      <div className="h-px mx-auto max-w-4xl bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="h-6 mx-auto max-w-5xl bg-gradient-to-b from-foreground/8 to-transparent blur-sm" />
    </div>
  )
}
