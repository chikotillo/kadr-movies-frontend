import { Link } from 'react-router-dom'
import { displayTitle, genreRu } from '../services/moviesApi'
import Poster from './Poster'

export default function MovieCard({ movie, note }) {
  return (
    <Link to={`/movie/${movie.movie_id}`} className="card">
      <div className="card-media">
        <Poster movie={movie} />
        {movie.ml_avg_rating && (
          <span className="badge">★ {Number(movie.ml_avg_rating).toFixed(1)}</span>
        )}
      </div>
      <div className="card-body">
        <h3>{displayTitle(movie)}</h3>
        <p className="muted">
          {movie.release_year ?? '—'} · {movie.genres.slice(0, 2).map(genreRu).join(', ')}
        </p>
        {note && <p className="note">{note}</p>}
        <span className="btn-small">Подробнее →</span>
      </div>
    </Link>
  )
}