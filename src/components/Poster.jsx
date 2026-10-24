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

  const genre = movie.genres?.[0]
  const [c1, c2] = genreColors(genre)
  const background =
    `linear-gradient(to top, rgba(0,0,0,.55), transparent 60%), linear-gradient(160deg, ${c1}, ${c2})`

  return (
    <div className={`${className} poster-gen`} style={{ background }}>
      <span className="poster-gen-title">{displayTitle(movie)}</span>
      <span className="poster-gen-meta">
        {movie.release_year ?? ''}{genre ? ` · ${genreRu(genre)}` : ''}
      </span>
    </div>
  )
}