import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getMovieById, searchMovies, genreRu, displayTitle, originalTitle, movieOverview,
} from '../services/moviesApi'
import { getUserMovieState, saveRating, deleteRating, setListItem } from '../services/userApi'
import Poster, { genreColors } from '../components/Poster'
import BackButton from '../components/BackButton'
import MovieRail from '../components/MovieRail'
import { Loader, ErrorBox } from '../components/Status'

const EMPTY = { rating: null, favorite: false, watchlist: false }

// Звёзды: оценка считается по положению курсора, шаг 0.5
function StarsInput({ value, onChange, disabled }) {
  const [hover, setHover] = useState(null)
  const shown = hover ?? value ?? 0

  const valueAt = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    return Math.min(5, Math.max(0.5, Math.ceil(ratio * 10) / 2))
  }

  function onKeyDown(e) {
    if (disabled) return
    if (e.key === 'ArrowRight') onChange(Math.min(5, (value ?? 0) + 0.5))
    if (e.key === 'ArrowLeft') onChange(Math.max(0.5, (value ?? 1) - 0.5))
  }

  return (
    <div
      className={disabled ? 'stars-input disabled' : 'stars-input'}
      role="slider" aria-label="Ваша оценка" aria-valuemin={0.5} aria-valuemax={5}
      aria-valuenow={value ?? 0} tabIndex={0} onKeyDown={onKeyDown}
      onPointerMove={(e) => { if (!disabled && e.pointerType === 'mouse') setHover(valueAt(e)) }}
      onPointerLeave={() => setHover(null)}
      onClick={(e) => { if (disabled) return; setHover(null); onChange(valueAt(e)) }}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="star">
          <span className="star-bg">★</span>
          <span className="star-fg"
                style={{ width: `${Math.min(1, Math.max(0, shown - i)) * 100}%` }}>
            <span className="star-glyph">★</span>
          </span>
        </span>
      ))}
    </div>
  )
}

export default function MoviePage() {
  const { id } = useParams()
  const movieId = Number(id)
  const { user } = useAuth()
  const [movie, setMovie] = useState(null)
  const [state, setState] = useState(EMPTY)
  const [more, setMore] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setMore(null)
    getMovieById(movieId)
      .then(setMovie)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [movieId])

  // другие фильмы того же жанра (это не «похожие по алгоритму», так и подписано)
  useEffect(() => {
    const genre = movie?.genres?.[0]
    if (!genre) return
    let cancelled = false
    searchMovies({ genre, sort: 'popular', pageSize: 13 })
      .then((res) => {
        if (!cancelled) setMore(res.movies.filter((x) => x.movie_id !== movieId).slice(0, 12))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [movie, movieId])

  useEffect(() => {
    if (!user) {
      setState(EMPTY)
      return
    }
    getUserMovieState(user.id, movieId)
      .then(setState)
      .catch((e) => setError(e.message))
  }, [user, movieId])

  async function act(fn, next) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      setState((s) => ({ ...s, ...next }))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loader />
  if (!movie) {
    return (
      <>
        <BackButton fallback="/catalog" />
        {error ? <ErrorBox message={error} /> : <p>Фильм не найден.</p>}
      </>
    )
  }

  const [, c2] = genreColors(movie.genres[0])
  const heroBg = {
    background: `radial-gradient(700px 320px at 20% 0%, ${c2}55, transparent 65%), var(--surface)`,
  }
  const overview = movieOverview(movie)

  return (
    <>
      <BackButton fallback="/catalog" />

      <section className="movie-hero" style={heroBg}>
        <div className="movie-page">
          <Poster movie={movie} className="movie-poster" />
          <div className="movie-info">
            <h1 className="movie-title">{displayTitle(movie)}</h1>
            {movie.title_ru && <p className="muted">{originalTitle(movie)}</p>}
            <p className="muted">{movie.release_year ?? 'Год неизвестен'}</p>

            <div className="chip-row">
              {movie.genres.map((g) => (
                <Link key={g} to={`/catalog?genre=${encodeURIComponent(g)}`} className="chip">
                  {genreRu(g)}
                </Link>
              ))}
            </div>

            <div className="score">
              <div className="score-box"><b>★ {movie.ml_avg_rating ?? '—'}</b>средняя оценка MovieLens</div>
              <div className="score-box"><b>{movie.ml_rating_count ?? 0}</b>оценок зрителей</div>
              {state.rating !== null && (
                <div className="score-box"><b>{state.rating}</b>ваша оценка</div>
              )}
            </div>

            <p className="overview">{overview ?? 'Описание для этого фильма пока недоступно.'}</p>
            {movie.overview_ru && <p className="muted">Описание: Википедия (CC BY-SA)</p>}
          </div>
        </div>
      </section>

      {error && <ErrorBox message={error} />}

      {user ? (
        <section className="panel">
          <h3>Ваша оценка{state.rating !== null ? `: ${state.rating} из 5` : ''}</h3>
          <StarsInput value={state.rating} disabled={busy}
                      onChange={(v) => act(() => saveRating(user.id, movieId, v), { rating: v })} />
          {state.rating !== null && (
            <button className="link" disabled={busy}
                    onClick={() => act(() => deleteRating(user.id, movieId), { rating: null })}>
              Удалить оценку
            </button>
          )}

          <div className="actions">
            <button disabled={busy}
                    className={state.favorite ? 'btn-toggle on' : 'btn-toggle'}
                    onClick={() => act(
                      () => setListItem('favorites', user.id, movieId, !state.favorite),
                      { favorite: !state.favorite })}>
              {state.favorite ? '♥ В избранном' : '♡ В избранное'}
            </button>
            <button disabled={busy}
                    className={state.watchlist ? 'btn-toggle on' : 'btn-toggle'}
                    onClick={() => act(
                      () => setListItem('watchlist', user.id, movieId, !state.watchlist),
                      { watchlist: !state.watchlist })}>
              {state.watchlist ? '✓ В списке «Посмотреть позже»' : '+ Посмотреть позже'}
            </button>
          </div>
        </section>
      ) : (
        <p className="banner">
          <Link to="/login">Войдите</Link>, чтобы оценить фильм и добавить его в списки.
        </p>
      )}

      {more && more.length > 0 && (
        <MovieRail title={`Ещё в жанре «${genreRu(movie.genres[0])}»`}
                   to={`/catalog?genre=${encodeURIComponent(movie.genres[0])}`} movies={more} />
      )}
    </>
  )
}