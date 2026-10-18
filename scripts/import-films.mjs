// Regenerates src/data/films.ts from a Letterboxd data export (watched.csv,
// diary.csv, reviews.csv). Scrapes poster art, director, synopsis and genres
// directly from each film's Letterboxd page (no API key needed).
// Usage: node scripts/import-films.mjs <path-to-letterboxd-export-folder>
import fs from 'node:fs'
import path from 'node:path'
import Papa from 'papaparse'

const dir = process.argv[2]
if (!dir) {
  console.error('Usage: node scripts/import-films.mjs <path-to-letterboxd-export-folder>')
  process.exit(1)
}

function readCsv(file) {
  const p = path.join(dir, file)
  if (!fs.existsSync(p)) return []
  return Papa.parse(fs.readFileSync(p, 'utf-8'), { header: true, skipEmptyLines: true }).data
}

const watched = readCsv('watched.csv')
const diary = readCsv('diary.csv')
const reviews = readCsv('reviews.csv')

console.log(`Found ${watched.length} watched films.`)

function monthYear(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// most recent diary entry per URI (by Watched Date, falling back to Date)
const diaryByUri = new Map()
for (const row of diary) {
  const uri = row['Letterboxd URI']
  if (!uri) continue
  const when = row['Watched Date'] || row['Date']
  const existing = diaryByUri.get(uri)
  if (!existing || new Date(when) > new Date(existing._when)) {
    diaryByUri.set(uri, { ...row, _when: when })
  }
}

const reviewByUri = new Map()
for (const row of reviews) {
  const uri = row['Letterboxd URI']
  if (uri && row.Review) reviewByUri.set(uri, row.Review)
}

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

const PALETTE_FALLBACKS = [
  ['#1a1a2e', '#533483'],
  ['#2d132c', '#801336'],
  ['#0f3057', '#00587a'],
  ['#3d0c02', '#a0522d'],
  ['#1b2a21', '#4e6b4f'],
  ['#2c2c2c', '#6c6c6c'],
]
function luminance([r, g, b]) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}
function hexToRgb(hex) {
  const m = hex.replace('#', '')
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)]
}

const GENRE_MAP = {
  comedy: 'Fiction',
  drama: 'Fiction',
  thriller: 'Mystery & Thriller',
  mystery: 'Mystery & Thriller',
  crime: 'Mystery & Thriller',
  horror: 'Mystery & Thriller',
  romance: 'Romance',
  fantasy: 'Fantasy',
  'science-fiction': 'Sci-Fi',
  documentary: 'Nonfiction',
  history: 'Nonfiction',
  war: 'Nonfiction',
  music: 'Nonfiction',
  animation: 'Fiction',
  family: 'Fiction',
  adventure: 'Fiction',
  action: 'Fiction',
  western: 'Fiction',
  'tv-movie': 'Fiction',
}

const CACHE_PATH = path.join(process.cwd(), 'import/letterboxd/lb-cache.json')
let cache = {}
try {
  cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'))
} catch {
  cache = {}
}
function saveCache() {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache))
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function scrapeFilm(uri) {
  if (cache[uri] !== undefined) return cache[uri]
  try {
    const res = await fetch(uri, { redirect: 'follow' })
    const html = await res.text()
    const finalUrl = res.url

    const titleMatch = html.match(/<title>([^<]*)<\/title>/)
    const titleTag = titleMatch ? titleMatch[1].replace(/&lrm;/g, '').trim() : ''
    const directorMatch = titleTag.match(/directed by (.+?)(?: •|$)/i)
    const director = directorMatch ? directorMatch[1].trim() : ''

    const imgMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
    const cover = imgMatch ? imgMatch[1] : ''

    const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/)
    const synopsis = descMatch
      ? descMatch[1]
          .replace(/&#039;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
      : ''

    const genreMatches = [...html.matchAll(/\/films\/genre\/([a-z-]+)\//g)].map((m) => m[1])
    const genres = Array.from(new Set(genreMatches))

    const result = { finalUrl, director, cover, synopsis, genres }
    cache[uri] = result
    return result
  } catch (e) {
    console.warn(`  scrape failed for ${uri}: ${e.message}`)
    cache[uri] = null
    return null
  }
}

const films = []
let i = 0
for (const row of watched) {
  i++
  const uri = row['Letterboxd URI']
  const title = row['Name']?.trim() || 'Untitled'
  const year = Number(row['Year']) || 0

  process.stdout.write(`[${i}/${watched.length}] ${title}... `)
  const scraped = await scrapeFilm(uri)

  const diaryEntry = diaryByUri.get(uri)
  const finishedRaw = diaryEntry?._when || row['Date']
  const finished = monthYear(finishedRaw)
  const personalNote = reviewByUri.get(uri)

  const id = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40).replace(/-+$/, '')}-${i}`
  const seed = hashKey(uri || id)
  const rng = rngFrom(seed)

  const binding = rng() < 0.5 ? 'paperback' : 'hardcover'
  const finish = rng() < 0.5 ? 'gloss' : 'matte'
  const height = Math.round(214 + rng() * 30)
  const width = Math.max(16, Math.min(40, Math.round(18 + rng() * 14)))
  const lean = Math.round(rng() * -5 * 10) / 10
  const depth = Math.round((rng() * 14 - 7) * 10) / 10
  const wear = Math.round(rng() * 0.3 * 100) / 100
  const face = rng() < 0.6 ? 'sans' : rng() < 0.85 ? 'serif' : 'mono'
  const caps = rng() < 0.5

  const fallback = PALETTE_FALLBACKS[seed % PALETTE_FALLBACKS.length]
  const spine = fallback[0]
  const band = fallback[1]
  const ink = luminance(hexToRgb(spine)) > 0.55 ? '#241f19' : '#faf7f0'

  const genres = Array.from(
    new Set((scraped?.genres ?? []).map((g) => GENRE_MAP[g]).filter(Boolean)),
  ).slice(0, 2)
  if (genres.length === 0) genres.push('Fiction')

  films.push({
    id,
    title,
    author: scraped?.director || 'Unknown director',
    genres,
    cover: scraped?.cover || '',
    year,
    blurb: personalNote || scraped?.synopsis || `${title} (${year}).`,
    rating: 0,
    finished,
    publisher: '',
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
  console.log(scraped?.cover ? 'ok' : 'no poster')
  if (i % 20 === 0) saveCache()
  await sleep(40)
}
saveCache()

films.sort((a, b) => {
  const da = a.finished ? new Date(a.finished).getTime() : 0
  const db = b.finished ? new Date(b.finished).getTime() : 0
  return db - da
})

const header = `// Generated by scripts/import-films.mjs from a Letterboxd export.
import type { Book } from './books'

export const films: Book[] = `

const out = header + JSON.stringify(films, null, 2) + '\n'
const outPath = path.join(process.cwd(), 'src/data/films.ts')
fs.writeFileSync(outPath, out)
console.log(`\nWrote ${films.length} films to ${outPath}`)
