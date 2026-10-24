import { useNavigate, useLocation } from 'react-router-dom'

export default function BackButton({ fallback = '/' }) {
  const navigate = useNavigate()
  const location = useLocation()
  // если страницу открыли напрямую (истории нет), ведём на запасной адрес
  const go = () => (location.key !== 'default' ? navigate(-1) : navigate(fallback))
  return <button className="back" onClick={go}>← Назад</button>
}