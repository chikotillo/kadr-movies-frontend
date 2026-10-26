import { supabase } from './supabaseClient'

const COLS = 'id, room_id, user_id, author_name, body, created_at'

export async function loadMessages(roomId, limit = 100) {
  const { data, error } = await supabase
    .from('room_messages').select(COLS)
    .eq('room_id', roomId)
    .order('id', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data.reverse()
}

export async function sendMessage(roomId, userId, body) {
  const { data, error } = await supabase
    .from('room_messages')
    .insert({ room_id: roomId, user_id: userId, body: body.trim() })
    .select(COLS).single()
  if (error) throw error
  return data
}

// новые сообщения приходят сразу, без перезагрузки
export function subscribeChat(roomId, onInsert) {
  const channel = supabase.channel(`chat-${roomId}`)
  channel
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${roomId}` },
      (payload) => onInsert(payload.new))
    .subscribe()
  return () => supabase.removeChannel(channel)
}