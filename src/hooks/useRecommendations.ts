import { useEffect, useState } from 'react'
import type { Book } from '../data/books'
import { buildBook, type OpenLibraryResult } from '../lib/openLibrary'

const STORAGE_KEY = 'library.recommendations.v1'

type RecommendInput = {
  result: OpenLibraryResult
  recommender: string
  note: string
}

function load(): Book[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(books: Book[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books))
  } catch {
    // ignore
  }
}

export function useRecommendations() {
  const [recommendations, setRecommendations] = useState<Book[]>([])
  const [justAdded, setJustAdded] = useState<string | null>(null)

  useEffect(() => {
    setRecommendations(load())
  }, [])

  const recommend = async (input: RecommendInput) => {
    const physical = await buildBook(input.result)
    const book: Book = {
      ...physical,
      id: `rec-${input.result.key.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`,
      blurb: input.note || `Recommended because it's great.`,
      finished: '',
      recommender: input.recommender,
      rating: 0,
    }
    setRecommendations((prev) => {
      const next = [book, ...prev]
      save(next)
      return next
    })
    setJustAdded(book.id)
    setTimeout(() => setJustAdded(null), 1400)
    return book
  }

  return { recommendations, recommend, justAdded }
}
