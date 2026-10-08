-- =====================================================================
-- Marketplace de autos usados (México) — Esquema inicial v0.1
-- PostgreSQL 15+ / Supabase (usa auth.users y auth.uid()).
-- Los puntos marcados con [SUPUESTO] son decisiones mías que debes confirmar.
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type user_role         as enum ('buyer', 'seller', 'dealer', 'inspector', 'admin');
create type hub_type          as enum ('flagship', 'light');
create type listing_status    as enum ('draft', 'docs_pending', 'inspection_pending',
                                       'ready_to_publish', 'published', 'reserved',
                                       'sold', 'withdrawn');
create type trust_level       as enum ('green', 'blue', 'yellow');
create type doc_status        as enum ('pending', 'uploaded', 'verified', 'rejected');
create type inspection_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show');
create type inspection_result as enum ('approved', 'approved_with_notes', 'rejected');
create type visit_status      as enum ('requested', 'confirmed', 'completed', 'cancelled', 'no_show');
create type offer_status      as enum ('pending', 'accepted', 'rejected', 'expired', 'withdrawn');
create type transaction_status as enum ('initiated', 'funds_in_escrow', 'vehicle_delivered',
                                        'completed', 'cancelled', 'disputed');
create type policy_type       as enum ('warranty', 'insurance');

-- ---------------------------------------------------------------------
-- UTILIDADES
-- ---------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- USUARIOS Y ALIADOS
-- ---------------------------------------------------------------------
-- Extiende auth.users de Supabase. Los datos de contacto viven aquí y
-- NUNCA se exponen en lecturas públicas (ver RLS al final).
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null default 'buyer',
  full_name   text,
  phone       text,
  city        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- Lotes de autos aliados (B2B): solo les dirigimos compradores.
create table dealers (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references profiles(id),
  business_name  text not null,
  city           text,
  commission_pct numeric(4,2) not null default 1.00 check (commission_pct >= 0),
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- HUBS (Centros de Experiencia Neutral)
-- ---------------------------------------------------------------------
create table hubs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  city       text not null,
  state      text not null,
  address    text,
  type       hub_type not null default 'light',
  lat        numeric(9,6),
  lng        numeric(9,6),
  active     boolean not null default false,
  created_at timestamptz not null default now()
);

-- Expansión = activar una fila. Solo Monterrey nace activo.
insert into hubs (name, city, state, type, active) values
  ('Hub Monterrey', 'Monterrey',   'Nuevo León', 'flagship', true),
  ('Hub Monclova',  'Monclova',    'Coahuila',   'light',    false),
  ('Hub Guadalajara','Guadalajara','Jalisco',    'flagship', false),
  ('Hub CDMX',      'Ciudad de México','CDMX',   'flagship', false);

-- ---------------------------------------------------------------------
-- VEHÍCULOS Y PUBLICACIONES
-- ---------------------------------------------------------------------
create table vehicles (
  id            uuid primary key default gen_random_uuid(),
  vin           text not null unique check (char_length(vin) = 17),
  brand         text not null,
  model         text not null,
  year          smallint not null check (year between 1990 and 2100),
  trim          text,
  mileage_km    integer check (mileage_km >= 0),
  transmission  text check (transmission in ('manual', 'automatic')),
  fuel          text,
  color         text,
  plate_state   text,
  owners_count  smallint check (owners_count >= 1),
  created_at    timestamptz not null default now()
);
create index idx_vehicles_search on vehicles using gin ((brand || ' ' || model) gin_trgm_ops);
create index idx_vehicles_brand_model_year on vehicles (brand, model, year);

create table listings (
  id                  uuid primary key default gen_random_uuid(),
  vehicle_id          uuid not null references vehicles(id),
  seller_id           uuid not null references profiles(id),
  dealer_id           uuid references dealers(id),          -- null = venta C2C
  hub_id              uuid not null references hubs(id),
  status              listing_status not null default 'draft',
  expected_price      numeric(12,2) not null check (expected_price > 0), -- lo que quiere recibir el vendedor
  list_price          numeric(12,2) check (list_price > 0),              -- precio publicado al comprador
  currency            char(3) not null default 'MXN',
  -- Semáforo de confianza: se recalcula solo (ver triggers abajo)
  trust               trust_level not null default 'yellow',
  -- Comisión congelada al crear la publicación: 3% C2C (default) / 1% con lotes
  commission_pct      numeric(4,2) not null default 3.00 check (commission_pct >= 0),
  description         text,
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger trg_listings_updated before update on listings
  for each row execute function set_updated_at();

create index idx_listings_feed on listings (status, published_at desc);
create index idx_listings_price on listings (list_price) where status = 'published';
create index idx_listings_hub on listings (hub_id, status);
-- Un mismo auto no puede tener dos publicaciones activas a la vez
create unique index uq_listings_active_vehicle on listings (vehicle_id)
  where status in ('draft', 'docs_pending', 'inspection_pending',
                   'ready_to_publish', 'published', 'reserved');

create or replace function set_listing_commission() returns trigger
language plpgsql as $$
begin
  if new.dealer_id is not null then
    select commission_pct into new.commission_pct from dealers where id = new.dealer_id;
  end if;
  return new;
end $$;
create trigger trg_listings_commission before insert on listings
  for each row execute function set_listing_commission();

create table listing_photos (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references listings(id) on delete cascade,
  storage_path text not null,
  position     smallint not null default 0,
  is_cover     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index idx_photos_listing on listing_photos (listing_id, position);

-- ---------------------------------------------------------------------
-- PORTAL DE DOCUMENTOS (checklist del vendedor)
-- ---------------------------------------------------------------------
create table document_types (
  id           smallserial primary key,
  code         text not null unique,
  name         text not null,
  required     boolean not null default true,  -- obligatorio para llegar a verde
  description  text
);

-- [SUPUESTO] Lista inicial de documentos. Valídala con un abogado/gestor.
insert into document_types (code, name, required) values
  ('factura',                 'Factura de origen o endosada',        true),
  ('tarjeta_circulacion',     'Tarjeta de circulación',              true),
  ('pago_tenencia',           'Comprobante de tenencia/refrendo',    true),
  ('verificacion_vehicular',  'Verificación vehicular vigente',      true),
  ('identificacion_propietario','Identificación oficial del propietario', true),
  ('historial_mantenimiento', 'Historial de mantenimiento',          false);

create table listing_documents (
  id               uuid primary key default gen_random_uuid(),
  listing_id       uuid not null references listings(id) on delete cascade,
  document_type_id smallint not null references document_types(id),
  status           doc_status not null default 'pending',
  storage_path     text,                     -- bucket PRIVADO
  uploaded_at      timestamptz,
  reviewed_by      uuid references profiles(id),
  reviewed_at      timestamptz,
  rejection_reason text,
  unique (listing_id, document_type_id)
);

-- Contrato de exclusiva temporal (30–45 días)
create table seller_agreements (
  id               uuid primary key default gen_random_uuid(),
  listing_id       uuid not null references listings(id) on delete cascade,
  seller_id        uuid not null references profiles(id),
  exclusivity_days smallint not null check (exclusivity_days between 30 and 45),
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  signed_at        timestamptz,
  signed_doc_path  text,
  terms_version    text not null,
  check (ends_at > starts_at)
);

-- ---------------------------------------------------------------------
-- INSPECCIÓN FÍSICA Y LEGAL
-- ---------------------------------------------------------------------
create table inspections (
  id                   uuid primary key default gen_random_uuid(),
  listing_id           uuid not null references listings(id) on delete cascade,
  hub_id               uuid not null references hubs(id),
  inspector_id         uuid references profiles(id),
  status               inspection_status not null default 'scheduled',
  scheduled_at         timestamptz not null,
  completed_at         timestamptz,
  mechanical_score     smallint check (mechanical_score between 0 and 100),
  mechanical_checklist jsonb not null default '{}'::jsonb,
  legal_checks         jsonb not null default '{}'::jsonb,  -- REPUVE, robo, adeudos, gravámenes
  legal_clear          boolean,                             -- resultado global de la revisión legal
  result               inspection_result,
  report_path          text,
  notes                text,
  created_at           timestamptz not null default now()
);
create index idx_inspections_listing on inspections (listing_id);
create index idx_inspections_agenda on inspections (hub_id, scheduled_at);

-- ---------------------------------------------------------------------
-- SEMÁFORO DE CONFIANZA (cálculo automático)
-- [SUPUESTO] Significado de los colores — confírmalo:
--   green  = docs obligatorios verificados + inspección aprobada + revisión legal limpia
--   blue   = docs obligatorios verificados, inspección pendiente
--   yellow = verificación parcial (faltan documentos)
-- ---------------------------------------------------------------------
create or replace function compute_trust_level(p_listing uuid)
returns trust_level language sql stable as $$
  with docs as (
    select
      count(*) filter (where dt.required)                               as required_total,
      count(*) filter (where dt.required and ld.status = 'verified')    as required_verified
    from document_types dt
    left join listing_documents ld
      on ld.document_type_id = dt.id and ld.listing_id = p_listing
  ),
  insp as (
    select coalesce(bool_or(result in ('approved', 'approved_with_notes')
                            and coalesce(legal_clear, false)), false) as passed
    from inspections
    where listing_id = p_listing and status = 'completed'
  )
  select case
    when d.required_verified = d.required_total and i.passed then 'green'::trust_level
    when d.required_verified = d.required_total              then 'blue'::trust_level
    else 'yellow'::trust_level
  end
  from docs d, insp i;
$$;

create or replace function refresh_listing_trust() returns trigger
language plpgsql as $$
declare v_listing uuid;
begin
  v_listing := coalesce(new.listing_id, old.listing_id);
  update listings set trust = compute_trust_level(v_listing) where id = v_listing;
  return null;
end $$;

create trigger trg_docs_trust after insert or update or delete on listing_documents
  for each row execute function refresh_listing_trust();
create trigger trg_insp_trust after insert or update or delete on inspections
  for each row execute function refresh_listing_trust();

-- ---------------------------------------------------------------------
-- CONTACTO ANÓNIMO: chat dentro de la plataforma
-- ---------------------------------------------------------------------
create table conversations (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  buyer_id   uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id)
);

create table messages (
  id                    uuid primary key default gen_random_uuid(),
  conversation_id       uuid not null references conversations(id) on delete cascade,
  sender_id             uuid not null references profiles(id),
  body                  text not null,
  -- La app marca mensajes con teléfonos/correos/"háblame por WhatsApp":
  -- alimenta la detección de intentos de desintermediación.
  flagged_contact_leak  boolean not null default false,
  flagged_reason        text,
  created_at            timestamptz not null default now()
);
create index idx_messages_conv on messages (conversation_id, created_at);
create index idx_messages_flagged on messages (created_at) where flagged_contact_leak;

-- ---------------------------------------------------------------------
-- VISITAS (prueba de manejo en el hub) Y OFERTAS
-- ---------------------------------------------------------------------
create table visits (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references listings(id) on delete cascade,
  buyer_id     uuid not null references profiles(id),
  hub_id       uuid not null references hubs(id),
  scheduled_at timestamptz not null,
  status       visit_status not null default 'requested',
  notes        text,
  created_at   timestamptz not null default now()
);
create index idx_visits_agenda on visits (hub_id, scheduled_at);

create table offers (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references listings(id) on delete cascade,
  buyer_id    uuid not null references profiles(id),
  amount      numeric(12,2) not null check (amount > 0),
  status      offer_status not null default 'pending',
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index idx_offers_listing on offers (listing_id, status);

-- ---------------------------------------------------------------------
-- TRANSACCIONES (escrow) Y PÓLIZAS
-- ---------------------------------------------------------------------
create table transactions (
  id                uuid primary key default gen_random_uuid(),
  listing_id        uuid not null references listings(id),
  buyer_id          uuid not null references profiles(id),
  seller_id         uuid not null references profiles(id),
  hub_id            uuid references hubs(id),               -- hub donde se hizo la entrega
  sale_price        numeric(12,2) not null check (sale_price > 0),
  commission_pct    numeric(4,2) not null,                  -- copiado de listings al cerrar
  commission_amount numeric(12,2) generated always as
                      (round(sale_price * commission_pct / 100, 2)) stored,
  status            transaction_status not null default 'initiated',
  escrow_provider   text,                                   -- aliado/fiduciario (fase 2)
  escrow_reference  text,
  funds_released_at timestamptz,
  delivered_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger trg_transactions_updated before update on transactions
  for each row execute function set_updated_at();
-- Una sola transacción viva por publicación
create unique index uq_transactions_active_listing on transactions (listing_id)
  where status not in ('cancelled');

-- Garantía mecánica y seguro: ligados a la transacción y NO transferibles.
-- Si la venta se cierra fuera de la plataforma, no existe esta fila.
create table policies (
  id            uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  type          policy_type not null,
  provider      text,
  policy_number text,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  transferable  boolean not null default false check (transferable = false),
  created_at    timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- ---------------------------------------------------------------------
-- AUDITORÍA
-- ---------------------------------------------------------------------
create table audit_events (
  id         bigint generated always as identity primary key,
  actor_id   uuid references profiles(id),
  entity     text not null,
  entity_id  uuid,
  action     text not null,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_entity on audit_events (entity, entity_id);

-- ---------------------------------------------------------------------
-- SEGURIDAD (RLS): todo cerrado por defecto.
-- Las escrituras pasan por el backend con service role; el cliente solo
-- puede leer lo que aquí se abre. Los datos de contacto (profiles) nunca
-- se leen públicamente: ese es el candado técnico del anonimato.
-- ---------------------------------------------------------------------
alter table profiles          enable row level security;
alter table dealers           enable row level security;
alter table hubs              enable row level security;
alter table vehicles          enable row level security;
alter table listings          enable row level security;
alter table listing_photos    enable row level security;
alter table document_types    enable row level security;
alter table listing_documents enable row level security;
alter table seller_agreements enable row level security;
alter table inspections       enable row level security;
alter table conversations     enable row level security;
alter table messages          enable row level security;
alter table visits            enable row level security;
alter table offers            enable row level security;
alter table transactions      enable row level security;
alter table policies          enable row level security;
alter table audit_events      enable row level security;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles
                 where id = auth.uid() and role in ('admin', 'inspector'));
$$;

-- Catálogos públicos
create policy hubs_read on hubs for select using (active);
create policy doctypes_read on document_types for select using (true);

-- Cada quien ve su propio perfil (nadie ve el de otros)
create policy profiles_self on profiles for select using (id = auth.uid() or is_staff());

-- Publicaciones: públicas si están publicadas; el vendedor ve las suyas
create policy listings_read on listings for select using (
  status in ('published', 'reserved') or seller_id = auth.uid() or is_staff()
);
create policy vehicles_read on vehicles for select using (
  exists (select 1 from listings l
          where l.vehicle_id = vehicles.id
            and (l.status in ('published', 'reserved') or l.seller_id = auth.uid()))
  or is_staff()
);
create policy photos_read on listing_photos for select using (
  exists (select 1 from listings l
          where l.id = listing_photos.listing_id
            and (l.status in ('published', 'reserved') or l.seller_id = auth.uid()))
  or is_staff()
);

-- Documentos, contratos e inspecciones: solo el vendedor dueño y el staff
create policy docs_owner on listing_documents for select using (
  exists (select 1 from listings l where l.id = listing_documents.listing_id and l.seller_id = auth.uid())
  or is_staff()
);
create policy agreements_owner on seller_agreements for select using (seller_id = auth.uid() or is_staff());
create policy inspections_owner on inspections for select using (
  exists (select 1 from listings l where l.id = inspections.listing_id and l.seller_id = auth.uid())
  or is_staff()
);

-- Chat: solo los participantes (comprador y vendedor de esa publicación)
create policy conv_participants on conversations for select using (
  buyer_id = auth.uid()
  or exists (select 1 from listings l where l.id = conversations.listing_id and l.seller_id = auth.uid())
  or is_staff()
);
create policy msgs_participants on messages for select using (
  exists (select 1 from conversations c
          join listings l on l.id = c.listing_id
          where c.id = messages.conversation_id
            and (c.buyer_id = auth.uid() or l.seller_id = auth.uid()))
  or is_staff()
);

-- Visitas, ofertas, transacciones y pólizas: las partes involucradas
create policy visits_parties on visits for select using (buyer_id = auth.uid() or is_staff());
create policy offers_parties on offers for select using (
  buyer_id = auth.uid()
  or exists (select 1 from listings l where l.id = offers.listing_id and l.seller_id = auth.uid())
  or is_staff()
);
create policy tx_parties on transactions for select using (
  buyer_id = auth.uid() or seller_id = auth.uid() or is_staff()
);
create policy policies_parties on policies for select using (
  exists (select 1 from transactions t
          where t.id = policies.transaction_id
            and (t.buyer_id = auth.uid() or t.seller_id = auth.uid()))
  or is_staff()
);
