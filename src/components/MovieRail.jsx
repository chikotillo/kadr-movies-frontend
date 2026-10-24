import { useRef } from 'react'
import { Link } from 'react-router-dom'
import MovieCard from './MovieCard'

// movies === null означает «ещё грузится»
export default function MovieRail({ title, to, movies }) {
  const ref = useRef(null)
  const scroll = (dir) =>
    ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' })

  return (
    <section className="rail">
      <div className="rail-head">
        <h2>{title}</h2>
        <div className="rail-tools">
          {to && <Link to={to} className="see-all">Смотреть все →</Link>}
          <button className="round" onClick={() => scroll(-1)} aria-label="Назад">‹</button>
          <button className="round" onClick={() => scroll(1)} aria-label="Вперёд">›</button>
        </div>
      </div>
      <div className="rail-track" ref={ref}>
        {movies === null
          ? Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="rail-item"><div className="skeleton" /></div>
            ))
          : movies.map((m) => (
              <div key={m.movie_id} className="rail-item"><MovieCard movie={m} /></div>
            ))}
      </div>
    </section>
  )
}