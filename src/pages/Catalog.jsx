import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchMovies, GENRES, genreRu } from '../services/moviesApi'
import MovieCard from '../components/MovieCard'
import { SkeletonGrid, ErrorBox } from '../components/Status'

const PAGE_SIZE = 24

export default function Catalog() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [genre, setGenre] = useState(params.get('genre') ?? '')
  const [yearFrom, setYearFrom] = useState(params.get('from') ?? '')
  const [yearTo, setYearTo] = useState(params.get('to') ?? '')
  const [sort, setSort] = useState(params.get('sort') ?? 'popular')
  const [page, setPage] = useState(Number(params.get('page')) || 0)
  const [movies, setMovies] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // адрес страницы отражает фильтры: «Назад» возвращает к тому же поиску
  useEffect(() => {
    const next = {}
    if (q) next.q = q
    if (genre) next.genre = genre
    if (yearFrom) next.from = yearFrom
    if (yearTo) next.to = yearTo
    if (sort !== 'popular') next.sort = sort
    if (page) next.page = String(page)
    setParams(next, { replace: true })
  }, [q, genre, yearFrom, yearTo, sort, page])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const timer = setTimeout(() => {
      searchMovies({ q, genre, yearFrom, yearTo, sort, page, pageSize: PAGE_SIZE })
        .then((res) => {
          if (cancelled) return
          setMovies(res.movies)
          setTotal(res.total ?? 0)
        })
        .catch((e) => !cancelled && setError(e.message))
        .finally(() => !cancelled && setLoading(false))
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [q, genre, yearFrom, yearTo, sort, page])

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const change = (setter) => (e) => {
    setter(e.target.value)
    setPage(0)
  }
  const pickGenre = (g) => {
    setGenre(g)
    setPage(0)
  }
  const goPage = (p) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const reset = () => {
    setQ(''); setGenre(''); setYearFrom(''); setYearTo(''); setSort('popular'); setPage(0)
  }

  return (
    <>
      <h1>Каталог</h1>
      <input className="search-input" placeholder="🔍 Поиск по названию фильма"
             value={q} onChange={change(setQ)} />

      <div className="chip-scroll">
        <button className={!genre ? 'chip active' : 'chip'} onClick={() => pickGenre('')}>Все</button>
        {GENRES.map((g) => (
          <button key={g} className={genre === g ? 'chip active' : 'chip'}
                  onClick={() => pickGenre(genre === g ? '' : g)}>
            {genreRu(g)}
          </button>
        ))}
      </div>

      <div className="filters-row">
        <input type="number" placeholder="Год от" value={yearFrom} onChange={change(setYearFrom)} />
        <input type="number" placeholder="Год до" value={yearTo} onChange={change(setYearTo)} />
        <select value={sort} onChange={change(setSort)}>
          <option value="popular">Сначала популярные</option>
          <option value="rating">По рейтингу</option>
          <option value="newest">Сначала новые</option>
          <option value="oldest">Сначала старые</option>
          <option value="title">По названию</option>
        </select>
        <button type="button" className="link" onClick={reset}>Сбросить</button>
      </div>

      {error && <ErrorBox message={error} />}
      {!loading && !error && total > 0 && <p className="muted">Найдено фильмов: {total}</p>}

      {loading ? (
        <SkeletonGrid n={12} />
      ) : movies.length === 0 && !error ? (
        <div className="empty">
          <p>😕 Ничего не найдено. Попробуйте изменить запрос или фильтры.</p>
          <button onClick={reset}>Сбросить фильтры</button>
        </div>
      ) : (
        <div className="grid">
          {movies.map((m) => <MovieCard key={m.movie_id} movie={m} />)}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="pager">
          <button disabled={page === 0} onClick={() => goPage(page - 1)}>← Назад</button>
          <span>Страница {page + 1} из {pages}</span>
          <button disabled={page + 1 >= pages} onClick={() => goPage(page + 1)}>Вперёд →</button>
        </div>
      )}
    </>
  )
}