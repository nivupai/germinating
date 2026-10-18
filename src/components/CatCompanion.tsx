import { useEffect, useState } from 'react'

type Pose = 'idle' | 'groom' | 'ear' | 'roll'

const SEQUENCE: { pose: Pose; duration: number }[] = [
  { pose: 'idle', duration: 3600 },
  { pose: 'groom', duration: 3200 },
  { pose: 'idle', duration: 2200 },
  { pose: 'ear', duration: 3000 },
  { pose: 'idle', duration: 2600 },
  { pose: 'roll', duration: 2600 },
  { pose: 'idle', duration: 3000 },
]

export function CatCompanion() {
  const [step, setStep] = useState(0)
  const pose = SEQUENCE[step % SEQUENCE.length].pose

  useEffect(() => {
    const t = setTimeout(
      () => setStep((s) => s + 1),
      SEQUENCE[step % SEQUENCE.length].duration,
    )
    return () => clearTimeout(t)
  }, [step])

  return (
    <span
      className="inline-block align-middle ml-2 select-none"
      style={{ width: '1.6em', height: '1.6em' }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 100"
        className={`w-full h-full overflow-visible ${pose === 'roll' ? 'cat-roll' : 'cat-breathe'}`}
      >
        <g style={{ transformOrigin: '50px 62px' }}>
          {/* tail */}
          <path
            d="M 72 64 Q 94 60 90 38 Q 88 26 76 28"
            fill="none"
            stroke="#c7c9cc"
            strokeWidth="8"
            strokeLinecap="round"
            className="cat-tail"
            style={{ transformOrigin: '72px 64px' }}
          />

          {/* body */}
          <ellipse cx="46" cy="64" rx="26" ry="19" fill="#f7f7f5" stroke="#d8d9d6" strokeWidth="1.5" />
          {/* grey back patch */}
          <path d="M 28 54 Q 46 42 64 52 Q 58 46 42 46 Q 30 47 28 54 Z" fill="#b9bcc0" opacity="0.9" />

          {/* back paws (ground contact) */}
          <ellipse cx="30" cy="80" rx="7" ry="4.5" fill="#f0f0ee" stroke="#d8d9d6" strokeWidth="1" />
          <ellipse cx="60" cy="81" rx="7" ry="4.5" fill="#eceae8" stroke="#d8d9d6" strokeWidth="1" />

          {/* head */}
          <g style={{ transformOrigin: '28px 48px' }}>
            <circle cx="28" cy="48" r="16" fill="#fafaf8" stroke="#d8d9d6" strokeWidth="1.5" />
            {/* ears */}
            <path d="M 16 38 L 12 24 L 24 34 Z" fill="#fafaf8" stroke="#d8d9d6" strokeWidth="1.5" />
            <path d="M 16 38 L 13 27 L 22 35 Z" fill="#dfc9c9" opacity="0.55" />
            <g
              className={pose === 'ear' ? 'cat-ear-wiggle' : ''}
              style={{ transformOrigin: '38px 34px' }}
            >
              <path d="M 38 36 L 42 22 L 29 33 Z" fill="#eceae8" stroke="#d8d9d6" strokeWidth="1.5" />
              <path d="M 38 36 L 40 25 L 31 33 Z" fill="#dfc9c9" opacity="0.55" />
            </g>
            {/* grey patch over one eye */}
            <path d="M 14 40 Q 22 32 32 38 Q 26 36 18 39 Q 15 40 14 40 Z" fill="#b9bcc0" />
            {/* eyes */}
            <path d="M 20 48 Q 22 46 24 48" stroke="#3a3632" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M 30 48 Q 32 46 34 48" stroke="#3a3632" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            {/* nose + mouth */}
            <path d="M 27 53 L 29 53 L 28 55 Z" fill="#d79a9a" />
            <path d="M 28 55 Q 26 58 23 57" stroke="#3a3632" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M 28 55 Q 30 58 33 57" stroke="#3a3632" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            {/* whiskers */}
            <path d="M 10 46 L 1 44 M 10 49 L 1 50 M 44 46 L 53 44 M 44 49 L 53 50" stroke="#c9c9c6" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
          </g>

          {/* front paw (animated: groom or ear) */}
          <g
            className={
              pose === 'groom' ? 'cat-paw-groom' : pose === 'ear' ? 'cat-paw-ear' : ''
            }
            style={{ transformOrigin: '38px 66px' }}
          >
            <ellipse cx="38" cy="66" rx="6.5" ry="13" fill="#fcfcfa" stroke="#d8d9d6" strokeWidth="1.5" />
          </g>
          {/* other front paw, stays planted unless rolling */}
          <ellipse cx="52" cy="78" rx="7" ry="4.5" fill="#f7f7f5" stroke="#d8d9d6" strokeWidth="1" />
        </g>
      </svg>
    </span>
  )
}
