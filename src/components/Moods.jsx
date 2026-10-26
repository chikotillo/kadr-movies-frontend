import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getRandomMovieId } from '../services/moviesApi'

const ICONS = {
  smile: (<><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2.5 4 2.5S16 14 16 14" /><path d="M9 9.5h.01M15 9.5h.01" /></>),
  eye: (<><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
  drop: (<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />),
  spark: (<path d="M12 2l2.2 6.3L21 10l-6.8 1.7L12 18l-2.2-6.3L3 10l6.8-1.7zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />),
  heart: (<path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10z" />),
  family: (<><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.5c3 0 6 2 6 5.5" /></>),
  dice: (<>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <circle cx="8.8" cy="8.8" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="15.2" cy="8.8" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="8.8" cy="15.2" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="15.2" cy="15.2" r="1.1" fill="currentColor" stroke="none" />
  </>),
}

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  )
}

const MOODS = [
  { label: 'Посмеяться', genre: 'Comedy', icon: 'smile', color: '#ffb020' },
  { label: 'Пощекотать нервы', genre: 'Thriller', icon: 'eye', color: '#8b5cf6' },
  { label: 'Поплакать', genre: 'Drama', icon: 'drop', color: '#3b82f6' },
  { label: 'Улететь в космос', genre: 'Sci-Fi', icon: 'spark', color: '#22d3ee' },
  { label: 'Влюбиться', genre: 'Romance', icon: 'heart', color: '#ff4d8d' },
  { label: 'Всей семьёй', genre: 'Animation', icon: 'family', color: '#34d399' },
]

const HUES = [265, 330, 45, 170, 200, 15, 290, 140]

export default function Moods() {
  const navigate = useNavigate()
  const [rolling, setRolling] = useState(false)

  async function surprise() {
    setRolling(true)
    try {
      const id = await getRandomMovieId()
      if (id) navigate(`/movie/${id}`)
    } finally {
      setRolling(false)
    }
  }

  return (
    <>
      <div className="rail-head" style={{ marginTop: 28 }}>
        <h2>Что смотрим сегодня?</h2>
      </div>

      <div className="moods">
        {MOODS.map((m) => (
          <Link key={m.label} to={`/catalog?genre=${encodeURIComponent(m.genre)}`}
                className="mood" style={{ '--a': m.color }}>
            <span className="mood-icon"><Icon name={m.icon} /></span>
            <span className="mood-label">{m.label}</span>
            <span className="mood-arrow">→</span>
          </Link>
        ))}
        <button type="button" className="mood" disabled={rolling} onClick={surprise}
                style={{ '--a': '#d4ff3f' }}>
          <span className="mood-icon"><Icon name="dice" /></span>
          <span className="mood-label">{rolling ? 'Ищу…' : 'Удиви меня'}</span>
          <span className="mood-arrow">→</span>
        </button>
      </div>

      <Link to="/roulette" className="promo">
        <div className="promo-text">
          <span className="eyebrow">Новое</span>
          <h3>Рулетка фильмов</h3>
          <p>Не можете выбрать? Соберите несколько фильмов, крутаните барабан, и один из них выпадет случайно.</p>
          <span className="btn">Крутить рулетку</span>
        </div>
        <div className="promo-reel" aria-hidden="true">
          <div className="promo-track">
            {HUES.concat(HUES).map((h, i) => (
              <i key={i} style={{ '--h': h }}>?</i>
            ))}
          </div>
        </div>
      </Link>
    </>
  )
}