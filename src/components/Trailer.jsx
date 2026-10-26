import { useEffect, useState } from 'react'

const VALID = /^[A-Za-z0-9_-]{11}$/

export default function Trailer({ youtubeId, query }) {
  const [open, setOpen] = useState(false)
  const hasVideo = VALID.test(youtubeId ?? '')

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  if (!hasVideo) {
    const search = encodeURIComponent(`${query} official trailer`)
    return (
      <a className="btn outline" target="_blank" rel="noreferrer"
         href={`https://www.youtube.com/results?search_query=${search}`}>
        ▶ Найти трейлер на YouTube
      </a>
    )
  }

  return (
    <>
      <button onClick={() => setOpen(true)}>▶ Смотреть трейлер</button>
      {open && (
        <div className="modal-back" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setOpen(false)} aria-label="Закрыть">
              ✕ Закрыть
            </button>
            <div className="modal-video">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
                title="Трейлер"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen />
            </div>
          </div>
        </div>
      )}
    </>
  )
}