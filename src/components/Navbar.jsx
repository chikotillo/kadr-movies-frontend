import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { APP_NAME } from '../config'
import SearchBox from './SearchBox'

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
              <stop offset="0" stopColor="#f3d896" />
              <stop offset="1" stopColor="#d8a243" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="13" fill="none" stroke="url(#logoGrad)" strokeWidth="2" />
          <path d="M13 10.5v11l9-5.5z" fill="url(#logoGrad)" />
        </svg>
        <span className="logo-text">{APP_NAME}</span>
      </Link>

      <SearchBox />

      <button className="burger" onClick={() => setOpen(!open)} aria-label="Меню">
        {open ? '✕' : '☰'}
      </button>

      <nav className={open ? 'nav-links open' : 'nav-links'} onClick={() => setOpen(false)}>
        <NavLink to="/catalog">Каталог</NavLink>
        <NavLink to="/community">Сообщество</NavLink>
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