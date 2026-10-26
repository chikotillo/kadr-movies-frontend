import { supabase } from './supabaseClient'

export const posterUrl = (path, size = 'w342') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null

export const cleanTitle = (t) => t.replace(/\s*\(\d{4}\)\s*$/, '')

export const GENRES = [
  'Action', 'Adventure', 'Animation', 'Children', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Fantasy', 'Film-Noir', 'Horror', 'IMAX',
  'Musical', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western',
]

export async function getPopular(limit = 12) {
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .gte('ml_rating_count', 50)
    .order('ml_avg_rating', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function getMoviesByIds(ids) {
  if (!ids.length) return []
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .in('movie_id', ids)
  if (error) throw error
  return data
}

export async function getMovieById(id) {
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .eq('movie_id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function searchMovies({
  q = '', genre = '', yearFrom = '', yearTo = '',
  sort = 'popular', page = 0, pageSize = 24,
}) {
  let query = supabase.from('movies').select('*', { count: 'exact' })

    const text = q.trim().replace(/[,()%*\\"]/g, ' ')
  if (text) query = query.or(`title.ilike.*${text}*,title_ru.ilike.*${text}*`)
  if (genre) query = query.contains('genres', [genre])
  if (yearFrom) query = query.gte('release_year', Number(yearFrom))
  if (yearTo) query = query.lte('release_year', Number(yearTo))
  // чтобы фильм с одной оценкой 5.0 не оказался первым по рейтингу
  if (sort === 'rating') query = query.gte('ml_rating_count', 10)

  const sorts = {
    popular: ['ml_rating_count', false],
    rating: ['ml_avg_rating', false],
    newest: ['release_year', false],
    oldest: ['release_year', true],
    title: ['title', true],
  }
  const [column, ascending] = sorts[sort] ?? sorts.popular
  query = query.order(column, { ascending, nullsFirst: false })

  const from = page * pageSize
  const { data, error, count } = await query.range(from, from + pageSize - 1)
  if (error) throw error
  return { movies: data, total: count }
}
export const GENRE_RU = {
  Action: 'Боевик', Adventure: 'Приключения', Animation: 'Анимация',
  Children: 'Детское', Comedy: 'Комедия', Crime: 'Криминал',
  Documentary: 'Документальное', Drama: 'Драма', Fantasy: 'Фэнтези',
  'Film-Noir': 'Нуар', Horror: 'Ужасы', IMAX: 'IMAX', Musical: 'Мюзикл',
  Mystery: 'Детектив', Romance: 'Мелодрама', 'Sci-Fi': 'Фантастика',
  Thriller: 'Триллер', War: 'Военное', Western: 'Вестерн',
}
export const genreRu = (g) => GENRE_RU[g] ?? g
export const displayTitle = (m) => m.title_ru || cleanTitle(m.title)
export const originalTitle = (m) => cleanTitle(m.title)
export const movieOverview = (m) => m.overview_ru || m.overview || null
export async function getFeatured(limit = 6) {
  // сначала фильмы с настоящими обложками, иначе просто самые высоко оценённые
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .not('poster_url', 'is', null)
    .gte('ml_rating_count', 100)
    .order('ml_avg_rating', { ascending: false })
    .limit(limit)
  if (!error && data && data.length >= 3) return data
  return getPopular(limit)
}