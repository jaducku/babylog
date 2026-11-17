-- ─────────────────────────────────────────────────────────
-- babylog — Supabase 스키마 (아직 연결 전, 설계용)
-- 테넌트 단위는 family. 모든 기록은 family 멤버만 읽고 쓸 수 있다.
-- src/data/types.ts 와 1:1로 대응한다.
-- ─────────────────────────────────────────────────────────

create table public.families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create type member_role as enum ('owner', 'editor', 'viewer');

create table public.family_members (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families on delete cascade,
  user_id     uuid references auth.users on delete set null,  -- 초대 수락 전에는 null
  relation    text not null,                                   -- 엄마, 아빠, 할머니 …
  role        member_role not null default 'editor',
  tone        text not null default 'ink',
  created_at  timestamptz not null default now(),
  unique (family_id, user_id)
);

create table public.babies (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families on delete cascade,
  name        text not null,
  birth_date  date not null,
  sex         text check (sex in ('girl', 'boy')),
  created_at  timestamptz not null default now()
);

-- 기록은 한 테이블 + 종류별 jsonb payload.
-- 종류가 늘어나도 마이그레이션이 가볍고, 타임라인 조회가 한 번에 끝난다.
create table public.records (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families on delete cascade,
  baby_id     uuid not null references public.babies on delete cascade,
  kind        text not null check (kind in ('feed', 'diaper', 'growth', 'hospital')),
  at          timestamptz not null,
  data        jsonb not null default '{}',   -- method, amountMl, leftSec, pee, poo, weightKg …
  memo        text,
  created_by  uuid references public.family_members on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index records_baby_at on public.records (baby_id, at desc);

-- 진행 중인 모유 수유 타이머 (아기당 1개). 가족 모두에게 실시간으로 보인다.
create table public.active_feedings (
  baby_id         uuid primary key references public.babies on delete cascade,
  family_id       uuid not null references public.families on delete cascade,
  started_by      uuid references public.family_members on delete set null,
  started_at      timestamptz not null,
  side            text check (side in ('left', 'right')),
  side_started_at timestamptz,
  left_sec        int not null default 0,
  right_sec       int not null default 0
);

create table public.invites (
  code        text primary key,                -- 짧은 초대 코드
  family_id   uuid not null references public.families on delete cascade,
  relation    text,
  role        member_role not null default 'editor',
  expires_at  timestamptz not null default now() + interval '7 days',
  created_by  uuid references public.family_members on delete set null
);

-- ─────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────

create or replace function public.my_family_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select family_id from family_members where user_id = auth.uid()
$$;

create or replace function public.can_write(fid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from family_members
    where family_id = fid and user_id = auth.uid() and role in ('owner', 'editor')
  )
$$;

alter table public.families        enable row level security;
alter table public.family_members  enable row level security;
alter table public.babies          enable row level security;
alter table public.records         enable row level security;
alter table public.active_feedings enable row level security;
alter table public.invites         enable row level security;

create policy "family read"   on public.families       for select using (id in (select my_family_ids()));
create policy "members read"  on public.family_members for select using (family_id in (select my_family_ids()));
create policy "babies read"   on public.babies         for select using (family_id in (select my_family_ids()));
create policy "babies write"  on public.babies         for all    using (can_write(family_id)) with check (can_write(family_id));
create policy "records read"  on public.records        for select using (family_id in (select my_family_ids()));
create policy "records write" on public.records        for all    using (can_write(family_id)) with check (can_write(family_id));
create policy "feeding read"  on public.active_feedings for select using (family_id in (select my_family_ids()));
create policy "feeding write" on public.active_feedings for all    using (can_write(family_id)) with check (can_write(family_id));
create policy "invites owner" on public.invites        for all    using (
  exists (select 1 from family_members where family_id = invites.family_id and user_id = auth.uid() and role = 'owner')
);
-- 가족 생성과 초대 수락은 RPC(security definer 함수)로 처리한다.

-- 실시간 동기화
alter publication supabase_realtime add table public.records, public.active_feedings;
