import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchMovies, GENRES, genreRu } from '../services/moviesApi'
import MovieCard from '../components/MovieCard'
import { SkeletonGrid, ErrorBox } from '../components/Status'

const PAGE_SIZE = 24

// поле ввода: текст меняется сразу, в адрес попадает с небольшой задержкой
function useUrlText(value, commit) {
  const [text, setText] = useState(value)
  useEffect(() => {
    setText(value)
  }, [value])
  useEffect(() => {
    if (text === value) return
    const timer = setTimeout(() => commit(text), 350)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])
  return [text, setText]
}

export default function Catalog() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const genre = params.get('genre') ?? ''
  const yearFrom = params.get('from') ?? ''
  const yearTo = params.get('to') ?? ''
  const sort = params.get('sort') ?? 'popular'
  const page = Number(params.get('page')) || 0

  const [movies, setMovies] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  function update(changes, keepPage = false) {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
      if (!keepPage) next.delete('page')
      return next
    }, { replace: true })
  }

  const [qText, setQText] = useUrlText(q, (v) => update({ q: v }))
  const [fromText, setFromText] = useUrlText(yearFrom, (v) => update({ from: v }))
  const [toText, setToText] = useUrlText(yearTo, (v) => update({ to: v }))

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    searchMovies({ q, genre, yearFrom, yearTo, sort, page, pageSize: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return
        setMovies(res.movies)
        setTotal(res.total ?? 0)
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [q, genre, yearFrom, yearTo, sort, page])

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const goPage = (p) => {
    update({ page: p ? String(p) : '' }, true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const reset = () => setParams({}, { replace: true })

  return (
    <>
      <h1>Каталог</h1>
      <input className="search-input" placeholder="Поиск по названию фильма"
             value={qText} onChange={(e) => setQText(e.target.value)} />

      <div className="chip-scroll">
        <button className={!genre ? 'chip active' : 'chip'} onClick={() => update({ genre: '' })}>Все</button>
        {GENRES.map((g) => (
          <button key={g} className={genre === g ? 'chip active' : 'chip'}
                  onClick={() => update({ genre: genre === g ? '' : g })}>
            {genreRu(g)}
          </button>
        ))}
      </div>

      <div className="filters-row">
        <input type="number" placeholder="Год от" value={fromText}
               onChange={(e) => setFromText(e.target.value)} />
        <input type="number" placeholder="Год до" value={toText}
               onChange={(e) => setToText(e.target.value)} />
        <select value={sort} onChange={(e) => update({ sort: e.target.value })}>
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