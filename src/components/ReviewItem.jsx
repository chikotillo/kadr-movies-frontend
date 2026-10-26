import { useState } from 'react'
import { Link } from 'react-router-dom'
import Poster from './Poster'
import { displayTitle } from '../services/moviesApi'

export function timeAgo(iso) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'только что'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} мин. назад`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ч. назад`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} дн. назад`
  return new Date(iso).toLocaleDateString('ru-RU')
}

export default function ReviewItem({ review, like, canLike, isMine, onLike, onDelete, movie }) {
  const [reveal, setReveal] = useState(false)
  const hidden = review.spoiler && !reveal

  return (
    <article className="review">
      {movie && (
        <Link to={`/movie/${movie.movie_id}`} className="review-movie">
          <Poster movie={movie} className="rm-poster" />
        </Link>
      )}
      <div className="review-main">
        <div className="review-head">
          <span className="review-avatar">{review.author_name.charAt(0).toUpperCase()}</span>
          <b>{review.author_name}</b>
          <span className="muted">{timeAgo(review.created_at)}</span>
          {review.spoiler && <span className="tag">спойлер</span>}
        </div>

        {movie && (
          <Link to={`/movie/${movie.movie_id}`} className="review-movie-title">
            {displayTitle(movie)}
          </Link>
        )}

        {hidden ? (
          <div>
            <button className="spoiler-btn" onClick={() => setReveal(true)}>
              Показать текст (спойлер)
            </button>
          </div>
        ) : (
          <p className="review-body">{review.body}</p>
        )}

        <div className="review-actions">
          <button className={like?.mine ? 'like on' : 'like'} disabled={!canLike}
                  title={canLike ? '' : 'Войдите, чтобы ставить лайки'}
                  onClick={() => onLike(review.id, !like?.mine)}>
            ♥ {like?.count ?? 0}
          </button>
          {isMine && <button className="link" onClick={() => onDelete(review.id)}>Удалить</button>}
        </div>
      </div>
    </article>
  )
}