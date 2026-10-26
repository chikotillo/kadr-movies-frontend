import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { searchMovies, displayTitle, genreRu } from '../services/moviesApi'
import Poster from './Poster'

export default function SearchBox() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const input = useRef(null)

  // подсказки по мере набора
  useEffect(() => {
    const text = q.trim()
    if (text.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      searchMovies({ q: text, sort: 'popular', pageSize: 6 })
        .then((r) => !cancelled && setResults(r.movies))
        .catch(() => !cancelled && setResults([]))
        .finally(() => !cancelled && setLoading(false))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [q])

  // закрыть список при клике снаружи; клавиша «/» ставит курсор в поиск
  useEffect(() => {
    const onClick = (e) => {
      if (box.current && !box.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      const tag = document.activeElement?.tagName
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
        e.preventDefault()
        input.current?.focus()
      }
      if (e.key === 'Escape') {
        setOpen(false)
        input.current?.blur()
      }
    }
    document.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  function submit(e) {
    e.preventDefault()
    const text = q.trim()
    setOpen(false)
    input.current?.blur()
    navigate(text ? `/catalog?q=${encodeURIComponent(text)}` : '/catalog')
    setQ('')
  }

  const showList = open && q.trim().length >= 2

  return (
    <div className="search" ref={box}>
      <form onSubmit={submit}>
        <span className="search-icon">🔍</span>
        <input ref={input} value={q} placeholder="Поиск фильмов…"
               onChange={(e) => { setQ(e.target.value); setOpen(true) }}
               onFocus={() => setOpen(true)} />
        <kbd>/</kbd>
      </form>

      {showList && (
        <div className="suggest">
          {loading && results.length === 0 && <div className="suggest-empty">Ищу…</div>}
          {!loading && results.length === 0 && <div className="suggest-empty">Ничего не найдено</div>}
          {results.map((m) => (
            <Link key={m.movie_id} to={`/movie/${m.movie_id}`} className="suggest-item"
                  onClick={() => { setOpen(false); setQ('') }}>
              <Poster movie={m} className="sug-poster" />
              <span>
                <b>{displayTitle(m)}</b>
                <small>{m.release_year ?? '—'} · {m.genres.slice(0, 2).map(genreRu).join(', ')}</small>
              </span>
            </Link>
          ))}
          {results.length > 0 && (
            <Link to={`/catalog?q=${encodeURIComponent(q.trim())}`} className="suggest-all"
                  onClick={() => { setOpen(false); setQ('') }}>
              Все результаты →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}