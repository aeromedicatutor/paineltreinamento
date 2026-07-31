create extension if not exists pgcrypto;

create table if not exists public.iris_dados (
  id text primary key default 'principal',
  doc jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.sys4web_chamados (
  id uuid primary key default gen_random_uuid(),
  numero text not null default '',
  titulo text not null default '',
  descricao text not null default '',
  status text not null default 'Aberto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sys4web_chamado_atualizacoes (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references public.sys4web_chamados(id) on delete cascade,
  mensagem text not null,
  created_at timestamptz not null default now()
);

create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_iris_dados_updated_at on public.iris_dados;
create trigger trg_iris_dados_updated_at
before update on public.iris_dados
for each row execute function public.tocar_updated_at();

drop trigger if exists trg_sys4web_chamados_updated_at on public.sys4web_chamados;
create trigger trg_sys4web_chamados_updated_at
before update on public.sys4web_chamados
for each row execute function public.tocar_updated_at();

create or replace function public.atualizar_chamado_por_mensagem()
returns trigger
language plpgsql
as $$
begin
  update public.sys4web_chamados
  set updated_at = now()
  where id = new.chamado_id;
  return new;
end;
$$;

drop trigger if exists trg_sys4web_atualizacoes_touch on public.sys4web_chamado_atualizacoes;
create trigger trg_sys4web_atualizacoes_touch
after insert on public.sys4web_chamado_atualizacoes
for each row execute function public.atualizar_chamado_por_mensagem();

alter table public.iris_dados enable row level security;
alter table public.sys4web_chamados enable row level security;
alter table public.sys4web_chamado_atualizacoes enable row level security;

drop policy if exists "iris_dados leitura publica" on public.iris_dados;
create policy "iris_dados leitura publica"
on public.iris_dados for select
using (true);

drop policy if exists "iris_dados escrita publica" on public.iris_dados;
create policy "iris_dados escrita publica"
on public.iris_dados for all
using (true)
with check (true);

drop policy if exists "sys4web_chamados leitura publica" on public.sys4web_chamados;
create policy "sys4web_chamados leitura publica"
on public.sys4web_chamados for select
using (true);

drop policy if exists "sys4web_chamados escrita publica" on public.sys4web_chamados;
create policy "sys4web_chamados escrita publica"
on public.sys4web_chamados for all
using (true)
with check (true);

drop policy if exists "sys4web_atualizacoes leitura publica" on public.sys4web_chamado_atualizacoes;
create policy "sys4web_atualizacoes leitura publica"
on public.sys4web_chamado_atualizacoes for select
using (true);

drop policy if exists "sys4web_atualizacoes escrita publica" on public.sys4web_chamado_atualizacoes;
create policy "sys4web_atualizacoes escrita publica"
on public.sys4web_chamado_atualizacoes for all
using (true)
with check (true);
