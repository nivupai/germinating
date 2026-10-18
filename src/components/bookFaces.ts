export const COVER_W = 178

export const faceFont: Record<'serif' | 'sans' | 'mono', string> = {
  serif: 'font-display',
  sans: 'font-sans',
  mono: 'font-mono',
}

export const finishSheen: Record<'cloth' | 'gloss' | 'matte', string> = {
  cloth: 'linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.05) 48%, transparent 66%)',
  gloss: 'linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.22) 45%, rgba(255,255,255,0.05) 55%, transparent 75%)',
  matte: 'linear-gradient(100deg, transparent 35%, rgba(255,255,255,0.03) 50%, transparent 65%)',
}
