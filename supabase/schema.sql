-- =====================================================================
-- Схема базы данных проекта «Lumen» (Supabase / PostgreSQL)
-- Файл описывает структуру. В Supabase база уже создана, заново запускать не нужно.
-- Каталог movies загружен из MovieLens (movies.csv, links.csv, агрегаты из ratings.csv).
-- movie_id = идентификатор MovieLens (не TMDB ID).
-- =====================================================================


-- =====================================================================
-- ЧАСТЬ 1. ОСНОВА: фильмы, профили, оценки, избранное, «Посмотреть позже»
-- =====================================================================

-- Фильмы
create table if not exists public.movies (
  movie_id           integer primary key,
  title              text not null,
  release_year       smallint,
  genres             text[] not null default '{}',
  tmdb_id            integer,
  imdb_id            text,
  poster_path        text,
  poster_url         text,
  overview           text,
  title_ru           text,
  overview_ru        text,
  trailer_youtube_id text,
  ml_avg_rating      numeric(3,2),
  ml_rating_count    integer default 0
);
create index if not exists movies_genres_idx on public.movies using gin (genres);
create index if not exists movies_release_year_idx on public.movies (release_year);

-- Профили (связаны с Supabase Auth)
create sequence if not exists public.model_user_id_seq start 100001;

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text,
  ml_user_id    integer unique,   -- ID пользователя MovieLens (только демо-профили)
  model_user_id integer unique default nextval('public.model_user_id_seq'),
  created_at    timestamptz default now()
);

-- Оценки пользователей сайта (0.5 ... 5.0 с шагом 0.5)
create table if not exists public.ratings (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  movie_id   integer not null references public.movies(movie_id) on delete cascade,
  rating     numeric(2,1) not null
             check (rating between 0.5 and 5 and (rating * 2) = floor(rating * 2)),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, movie_id)
);

-- Избранное и «Посмотреть позже»
create table if not exists public.favorites (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  movie_id   integer not null references public.movies(movie_id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, movie_id)
);

create table if not exists public.watchlist (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  movie_id   integer not null references public.movies(movie_id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, movie_id)
);

-- Row Level Security: каждый видит и меняет только свои данные
alter table public.movies    enable row level security;
alter table public.profiles  enable row level security;
alter table public.ratings   enable row level security;
alter table public.favorites enable row level security;
alter table public.watchlist enable row level security;

create policy "movies readable" on public.movies for select using (true);
create policy "own profile" on public.profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "own ratings" on public.ratings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own favorites" on public.favorites for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own watchlist" on public.watchlist for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Из браузера в профиле можно менять только имя
revoke insert, update on public.profiles from authenticated;
grant update (username) on public.profiles to authenticated;

-- Профиль создаётся автоматически при регистрации
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();


-- =====================================================================
-- ЧАСТЬ 2. ОБСУЖДЕНИЯ ФИЛЬМОВ: сообщения и лайки
-- =====================================================================

-- Сообщения о фильмах
create table if not exists public.reviews (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  movie_id    integer not null references public.movies(movie_id) on delete cascade,
  author_name text not null default 'Зритель',
  body        text not null check (char_length(btrim(body)) between 1 and 2000),
  spoiler     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists reviews_movie_idx on public.reviews (movie_id, created_at desc);
create index if not exists reviews_created_idx on public.reviews (created_at desc);

-- Лайки сообщений
create table if not exists public.review_likes (
  review_id  bigint not null references public.reviews(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

-- Имя автора ставит сервер (из браузера его не подделать) + защита от спама
create or replace function public.set_review_author() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.reviews
      where user_id = new.user_id and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'Слишком часто: подождите минуту';
  end if;
  new.author_name := coalesce(
    nullif((select username from public.profiles where id = new.user_id), ''), 'Зритель');
  return new;
end $$;

drop trigger if exists reviews_set_author on public.reviews;
create trigger reviews_set_author before insert on public.reviews
  for each row execute function public.set_review_author();

-- Row Level Security: читать могут все, писать и удалять только своё
alter table public.reviews enable row level security;
alter table public.review_likes enable row level security;

create policy "reviews readable" on public.reviews for select using (true);
create policy "own reviews insert" on public.reviews for insert with check (auth.uid() = user_id);
create policy "own reviews delete" on public.reviews for delete using (auth.uid() = user_id);
create policy "likes readable" on public.review_likes for select using (true);
create policy "own likes insert" on public.review_likes for insert with check (auth.uid() = user_id);
create policy "own likes delete" on public.review_likes for delete using (auth.uid() = user_id);


-- =====================================================================
-- ЧАСТЬ 3. ДРУЗЬЯ И ОБЩАЯ РУЛЕТКА
-- =====================================================================

-- ========== ДРУЗЬЯ ==========
create table if not exists public.friendships (
  id         bigint generated always as identity primary key,
  requester  uuid not null references public.profiles(id) on delete cascade,
  addressee  uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester, addressee), greatest(requester, addressee));

-- ========== КОМНАТЫ РУЛЕТКИ ==========
create table if not exists public.roulette_rooms (
  id              bigint generated always as identity primary key,
  code            text not null unique,
  owner           uuid not null references public.profiles(id) on delete cascade,
  spin_seq        integer not null default 0,
  winner_movie_id integer references public.movies(movie_id) on delete set null,
  spun_at         timestamptz,
  spun_by_name    text,
  created_at      timestamptz not null default now()
);

create table if not exists public.roulette_room_members (
  room_id   bigint not null references public.roulette_rooms(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  username  text not null default 'Участник',
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.roulette_room_items (
  id            bigint generated always as identity primary key,
  room_id       bigint not null references public.roulette_rooms(id) on delete cascade,
  movie_id      integer not null references public.movies(movie_id) on delete cascade,
  added_by      uuid not null references public.profiles(id) on delete cascade,
  added_by_name text not null default 'Участник',
  created_at    timestamptz not null default now(),
  unique (room_id, movie_id)
);

create table if not exists public.room_invites (
  id         bigint generated always as identity primary key,
  room_id    bigint not null references public.roulette_rooms(id) on delete cascade,
  from_user  uuid not null references public.profiles(id) on delete cascade,
  to_user    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (room_id, to_user)
);

-- ========== ПРОВЕРКИ ДОСТУПА ==========
create or replace function public.is_room_member(rid bigint) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.roulette_room_members
                 where room_id = rid and user_id = auth.uid())
$$;

create or replace function public.is_room_owner(rid bigint) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.roulette_rooms where id = rid and owner = auth.uid())
$$;

alter table public.friendships            enable row level security;
alter table public.room_invites           enable row level security;
alter table public.roulette_rooms         enable row level security;
alter table public.roulette_room_members  enable row level security;
alter table public.roulette_room_items    enable row level security;

-- друзья и приглашения: прямого доступа нет, только через функции ниже
revoke all on public.friendships, public.room_invites from anon, authenticated;

-- комнаты: читать могут только участники, менять можно только через функции
revoke all on public.roulette_rooms, public.roulette_room_members, public.roulette_room_items from anon;
revoke insert, update, delete on public.roulette_rooms, public.roulette_room_members from authenticated;
revoke update on public.roulette_room_items from authenticated;

create policy "rooms for members" on public.roulette_rooms
  for select using (public.is_room_member(id));
create policy "members see members" on public.roulette_room_members
  for select using (public.is_room_member(room_id));
create policy "items for members" on public.roulette_room_items
  for select using (public.is_room_member(room_id));
create policy "members add items" on public.roulette_room_items
  for insert with check (public.is_room_member(room_id) and added_by = auth.uid());
create policy "remove own or owner items" on public.roulette_room_items
  for delete using (added_by = auth.uid() or public.is_room_owner(room_id));

-- ========== ТРИГГЕРЫ (имена и лимиты ставит сервер) ==========
create or replace function public.room_item_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.roulette_room_items where room_id = new.room_id) >= 20 then
    raise exception 'В барабане уже 20 фильмов';
  end if;
  new.added_by_name := coalesce(
    nullif((select username from public.profiles where id = new.added_by), ''), 'Участник');
  return new;
end $$;

drop trigger if exists room_item_before_insert on public.roulette_room_items;
create trigger room_item_before_insert before insert on public.roulette_room_items
  for each row execute function public.room_item_before_insert();

create or replace function public.room_member_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.roulette_room_members where room_id = new.room_id) >= 8 then
    raise exception 'В комнате уже 8 человек';
  end if;
  new.username := coalesce(
    nullif((select username from public.profiles where id = new.user_id), ''), 'Участник');
  return new;
end $$;

drop trigger if exists room_member_before_insert on public.roulette_room_members;
create trigger room_member_before_insert before insert on public.roulette_room_members
  for each row execute function public.room_member_before_insert();

-- ========== ФУНКЦИИ: ДРУЗЬЯ ==========
create or replace function public.search_users(q text)
returns table (id uuid, username text, model_user_id integer)
language sql security definer stable set search_path = public as $$
  select p.id, p.username, p.model_user_id
  from public.profiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and length(btrim(q)) >= 2
    and (strpos(lower(coalesce(p.username, '')), lower(btrim(q))) > 0
         or p.model_user_id::text = ltrim(btrim(q), '#'))
  order by p.username
  limit 10
$$;

create or replace function public.my_friendships()
returns table (friendship_id bigint, other_id uuid, username text, model_user_id integer,
               status text, incoming boolean, created_at timestamptz)
language sql security definer stable set search_path = public as $$
  select f.id, o.id, o.username, o.model_user_id, f.status,
         (f.addressee = auth.uid()), f.created_at
  from public.friendships f
  join public.profiles o
    on o.id = case when f.requester = auth.uid() then f.addressee else f.requester end
  where auth.uid() in (f.requester, f.addressee)
  order by f.created_at desc
$$;

create or replace function public.send_friend_request(target uuid) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); existing public.friendships;
begin
  if me is null then raise exception 'Нужно войти в аккаунт'; end if;
  if target = me then raise exception 'Нельзя добавить самого себя'; end if;
  if not exists (select 1 from public.profiles where id = target) then
    raise exception 'Пользователь не найден';
  end if;

  select * into existing from public.friendships
   where (requester = me and addressee = target) or (requester = target and addressee = me);
  if found then
    if existing.status = 'accepted' then return 'already_friends'; end if;
    if existing.requester = me then return 'already_sent'; end if;
    update public.friendships set status = 'accepted' where id = existing.id;  -- встречная заявка
    return 'accepted';
  end if;

  if (select count(*) from public.friendships
      where requester = me and status = 'pending') >= 20 then
    raise exception 'Слишком много неотвеченных заявок';
  end if;
  insert into public.friendships (requester, addressee) values (me, target);
  return 'sent';
end $$;

create or replace function public.respond_friend_request(fid bigint, accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if accept then
    update public.friendships set status = 'accepted'
     where id = fid and addressee = auth.uid() and status = 'pending';
  else
    delete from public.friendships
     where id = fid and addressee = auth.uid() and status = 'pending';
  end if;
end $$;

create or replace function public.remove_friendship(fid bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.friendships where id = fid and auth.uid() in (requester, addressee);
end $$;

-- ========== ФУНКЦИИ: КОМНАТЫ ==========
create or replace function public.create_room() returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text; rid bigint; tries int := 0;
begin
  if me is null then raise exception 'Нужно войти в аккаунт'; end if;
  if (select count(*) from public.roulette_rooms where owner = me) >= 10 then
    raise exception 'Слишком много комнат: закройте старые';
  end if;
  loop
    new_code := '';
    for i in 1..6 loop
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.roulette_rooms where code = new_code);
    tries := tries + 1;
    if tries > 20 then raise exception 'Не удалось создать комнату, повторите'; end if;
  end loop;
  insert into public.roulette_rooms (code, owner) values (new_code, me) returning id into rid;
  insert into public.roulette_room_members (room_id, user_id) values (rid, me);
  return new_code;
end $$;

create or replace function public.join_room(room_code text) returns bigint
language plpgsql security definer set search_path = public as $$
declare r public.roulette_rooms; me uuid := auth.uid();
begin
  if me is null then raise exception 'Нужно войти в аккаунт'; end if;
  select * into r from public.roulette_rooms where code = upper(btrim(room_code));
  if not found then raise exception 'Комната не найдена'; end if;
  if not exists (select 1 from public.roulette_room_members
                 where room_id = r.id and user_id = me) then
    insert into public.roulette_room_members (room_id, user_id) values (r.id, me);
  end if;
  delete from public.room_invites where room_id = r.id and to_user = me;
  return r.id;
end $$;

create or replace function public.spin_room(room_code text) returns void
language plpgsql security definer set search_path = public as $$
declare r public.roulette_rooms; me uuid := auth.uid(); win integer; n integer;
begin
  select * into r from public.roulette_rooms where code = upper(btrim(room_code)) for update;
  if not found or not exists (select 1 from public.roulette_room_members
                              where room_id = r.id and user_id = me) then
    raise exception 'Комната не найдена';
  end if;
  if r.spun_at is not null and r.spun_at > now() - interval '7 seconds' then
    raise exception 'Подождите: барабан ещё крутится';
  end if;
  select count(*) into n from public.roulette_room_items where room_id = r.id;
  if n < 2 then raise exception 'Добавьте минимум 2 фильма'; end if;
  select movie_id into win from public.roulette_room_items
   where room_id = r.id order by random() limit 1;
  update public.roulette_rooms
     set spin_seq = spin_seq + 1, winner_movie_id = win, spun_at = now(),
         spun_by_name = coalesce(nullif((select username from public.profiles where id = me), ''), 'Участник')
   where id = r.id;
end $$;

create or replace function public.invite_to_room(room_code text, friend uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r public.roulette_rooms; me uuid := auth.uid();
begin
  select * into r from public.roulette_rooms where code = upper(btrim(room_code));
  if not found or not exists (select 1 from public.roulette_room_members
                              where room_id = r.id and user_id = me) then
    raise exception 'Комната не найдена';
  end if;
  if not exists (select 1 from public.friendships
                 where status = 'accepted'
                   and ((requester = me and addressee = friend)
                     or (requester = friend and addressee = me))) then
    raise exception 'Приглашать можно только друзей';
  end if;
  insert into public.room_invites (room_id, from_user, to_user) values (r.id, me, friend)
  on conflict (room_id, to_user) do nothing;
end $$;

create or replace function public.my_room_invites()
returns table (invite_id bigint, room_code text, from_name text, created_at timestamptz)
language sql security definer stable set search_path = public as $$
  select i.id, r.code, p.username, i.created_at
  from public.room_invites i
  join public.roulette_rooms r on r.id = i.room_id
  join public.profiles p on p.id = i.from_user
  where i.to_user = auth.uid()
  order by i.created_at desc
$$;

create or replace function public.dismiss_invite(iid bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.room_invites where id = iid and to_user = auth.uid();
end $$;

create or replace function public.leave_room(room_code text) returns void
language plpgsql security definer set search_path = public as $$
declare r public.roulette_rooms;
begin
  select * into r from public.roulette_rooms where code = upper(btrim(room_code));
  if not found then return; end if;
  delete from public.roulette_room_members where room_id = r.id and user_id = auth.uid();
  if not exists (select 1 from public.roulette_room_members where room_id = r.id) then
    delete from public.roulette_rooms where id = r.id;
  else
    update public.roulette_rooms
       set owner = (select user_id from public.roulette_room_members
                    where room_id = r.id order by joined_at limit 1)
     where id = r.id and owner = auth.uid();
  end if;
end $$;

create or replace function public.delete_room(room_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.roulette_rooms where code = upper(btrim(room_code)) and owner = auth.uid();
end $$;

-- ========== ПРАВА НА ФУНКЦИИ: только для вошедших ==========
revoke all on function public.is_room_member(bigint), public.is_room_owner(bigint),
  public.search_users(text), public.my_friendships(), public.send_friend_request(uuid),
  public.respond_friend_request(bigint, boolean), public.remove_friendship(bigint),
  public.create_room(), public.join_room(text), public.spin_room(text),
  public.invite_to_room(text, uuid), public.my_room_invites(), public.dismiss_invite(bigint),
  public.leave_room(text), public.delete_room(text)
  from public, anon;

grant execute on function public.is_room_member(bigint), public.is_room_owner(bigint),
  public.search_users(text), public.my_friendships(), public.send_friend_request(uuid),
  public.respond_friend_request(bigint, boolean), public.remove_friendship(bigint),
  public.create_room(), public.join_room(text), public.spin_room(text),
  public.invite_to_room(text, uuid), public.my_room_invites(), public.dismiss_invite(bigint),
  public.leave_room(text), public.delete_room(text)
  to authenticated;

-- ========== РЕАЛЬНОЕ ВРЕМЯ (комната обновляется у всех сразу) ==========
alter table public.roulette_room_items   replica identity full;
alter table public.roulette_room_members replica identity full;
alter publication supabase_realtime add table public.roulette_rooms;
alter publication supabase_realtime add table public.roulette_room_items;
alter publication supabase_realtime add table public.roulette_room_members;

notify pgrst, 'reload schema';