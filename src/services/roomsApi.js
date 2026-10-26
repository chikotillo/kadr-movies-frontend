import { supabase } from './supabaseClient'

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw error
  return data
}

export const createRoom = () => rpc('create_room')
export const joinRoom = (code) => rpc('join_room', { room_code: code })
export const spinRoom = (code) => rpc('spin_room', { room_code: code })
export const inviteToRoom = (code, friend) => rpc('invite_to_room', { room_code: code, friend })
export const leaveRoom = (code) => rpc('leave_room', { room_code: code })
export const deleteRoom = (code) => rpc('delete_room', { room_code: code })

// вся комната целиком: настройки, фильмы в барабане, участники
export async function loadRoom(code) {
  const { data: room, error } = await supabase
    .from('roulette_rooms').select('*').eq('code', code).maybeSingle()
  if (error) throw error
  if (!room) return null

  const [items, members] = await Promise.all([
    supabase.from('roulette_room_items')
      .select('id, movie_id, added_by, added_by_name, movies(*)')
      .eq('room_id', room.id).order('id'),
    supabase.from('roulette_room_members')
      .select('user_id, username, joined_at')
      .eq('room_id', room.id).order('joined_at'),
  ])
  if (items.error) throw items.error
  if (members.error) throw members.error
  return { room, items: items.data.filter((i) => i.movies), members: members.data }
}

export async function addRoomMovie(roomId, userId, movieId) {
  const { error } = await supabase.from('roulette_room_items')
    .insert({ room_id: roomId, movie_id: movieId, added_by: userId })
  if (error) throw error.code === '23505' ? new Error('Этот фильм уже в барабане') : error
}

export async function removeRoomItem(id) {
  const { error } = await supabase.from('roulette_room_items').delete().eq('id', id)
  if (error) throw error
}

// любое изменение в комнате -> вызываем onChange
export function subscribeRoom(roomId, onChange) {
  const channel = supabase.channel(`room-${roomId}`)
  const tables = [
    ['roulette_rooms', `id=eq.${roomId}`],
    ['roulette_room_items', `room_id=eq.${roomId}`],
    ['roulette_room_members', `room_id=eq.${roomId}`],
  ]
  tables.forEach(([table, filter]) => {
    channel.on('postgres_changes', { event: '*', schema: 'public', table, filter }, onChange)
  })
  channel.subscribe()
  return () => supabase.removeChannel(channel)
}