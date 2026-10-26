import { useState } from 'react'
import { displayTitle, genreRu } from '../services/moviesApi'

const PALETTE = {
  Action: ['#7f1d1d', '#ea580c'], Adventure: ['#064e3b', '#10b981'],
  Animation: ['#4c1d95', '#ec4899'], Children: ['#1e3a8a', '#38bdf8'],
  Comedy: ['#92400e', '#f59e0b'], Crime: ['#1f2937', '#6b7280'],
  Documentary: ['#134e4a', '#2dd4bf'], Drama: ['#312e81', '#818cf8'],
  Fantasy: ['#581c87', '#c084fc'], 'Film-Noir': ['#111827', '#4b5563'],
  Horror: ['#450a0a', '#b91c1c'], IMAX: ['#0c4a6e', '#0ea5e9'],
  Musical: ['#831843', '#f472b6'], Mystery: ['#1e1b4b', '#6366f1'],
  Romance: ['#9f1239', '#fb7185'], 'Sci-Fi': ['#0f172a', '#22d3ee'],
  Thriller: ['#27272a', '#a1a1aa'], War: ['#3f3f1e', '#a3a34a'],
  Western: ['#78350f', '#d97706'],
}

export const genreColors = (genre) => PALETTE[genre] ?? ['#1f2430', '#3b4256']

export default function Poster({ movie, className = '' }) {
  const [broken, setBroken] = useState(false)

  if (movie.poster_url && !broken) {
    return (
      <img className={className} src={movie.poster_url} alt={movie.title}
           loading="lazy" onError={() => setBroken(true)} />
    )
  }

  // нет обложки: рисуем свою, у каждого фильма немного разную
  const genre = movie.genres?.[0]
  const [c1, c2] = genreColors(genre)
  const id = Number(movie.movie_id) || 0
  const angle = 140 + ((id * 37) % 80)
  const x = 15 + ((id * 13) % 70)
  const y = 8 + ((id * 7) % 40)
  const title = displayTitle(movie)
  const letter = (title.match(/[\p{L}\p{N}]/u)?.[0] ?? '•').toUpperCase()
  const background =
    `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,.2), transparent 50%), ` +
    `linear-gradient(to top, rgba(8,9,14,.88), transparent 68%), ` +
    `linear-gradient(${angle}deg, ${c1}, ${c2})`

  return (
    <div className={`${className} poster-gen`} style={{ background }}>
      <span className="poster-gen-letter" aria-hidden="true">{letter}</span>
      <svg className="poster-gen-brand" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 8v8l6-4z" fill="currentColor" />
      </svg>
      <span className="poster-gen-title">{title}</span>
      <span className="poster-gen-meta">
        {movie.release_year ?? ''}{genre ? ` · ${genreRu(genre)}` : ''}
      </span>
    </div>
  )
}