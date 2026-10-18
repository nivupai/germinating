// Regenerates src/data/books.ts from a Goodreads export CSV.
// Usage: node scripts/import-books.mjs <path-to-goodreads_library_export.csv>
import fs from 'node:fs'
import path from 'node:path'
import Papa from 'papaparse'

const GENRES = ['Fiction', 'Nonfiction', 'Sci-Fi', 'Mystery & Thriller', 'Fantasy', 'Romance']

const csvPath = process.argv[2]
if (!csvPath) {
  console.error('Usage: node scripts/import-books.mjs <path-to-csv>')
  process.exit(1)
}

const raw = fs.readFileSync(csvPath, 'utf-8')
const parsed = Papa.parse(raw, { header: true, skipEmptyLines: true })
const rows = parsed.data.filter(
  (r) => r['Exclusive Shelf'] === 'read' || r['Exclusive Shelf'] === 'currently-reading',
)

console.log(`Found ${rows.length} read / currently-reading rows.`)

function cleanIsbn(v) {
  if (!v) return ''
  return v.replace(/^="?/, '').replace(/"$/, '').trim()
}

function monthYear(dateStr) {
  if (!dateStr) return ''
  const [y, m] = dateStr.split('/')
  if (!y || !m) return ''
  const d = new Date(Number(y), Number(m) - 1)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// FNV-1a hash -> deterministic 0..1 stream per book
function hashKey(key) {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = (h * 0x01000193) >>> 0
  }
  return h
}
function rngFrom(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

const SUBJECT_RULES = [
  [/science.fiction|dystopia|space opera|time travel/i, 'Sci-Fi'],
  [/fantasy|magic|dragons|wizards|faeries|fairies/i, 'Fantasy'],
  [/mystery|detective|thriller|crime|noir|suspense|murder/i, 'Mystery & Thriller'],
  [/romance|love stories/i, 'Romance'],
  [/horror|occult/i, 'Mystery & Thriller'],
  [
    /biograph|memoir|essay|histor|philosoph|psycholog|self.help|politic|science(?!.fiction)|true.crime|journalism|nonfiction|non.fiction|economics|sociology|religion|business/i,
    'Nonfiction',
  ],
  [/fiction/i, 'Fiction'],
]

function guessGenres(bookshelves, subjects) {
  const tags = (bookshelves || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const out = new Set()
  for (const t of tags) {
    if (t === 'fiction') out.add('Fiction')
    if (t === 'nonfiction' || t === 'non-fiction') out.add('Nonfiction')
    if (t === 'fantasy') out.add('Fantasy')
    if (t === 'romance') out.add('Romance')
    if (t === 'sci-fi' || t === 'science-fiction') out.add('Sci-Fi')
    if (t === 'mystery' || t === 'thriller') out.add('Mystery & Thriller')
  }

  const subjText = (subjects || []).join(' | ')
  for (const [re, genre] of SUBJECT_RULES) {
    if (re.test(subjText)) {
      out.add(genre)
      if (out.size >= 1) break
    }
  }

  if (out.size === 0) out.add('Fiction')
  return Array.from(out).slice(0, 2)
}

function hexToRgb(hex) {
  const m = hex.replace('#', '')
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)]
}
function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
  )
}
function luminance([r, g, b]) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

const PALETTE_FALLBACKS = [
  ['#4c2215', '#7e5741'],
  ['#2f3b2a', '#5c7a4f'],
  ['#223344', '#4f7398'],
  ['#3a2440', '#7a5a95'],
  ['#4a3220', '#a06b3a'],
  ['#263238', '#546e7a'],
]

const OL_FIELDS = 'key,title,author_name,first_publish_year,cover_i,number_of_pages_median,publisher,subject'

const CACHE_PATH = path.join(process.cwd(), 'import/ol-cache.json')
let cache = {}
try {
  cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'))
} catch {
  cache = {}
}
function saveCache() {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache))
}

async function fetchOpenLibrary(isbn, title, author) {
  const cacheKey = isbn || `${title}::${author}`
  if (cache[cacheKey] !== undefined) return cache[cacheKey]
  try {
    if (isbn) {
      const url = `https://openlibrary.org/search.json?q=isbn:${isbn}&limit=1&fields=${OL_FIELDS}`
      const res = await fetch(url)
      const json = await res.json()
      if (json.docs && json.docs[0]) {
        cache[cacheKey] = json.docs[0]
        return json.docs[0]
      }
    }
    const q = encodeURIComponent(`${title} ${author}`)
    const url = `https://openlibrary.org/search.json?q=${q}&limit=1&fields=${OL_FIELDS}`
    const res = await fetch(url)
    const json = await res.json()
    if (json.docs && json.docs[0]) {
      cache[cacheKey] = json.docs[0]
      return json.docs[0]
    }
  } catch (e) {
    console.warn(`  lookup failed for "${title}": ${e.message}`)
  }
  cache[cacheKey] = null
  return null
}

const BLURB_CACHE_PATH = path.join(process.cwd(), 'import/blurb-cache.json')
let blurbCache = {}
try {
  blurbCache = JSON.parse(fs.readFileSync(BLURB_CACHE_PATH, 'utf-8'))
} catch {
  blurbCache = {}
}
function saveBlurbCache() {
  fs.writeFileSync(BLURB_CACHE_PATH, JSON.stringify(blurbCache))
}
async function fetchBlurb(workKey) {
  if (!workKey) return ''
  if (blurbCache[workKey] !== undefined) return blurbCache[workKey]
  try {
    const res = await fetch(`https://openlibrary.org${workKey}.json`)
    const json = await res.json()
    const d = json.description
    if (!d) {
      blurbCache[workKey] = ''
      return ''
    }
    const text = typeof d === 'string' ? d : d.value
    const out = text.replace(/\s+/g, ' ').trim().slice(0, 400)
    blurbCache[workKey] = out
    return out
  } catch {
    return ''
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

const books = []
let i = 0
for (const row of rows) {
  i++
  const title = row['Title']?.trim() || 'Untitled'
  const author = row['Author']?.trim() || 'Unknown'
  const isbn = cleanIsbn(row['ISBN13']) || cleanIsbn(row['ISBN'])
  const pages = Number(row['Number of Pages']) || 0
  const rating = Number(row['My Rating']) || 0
  const publisherCsv = row['Publisher']?.trim() || ''
  const yearCsv = Number(row['Original Publication Year']) || Number(row['Year Published']) || 0
  const finished = monthYear(row['Date Read']) || monthYear(row['Date Added'])

  process.stdout.write(`[${i}/${rows.length}] ${title}... `)
  const ol = await fetchOpenLibrary(isbn, title, author)
  let cover = ''
  let blurb = ''
  let year = yearCsv
  let publisher = publisherCsv
  let olPages = pages

  if (ol) {
    if (ol.cover_i) cover = `https://covers.openlibrary.org/b/id/${ol.cover_i}-L.jpg`
    if (ol.first_publish_year) year = ol.first_publish_year
    if (!publisher && ol.publisher?.[0]) publisher = ol.publisher[0]
    if (!olPages && ol.number_of_pages_median) olPages = ol.number_of_pages_median
    blurb = await fetchBlurb(ol.key)
  }
  if (!blurb) blurb = `${title} by ${author}.`

  const id = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40).replace(/-+$/, '')}-${i}`
  const seed = hashKey(ol?.key || id)
  const rng = rngFrom(seed)

  const effPages = olPages || 280
  const binding = effPages > 420 ? 'hardcover' : effPages < 260 ? 'mass' : 'paperback'
  const finish = binding === 'hardcover' ? 'cloth' : rng() < 0.5 ? 'gloss' : 'matte'
  const height =
    binding === 'hardcover'
      ? Math.round(236 + rng() * 18)
      : binding === 'mass'
        ? Math.round(196 + rng() * 14)
        : Math.round(214 + rng() * 16)
  const width = Math.max(16, Math.min(58, Math.round(effPages * 0.055 + (rng() * 6 - 3))))
  const lean = Math.round((rng() * -5) * 10) / 10
  const depth = Math.round((rng() * 14 - 7) * 10) / 10
  const wear = Math.round(rng() * 0.35 * 100) / 100
  const face = rng() < 0.7 ? 'serif' : rng() < 0.85 ? 'sans' : 'mono'
  const caps = rng() < 0.3

  const fallback = PALETTE_FALLBACKS[seed % PALETTE_FALLBACKS.length]
  const spine = fallback[0]
  const band = fallback[1]
  const ink = luminance(hexToRgb(spine)) > 0.55 ? '#241f19' : '#faf7f0'

  books.push({
    id,
    title,
    author,
    genres: guessGenres(row['Bookshelves'], ol?.subject),
    cover,
    year: year || 2000,
    blurb,
    rating,
    finished: finished || '',
    publisher: publisher || '',
    binding,
    finish,
    spine,
    band,
    ink,
    face,
    caps,
    width,
    height,
    lean,
    depth,
    wear,
  })
  console.log(cover ? 'ok' : 'no cover')
  if (i % 20 === 0) {
    saveCache()
    saveBlurbCache()
  }
  await sleep(20)
}
saveCache()
saveBlurbCache()

// newest finished date first
function parseFinished(f) {
  if (!f) return 0
  const d = new Date(f)
  return isNaN(d.getTime()) ? 0 : d.getTime()
}
books.sort((a, b) => parseFinished(b.finished) - parseFinished(a.finished))

const header = `// Generated by scripts/import-books.mjs from a Goodreads export.
export type Book = {
  id: string
  title: string
  author: string
  genres?: string[]
  cover: string
  year: number
  blurb: string
  rating: number
  finished: string
  recommender?: string
  publisher: string
  binding: 'hardcover' | 'paperback' | 'mass'
  finish: 'cloth' | 'gloss' | 'matte'
  spine: string
  band?: string
  ink: string
  face: 'serif' | 'sans' | 'mono'
  caps?: boolean
  width: number
  height: number
  lean: number
  depth: number
  wear: number
  spineImage?: string
}

export const books: Book[] = `

const out = header + JSON.stringify(books, null, 2) + '\n'
const outPath = path.join(process.cwd(), 'src/data/books.ts')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, out)
console.log(`\nWrote ${books.length} books to ${outPath}`)
