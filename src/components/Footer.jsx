import { Link } from 'react-router-dom'
import { APP_NAME } from '../config'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-links">
        <Link to="/catalog">Каталог</Link>
        <Link to="/taste">Настрой вкус</Link>
        <Link to="/recommendations">Рекомендации</Link>
      </div>
      <p>{APP_NAME} — учебный проект по дисциплине «Большие данные». Данные: MovieLens. Рекомендации: ALS (Spark MLlib).</p>
      <p>Русские названия и описания: Викиданные и Википедия (CC BY-SA).</p>
    </footer>
  )
}