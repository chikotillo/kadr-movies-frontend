import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { APP_NAME } from '../config'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const name = profile?.username || user?.email || '?'

  return (
    <header className="navbar">
      <Link to="/" className="logo">
        <svg className="logo-mark" viewBox="0 0 32 32" aria-hidden="true">
          <defs>
            <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#8b5cf6" />
              <stop offset="1" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="9" fill="url(#logoGrad)" />
          <path d="M12 9.5v13l11-6.5z" fill="#fff" />
        </svg>
        <span>{APP_NAME}<i>.</i></span>
      </Link>

      <button className="burger" onClick={() => setOpen(!open)} aria-label="Меню">
        {open ? '✕' : '☰'}
      </button>

      <nav className={open ? 'nav-links open' : 'nav-links'} onClick={() => setOpen(false)}>
        <NavLink to="/catalog">Каталог</NavLink>
        <NavLink to="/taste">Настрой вкус</NavLink>
        <NavLink to="/recommendations">Рекомендации</NavLink>
        {user ? (
          <>
            <NavLink to="/profile" className="user-link">
              <span className="avatar">{name.charAt(0).toUpperCase()}</span>Кабинет
            </NavLink>
            <button className="ghost" onClick={signOut}>Выйти</button>
          </>
        ) : (
          <Link to="/login" className="btn">Войти</Link>
        )}
      </nav>
    </header>
  )
}