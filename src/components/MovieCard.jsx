import { Link } from 'react-router-dom'
import Poster from './Poster'
import { displayTitle, genreRu } from '../services/moviesApi'

export default function MovieCard({ movie }) {
  const genres = (movie.genres ?? []).slice(0, 2).map(genreRu).join(', ')
  const meta = [movie.release_year, genres].filter(Boolean).join(' · ')

  return (
    <Link to={`/movie/${movie.movie_id}`} className="card">
      <div className="card-media">
        <Poster movie={movie} className="card-poster" />
        {movie.ml_avg_rating != null && <span className="badge">★ {movie.ml_avg_rating}</span>}
        <div className="card-hover"><span>Подробнее →</span></div>
      </div>
      <div className="card-body">
        <h3>{displayTitle(movie)}</h3>
        <p className="card-meta">{meta || '—'}</p>
      </div>
    </Link>
  )
}