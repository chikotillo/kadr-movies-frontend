import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getFeatured, displayTitle, genreRu, movieOverview } from '../services/moviesApi'
import Poster, { genreColors } from './Poster'

const cut = (t, n = 230) => (t && t.length > n ? t.slice(0, n).trimEnd() + '…' : t)

export default function FeaturedHero() {
  const [items, setItems] = useState(null)
  const [i, setI] = useState(0)

  useEffect(() => {
    getFeatured().then(setItems).catch(() => setItems([]))
  }, [])

  useEffect(() => {
    if (!items || items.length < 2) return
    const timer = setInterval(() => setI((x) => (x + 1) % items.length), 7000)
    return () => clearInterval(timer)
  }, [items])

  if (items === null) return <div className="skeleton feature-skeleton" />
  if (items.length === 0) return null

  const m = items[i]
  const [c1, c2] = genreColors(m.genres[0])
  const overview = cut(movieOverview(m))

  return (
    <section className="feature" style={{ '--c1': c1, '--c2': c2 }}>
      {m.poster_url && (
        <div className="feature-bg" key={`b${m.movie_id}`}
             style={{ backgroundImage: `url(${m.poster_url})` }} />
      )}

      <div className="feature-text" key={`t${m.movie_id}`}>
        <span className="eyebrow">Высоко оценено зрителями</span>
        <h1>{displayTitle(m)}</h1>
        <div className="feature-meta">
          <span className="feature-rating">★ {m.ml_avg_rating}</span>
          <span>{m.release_year ?? '—'}</span>
          <span>{m.genres.slice(0, 3).map(genreRu).join(', ')}</span>
        </div>
        {overview && <p className="overview">{overview}</p>}
        <div className="hero-actions">
          <Link to={`/movie/${m.movie_id}`} className="btn">Подробнее</Link>
          <Link to="/catalog" className="btn outline">Весь каталог</Link>
        </div>
      </div>

      <div className="feature-art" key={`a${m.movie_id}`}>
        <Poster movie={m} className="feature-poster" />
      </div>

      <div className="dots">
        {items.map((x, n) => (
          <button key={x.movie_id} className={n === i ? 'dot on' : 'dot'}
                  onClick={() => setI(n)} aria-label={`Фильм ${n + 1}`} />
        ))}
      </div>
    </section>
  )
}