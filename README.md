# Your virtual library

A personal bookshelf: a horizontal, infinitely scrolling rail of real books rendered in 3D
with their actual cover art, spine colors sampled from each cover, hover metadata cards, a
pull-out detail view, client-side search, genre filters, and a "Recommend a book" flow.

Built with React, TypeScript, Tailwind CSS, and Vite. Book data is generated from a Goodreads
library export via Open Library's API.

## Development

```bash
npm install
npm run dev
```

## Regenerating your library

Export your library from Goodreads (**My Books → Import and export → Export Library**), then:

```bash
node scripts/import-books.mjs path/to/goodreads_library_export.csv
```

This overwrites `src/data/books.ts` with your real library, fetching cover art, blurbs, and
genre subjects from Open Library. Lookups are cached in `import/ol-cache.json` and
`import/blurb-cache.json` so re-running after a script tweak is fast.

## Build

```bash
npm run build
```
