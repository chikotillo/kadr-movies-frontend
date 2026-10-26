import { Link } from 'react-router-dom'
import { APP_NAME } from '../config'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-links">
        <Link to="/catalog">Каталог</Link>
        <Link to="/community">Сообщество</Link>
        <Link to="/taste">Настрой вкус</Link>
        <Link to="/recommendations">Рекомендации</Link>
      </div>
      <p>{APP_NAME} — учебный проект по дисциплине «Большие данные». Данные: MovieLens. Рекомендации: ALS (Spark MLlib).</p>
      <p>Названия, описания и обложки: Википедия и Викиданные (описания CC BY-SA); часть обложек: OMDb, TMDB.</p>
    </footer>
  )
}