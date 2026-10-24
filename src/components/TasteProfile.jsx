const STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

export default function TasteProfile({ ratings }) {
  if (ratings.length === 0) {
    return (
      <p className="muted">
        Оцените несколько фильмов, и здесь появится ваш профиль вкуса.
      </p>
    )
  }

  const byGenre = {}
  ratings.forEach(({ rating, movies }) => {
    movies.genres.forEach((g) => {
      byGenre[g] = byGenre[g] || { count: 0, sum: 0 }
      byGenre[g].count += 1
      byGenre[g].sum += Number(rating)
    })
  })
  const topGenres = Object.entries(byGenre)
    .map(([name, v]) => ({ name, count: v.count, avg: v.sum / v.count }))
    .sort((a, b) => b.count - a.count || b.avg - a.avg)
    .slice(0, 6)
  const maxCount = topGenres[0]?.count ?? 1

  const dist = STEPS.map((s) => ({
    s, n: ratings.filter((r) => Number(r.rating) === s).length,
  }))
  const maxDist = Math.max(...dist.map((d) => d.n), 1)
  const avg = ratings.reduce((a, r) => a + Number(r.rating), 0) / ratings.length

  return (
    <>
      <div className="stat-row">
        <div className="stat"><b>{ratings.length}</b>оценок</div>
        <div className="stat"><b>{avg.toFixed(2)}</b>средняя оценка</div>
        <div className="stat"><b>{topGenres[0]?.name ?? '—'}</b>любимый жанр</div>
      </div>

      <h3>Любимые жанры</h3>
      {topGenres.map((g) => (
        <div key={g.name} className="bar-row">
          <span>{g.name}</span>
          <div className="bar"><i style={{ width: `${(g.count / maxCount) * 100}%` }} /></div>
          <span className="muted">{g.count} шт. · средняя {g.avg.toFixed(1)}</span>
        </div>
      ))}

      <h3>Как вы оцениваете</h3>
      <div className="hist">
        {dist.map(({ s, n }) => (
          <div key={s} className="hist-col">
            <span>{n || ''}</span>
            <div className="hist-wrap"><i style={{ height: `${(n / maxDist) * 100}%` }} /></div>
            <span>{s}</span>
          </div>
        ))}
      </div>
      <p className="muted">Считается из ваших оценок в базе данных.</p>
    </>
  )
}