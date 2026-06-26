create extension if not exists pgcrypto;

create table if not exists public.controle_os (
  id uuid primary key default gen_random_uuid(),
  numero_os text not null,
  data_abertura date,
  unidade text,
  solicitante text,
  ambiente text,
  classificacao text,
  categoria text,
  descricao text,
  responsavel text,
  prioridade text,
  status text,
  observacao text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plano_estrategico (
  id uuid primary key default gen_random_uuid(),
  item text not null,
  unidade text,
  predio text,
  categoria text,
  descricao_demanda text,
  acao text,
  prioridade text,
  responsavel_a3v text,
  responsavel_avanfisio text,
  data_solicitacao date,
  previsao date,
  observacoes text,
  status text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_controle_os_updated_at on public.controle_os;
create trigger set_controle_os_updated_at
before update on public.controle_os
for each row execute function public.set_updated_at();

drop trigger if exists set_plano_estrategico_updated_at on public.plano_estrategico;
create trigger set_plano_estrategico_updated_at
before update on public.plano_estrategico
for each row execute function public.set_updated_at();

alter table public.controle_os enable row level security;
alter table public.plano_estrategico enable row level security;

drop policy if exists "controle_os_select_auth" on public.controle_os;
create policy "controle_os_select_auth"
on public.controle_os for select
to authenticated
using (true);

drop policy if exists "controle_os_insert_auth" on public.controle_os;
create policy "controle_os_insert_auth"
on public.controle_os for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "controle_os_update_auth" on public.controle_os;
create policy "controle_os_update_auth"
on public.controle_os for update
to authenticated
using (true)
with check (true);

drop policy if exists "plano_select_auth" on public.plano_estrategico;
create policy "plano_select_auth"
on public.plano_estrategico for select
to authenticated
using (true);

drop policy if exists "plano_insert_auth" on public.plano_estrategico;
create policy "plano_insert_auth"
on public.plano_estrategico for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "plano_update_auth" on public.plano_estrategico;
create policy "plano_update_auth"
on public.plano_estrategico for update
to authenticated
using (true)
with check (true);

create or replace view public.vw_controle_os_powerbi as
select
  numero_os,
  data_abertura,
  unidade,
  solicitante,
  ambiente,
  classificacao,
  categoria,
  descricao,
  responsavel,
  prioridade,
  status,
  observacao,
  created_at,
  updated_at
from public.controle_os;

create or replace view public.vw_plano_estrategico_powerbi as
select
  item,
  unidade,
  predio,
  categoria,
  descricao_demanda,
  acao,
  prioridade,
  responsavel_a3v,
  responsavel_avanfisio,
  data_solicitacao,
  previsao,
  observacoes,
  status,
  created_at,
  updated_at
from public.plano_estrategico;
