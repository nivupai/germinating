import type { Book } from '../data/books'

export type OpenLibraryResult = {
  key: string
  title: string
  author: string
  year?: number
  cover?: string
  pages?: number
  publisher?: string
}

export async function searchBooks(q: string, signal?: AbortSignal): Promise<OpenLibraryResult[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=12&fields=key,title,author_name,first_publish_year,cover_i,number_of_pages_median,publisher`
  const res = await fetch(url, { signal })
  const json = await res.json()
  return (json.docs ?? [])
    .filter((d: any) => d.title && d.cover_i)
    .map((d: any) => ({
      key: d.key,
      title: d.title,
      author: d.author_name?.[0] ?? 'Unknown',
      year: d.first_publish_year,
      cover: `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`,
      pages: d.number_of_pages_median,
      publisher: d.publisher?.[0],
    }))
}

function hashKey(key: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = (h * 0x01000193) >>> 0
  }
  return h >>> 0
}

function rngFrom(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

const FALLBACK_PALETTES: [string, string][] = [
  ['#4c2215', '#7e5741'],
  ['#2f3b2a', '#5c7a4f'],
  ['#223344', '#4f7398'],
  ['#3a2440', '#7a5a95'],
  ['#4a3220', '#a06b3a'],
  ['#263238', '#546e7a'],
]

function luminance(r: number, g: number, b: number) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}
function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '')
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)]
}

export async function readCoverPalette(src: string): Promise<{ spine: string; band: string; ink: string }> {
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const loaded = await new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
    const w = 80
    const h = Math.round((loaded.height / loaded.width) * w) || 80
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no ctx')
    ctx.drawImage(loaded, 0, 0, w, h)
    const edgeW = Math.max(1, Math.round(w * 0.06))
    const edge = ctx.getImageData(0, 0, edgeW, h).data

    let r = 0, g = 0, b = 0, n = 0
    let bestSat = -1
    let bandR = 0, bandG = 0, bandB = 0

    const full = ctx.getImageData(0, 0, w, h).data
    for (let i = 0; i < edge.length; i += 4) {
      r += edge[i]; g += edge[i + 1]; b += edge[i + 2]; n++
    }
    r = r / n; g = g / n; b = b / n

    for (let i = 0; i < full.length; i += 4) {
      const pr = full[i], pg = full[i + 1], pb = full[i + 2]
      const max = Math.max(pr, pg, pb), min = Math.min(pr, pg, pb)
      const lum = (max + min) / 2 / 255
      const sat = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255))
      if (lum > 0.25 && lum < 0.8 && sat > bestSat) {
        bestSat = sat
        bandR = pr; bandG = pg; bandB = pb
      }
    }

    const toHex = (v: number) => Math.round(v).toString(16).padStart(2, '0')
    const spine = `#${toHex(r)}${toHex(g)}${toHex(b)}`
    const band = bestSat >= 0 ? `#${toHex(bandR)}${toHex(bandG)}${toHex(bandB)}` : spine
    const ink = luminance(r, g, b) > 0.55 ? '#241f19' : '#faf7f0'
    return { spine, band, ink }
  } catch {
    const idx = Math.floor(Math.random() * FALLBACK_PALETTES.length)
    const [spine, band] = FALLBACK_PALETTES[idx]
    const [r, g, b] = hexToRgb(spine)
    return { spine, band, ink: luminance(r, g, b) > 0.55 ? '#241f19' : '#faf7f0' }
  }
}

export async function buildBook(result: OpenLibraryResult): Promise<Omit<Book, 'id' | 'recommender' | 'blurb' | 'finished'>> {
  const seed = hashKey(result.key)
  const rng = rngFrom(seed)
  const pages = result.pages || 280
  const binding: Book['binding'] = pages > 420 ? 'hardcover' : pages < 260 ? 'mass' : 'paperback'
  const finish: Book['finish'] = binding === 'hardcover' ? 'cloth' : rng() < 0.5 ? 'gloss' : 'matte'
  const height =
    binding === 'hardcover'
      ? Math.round(236 + rng() * 18)
      : binding === 'mass'
        ? Math.round(196 + rng() * 14)
        : Math.round(214 + rng() * 16)
  const width = Math.max(16, Math.min(58, Math.round(pages * 0.055 + (rng() * 6 - 3))))
  const lean = Math.round(rng() * -5 * 10) / 10
  const depth = Math.round((rng() * 14 - 7) * 10) / 10
  const wear = Math.round(rng() * 0.35 * 100) / 100
  const face: Book['face'] = rng() < 0.7 ? 'serif' : rng() < 0.85 ? 'sans' : 'mono'
  const caps = rng() < 0.3

  const palette = result.cover
    ? await readCoverPalette(result.cover)
    : (() => {
        const [spine, band] = FALLBACK_PALETTES[seed % FALLBACK_PALETTES.length]
        const [r, g, b] = hexToRgb(spine)
        return { spine, band, ink: luminance(r, g, b) > 0.55 ? '#241f19' : '#faf7f0' }
      })()

  return {
    title: result.title,
    author: result.author,
    cover: result.cover ?? '',
    year: result.year ?? new Date().getFullYear(),
    rating: 0,
    publisher: result.publisher ?? '',
    binding,
    finish,
    spine: palette.spine,
    band: palette.band,
    ink: palette.ink,
    face,
    caps,
    width,
    height,
    lean,
    depth,
    wear,
  }
}
