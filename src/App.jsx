import { useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Login from './pages/Login'
import Recommendations from './pages/Recommendations'
import Catalog from './pages/Catalog'
import MoviePage from './pages/MoviePage'
import Profile from './pages/Profile'
import Onboarding from './pages/Onboarding'
import Community from './pages/Community'
import { APP_NAME } from './config'

const TITLES = {
  '/catalog': 'Каталог', '/community': 'Сообщество', '/taste': 'Настрой вкус',
  '/recommendations': 'Рекомендации', '/profile': 'Кабинет', '/login': 'Вход',
}

// при переходе на другую страницу: прокрутка наверх и название вкладки
function PageEffects() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    if (pathname === '/') document.title = `${APP_NAME} — кино под ваш вкус`
    else if (TITLES[pathname]) document.title = `${TITLES[pathname]} — ${APP_NAME}`
    else if (!pathname.startsWith('/movie/')) document.title = APP_NAME
  }, [pathname])
  return null
}

function NotFound() {
  return (
    <div className="notfound">
      <h1>404</h1>
      <p className="muted">Такой страницы нет.</p>
      <Link to="/" className="btn">На главную</Link>
    </div>
  )
}

export default function App() {
  return (
    <>
      <PageEffects />
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/movie/:id" element={<MoviePage />} />
          <Route path="/community" element={<Community />} />
          <Route path="/taste" element={<Onboarding />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}