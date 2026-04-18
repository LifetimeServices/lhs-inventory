-- LHS INVENTORY & FIELD SERVICE MANAGEMENT
-- Run this in Supabase SQL Editor: https://vuwcnqvrgmdknvbajhtt.supabase.co

create table if not exists lhs_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  password_hash text not null,
  role text not null default 'Van Tech',
  home_location text,
  active boolean default true,
  created_at timestamptz default now()
);
create table if not exists lhs_divisions (
  id uuid primary key default gen_random_uuid(),
  name text unique not null, code text, service_type text,
  active boolean default true, created_at timestamptz default now()
);
create table if not exists lhs_vendors (
  id uuid primary key default gen_random_uuid(),
  name text unique not null, phone text, email text,
  terms text default 'Net 30', category text,
  active boolean default true, created_at timestamptz default now()
);
create table if not exists lhs_locations (
  id uuid primary key default gen_random_uuid(),
  name text unique not null, type text not null,
  region text, address text, active boolean default true,
  created_at timestamptz default now()
);
create table if not exists lhs_items (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null, name text not null,
  description text, brand text, category text, division text,
  unit text default 'ea', vendor text,
  min_qty integer default 0, max_qty integer default 0,
  reorder_qty integer default 0, unit_cost numeric(10,2) default 0,
  active boolean default true, created_at timestamptz default now()
);
create table if not exists lhs_location_stock (
  id uuid primary key default gen_random_uuid(),
  sku text not null references lhs_items(sku),
  item_name text, location text not null,
  qty_on_hand integer default 0, min_qty integer default 0, max_qty integer default 0,
  bin_shelf text, last_updated timestamptz default now(), updated_by text,
  unique(sku, location)
);
create table if not exists lhs_van_inventory (
  id uuid primary key default gen_random_uuid(),
  sku text not null references lhs_items(sku),
  item_name text, vehicle_id text not null, division text,
  qty_on_hand integer default 0, van_min integer default 0, van_max integer default 0,
  tech_assigned text, last_updated timestamptz default now(),
  unique(sku, vehicle_id)
);
create table if not exists lhs_po_sequence (
  id integer primary key default 1, last_seq integer default 0,
  constraint single_row check (id = 1)
);
insert into lhs_po_sequence (id, last_seq) values (1, 0) on conflict do nothing;
create table if not exists lhs_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text unique not null, created_date date not null default current_date,
  vendor text, delivery_location text, send_method text,
  status text default 'Pending', notes text,
  receipt_value numeric(10,2) default 0,
  received_date date, received_by text, created_by text,
  created_at timestamptz default now()
);
create table if not exists lhs_po_lines (
  id uuid primary key default gen_random_uuid(),
  po_id uuid references lhs_purchase_orders(id) on delete cascade,
  sku text, item_name text, qty_ordered integer default 0,
  qty_received integer default 0, unit_cost numeric(10,2) default 0,
  status text default 'Open', notes text
);
create table if not exists lhs_transfers (
  id uuid primary key default gen_random_uuid(),
  transfer_date date default current_date,
  from_location text, to_location text, sku text, item_name text,
  qty integer, reason text, notes text, transferred_by text,
  created_at timestamptz default now()
);
create table if not exists lhs_testers (
  id uuid primary key default gen_random_uuid(),
  tester_id text unique not null, tester_type text, serial_number text,
  status text default 'At Warehouse', vehicle_id text, tech_assigned text,
  customer_name text, customer_phone text, drop_address text,
  drop_date date, pickup_date date, notes text,
  created_at timestamptz default now()
);
create table if not exists lhs_customers (
  id uuid primary key default gen_random_uuid(),
  name text not null, phone text, email text,
  address text, city text, state text, zip text,
  division text, notes text, created_at timestamptz default now()
);
create table if not exists lhs_work_orders (
  id uuid primary key default gen_random_uuid(),
  wo_number text unique not null,
  customer_id uuid references lhs_customers(id),
  customer_name text, customer_address text,
  division text, job_type text, description text,
  status text default 'Scheduled',
  priority text default 'Normal',
  assigned_tech text, assigned_vehicle text,
  scheduled_date date, scheduled_time time,
  estimated_duration integer,
  actual_start timestamptz, actual_end timestamptz,
  completion_notes text, created_by text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists lhs_wo_materials (
  id uuid primary key default gen_random_uuid(),
  wo_id uuid references lhs_work_orders(id) on delete cascade,
  sku text, item_name text, qty_used integer default 0,
  unit_cost numeric(10,2) default 0, pulled_from text
);
create table if not exists lhs_schedule (
  id uuid primary key default gen_random_uuid(),
  wo_id uuid references lhs_work_orders(id) on delete cascade,
  tech_name text, vehicle_id text, scheduled_date date,
  start_time time, end_time time,
  status text default 'Scheduled', dispatch_notes text,
  created_at timestamptz default now()
);
create table if not exists lhs_audit_log (
  id uuid primary key default gen_random_uuid(),
  action text, table_name text, record_id text, changed_by text,
  old_values jsonb, new_values jsonb, created_at timestamptz default now()
);

-- ── TELEPHONY (Phase 3) ─────────────────────────────────────────────────────
-- Phone numbers provisioned on Telnyx. Routing type + per-number config.
create table if not exists lhs_phone_numbers (
  id uuid primary key default gen_random_uuid(),
  e164 text unique not null,                       -- "+14145550100"
  telnyx_id text,                                  -- Telnyx phone number resource id
  label text,                                      -- human name: "Green Bay Main"
  number_type text default 'local',                -- 'local' | 'toll_free'
  route_type text default 'call_center',           -- 'call_center' | 'direct_rep'
  assigned_user_id uuid references lhs_users(id),  -- for direct_rep type
  ring_seconds integer default 25,                 -- ring duration before voicemail
  timezone text default 'America/Chicago',
  business_hours jsonb,                            -- {mon:{start:"08:00",end:"17:00"}, ...}
  record_calls boolean default true,
  recording_announcement boolean default true,     -- play "this call may be recorded"
  voicemail_enabled boolean default true,
  voicemail_greeting_id uuid,                      -- → lhs_voicemail_greetings
  voicemail_notify_emails text[],                  -- extra emails notified on VM
  voicemail_notify_user_ids uuid[],                -- in-app notifications
  sms_enabled boolean default true,
  shared_inbox boolean default true,               -- replies fan into shared inbox
  a2p_campaign_id text,                            -- Telnyx 10DLC campaign id once assigned
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Voicemail greetings (audio stored in Cloudflare R2). Can be assigned to any number.
create table if not exists lhs_voicemail_greetings (
  id uuid primary key default gen_random_uuid(),
  name text not null,                              -- "Main Office After Hours"
  r2_path text not null,                           -- R2 object key
  r2_url text,                                     -- public URL
  duration_seconds numeric(6,2),
  created_by uuid references lhs_users(id),
  created_at timestamptz default now()
);

-- Call log — every inbound and outbound call.
create table if not exists lhs_phone_calls (
  id uuid primary key default gen_random_uuid(),
  telnyx_call_control_id text,                     -- Telnyx call-control id
  telnyx_leg_id text,
  direction text not null,                         -- 'inbound' | 'outbound'
  from_number text,
  to_number text,
  phone_number_id uuid references lhs_phone_numbers(id),
  customer_id uuid references lhs_customers(id),
  user_id uuid references lhs_users(id),           -- which rep handled (if any)
  status text,                                     -- 'ringing' | 'answered' | 'missed' | 'voicemail' | 'completed' | 'failed'
  started_at timestamptz,
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  recording_r2_path text,
  recording_url text,
  notes text,
  follow_up_date date,
  disposition text,                                -- outcome tag set by rep
  created_at timestamptz default now()
);

-- Voicemail messages left by callers.
create table if not exists lhs_voicemails (
  id uuid primary key default gen_random_uuid(),
  call_id uuid references lhs_phone_calls(id),
  phone_number_id uuid references lhs_phone_numbers(id),
  from_number text,
  customer_id uuid references lhs_customers(id),
  r2_path text,
  r2_url text,
  duration_seconds integer,
  transcript text,
  status text default 'new',                       -- 'new' | 'listened' | 'closed_out'
  closed_out_by uuid references lhs_users(id),
  closed_out_at timestamptz,
  closed_out_notes text,
  created_at timestamptz default now()
);

-- SMS threads — one per (our_number, remote_number) pair.
create table if not exists lhs_sms_threads (
  id uuid primary key default gen_random_uuid(),
  phone_number_id uuid references lhs_phone_numbers(id),
  our_number text not null,
  remote_number text not null,
  customer_id uuid references lhs_customers(id),
  last_message_at timestamptz,
  last_message_preview text,
  last_direction text,                             -- 'inbound' | 'outbound'
  last_user_id uuid references lhs_users(id),      -- who sent the last outbound
  unread_count integer default 0,
  is_shared boolean default true,                  -- mirrors lhs_phone_numbers.shared_inbox
  archived boolean default false,
  created_at timestamptz default now(),
  unique(our_number, remote_number)
);

-- SMS messages (individual texts). MMS media stored in R2.
create table if not exists lhs_sms_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references lhs_sms_threads(id) on delete cascade,
  telnyx_message_id text,
  direction text not null,                         -- 'inbound' | 'outbound'
  body text,
  media_r2_paths text[],                           -- R2 paths for MMS attachments
  media_urls text[],
  status text,                                     -- 'queued' | 'sent' | 'delivered' | 'failed' | 'blocked'
  sent_by_user_id uuid references lhs_users(id),   -- null for inbound
  blocked_reason text,                             -- when status='blocked'
  created_at timestamptz default now()
);

-- Agent presence for the Call Center Monitor.
create table if not exists lhs_phone_presence (
  user_id uuid primary key references lhs_users(id) on delete cascade,
  state text default 'available',                  -- available | on_call | wrap_up | break | meeting | away
  state_since timestamptz default now(),
  current_call_id uuid references lhs_phone_calls(id),
  last_heartbeat_at timestamptz default now()
);

-- SMS opt-out log (STOP compliance).
create table if not exists lhs_sms_optouts (
  id uuid primary key default gen_random_uuid(),
  remote_number text not null,
  our_number text,
  reason text default 'STOP',
  created_at timestamptz default now(),
  unique(remote_number, our_number)
);

-- Outbound SMS templates for automated triggers.
create table if not exists lhs_sms_templates (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  trigger_event text,                              -- 'wo_created' | 'tech_en_route' | 'appt_reminder' etc.
  body text not null,                              -- supports {{merge_fields}}
  active boolean default true,
  from_phone_number_id uuid references lhs_phone_numbers(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Customer communication preferences ("bells"). Add if missing on existing table.
do $$ begin
  alter table lhs_customers add column if not exists allow_calls boolean default true;
  alter table lhs_customers add column if not exists allow_sms boolean default true;
  alter table lhs_customers add column if not exists allow_email boolean default true;
  alter table lhs_customers add column if not exists do_not_contact boolean default false;
  alter table lhs_customers add column if not exists sms_opted_out_at timestamptz;
end $$;

-- Row Level Security
do $$ declare t text; begin
  foreach t in array array['lhs_users','lhs_divisions','lhs_vendors','lhs_locations',
    'lhs_items','lhs_location_stock','lhs_van_inventory','lhs_purchase_orders',
    'lhs_po_lines','lhs_transfers','lhs_testers','lhs_customers','lhs_work_orders',
    'lhs_wo_materials','lhs_schedule','lhs_audit_log','lhs_po_sequence',
    'lhs_phone_numbers','lhs_voicemail_greetings','lhs_phone_calls','lhs_voicemails',
    'lhs_sms_threads','lhs_sms_messages','lhs_phone_presence','lhs_sms_optouts','lhs_sms_templates']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists allow_all on %I', t);
    execute format('create policy allow_all on %I for all using (true) with check (true)', t);
  end loop;
end $$;

-- Seed data
insert into lhs_divisions (name, code, service_type) values
  ('Electric','EL','Installation'),('Epoxy','EP','Coating'),
  ('Closet Organization','CO','Carpentry/Install'),('Radon Mitigation','RM','Radon Services'),
  ('Radon Testing','RT','Radon Services'),('Struxure','SX','Construction'),
  ('Hunter Douglas Blinds','HDB','Window Treatments'),('Duct Cleaning','DC','HVAC'),
  ('AeroSeal','AS','HVAC'),('AIH Security & Wiring','AIH','Low Voltage / Security'),
  ('Handyman','HM','General') on conflict do nothing;

insert into lhs_vendors (name, phone, terms, category) values
  ('Home Depot Pro','1-800-430-3376','Net 30','General Hardware'),
  ('Menards','1-800-880-0318','COD','General Hardware'),
  ('Grainger','1-800-472-4643','Net 30','Industrial/Safety'),
  ('RadonAway','1-800-767-3703','Net 30','Radon'),
  ('Epoxy Systems','','Net 30','Epoxy'),
  ('ClosetMaid','','Net 45','Closet Org'),
  ('Sherwin-Williams','','Net 30','Paint/Epoxy') on conflict do nothing;

insert into lhs_locations (name, type, region, address) values
  ('Green Bay WI','Warehouse','Wisconsin','1227 S Maple Ave, Green Bay WI 54304'),
  ('Brookfield WI','Warehouse','Wisconsin','3485 N 124th St, Brookfield WI 53005'),
  ('Colorado','Warehouse','Colorado','2603 E 120th Ave, Thornton CO 80233'),
  ('VAN-GB-01','Service Van','Wisconsin',''),('VAN-BF-01','Service Van','Wisconsin',''),
  ('VAN-CO-01','Service Van','Colorado',''),('WI-R1','Service Van','Wisconsin',''),
  ('WI-R2','Service Van','Wisconsin',''),('SALES-01','Sales Vehicle','Wisconsin','')
  on conflict do nothing;

insert into lhs_users (name, email, password_hash, role, home_location) values
  ('George Booth','george@lifetimehomeservices.com','Radon2026!','God View','Green Bay WI'),
  ('Scott Campbell','scott@lifetimehomeservices.com','Scott2026!','God View','Green Bay WI'),
  ('Manager, Green Bay','gb.mgr@lhs.com','gbmgr','Location Manager','Green Bay WI')
  on conflict do nothing;

insert into lhs_items (sku, name, division, unit, vendor, unit_cost, min_qty, max_qty) values
  ('LHS-EL-001','15A Single Pole Breaker','Electric','ea','Home Depot Pro',8.49,10,50),
  ('LHS-EP-001','Epoxy Part A - 5 Gal','Epoxy','gal','Epoxy Systems',142.00,5,25),
  ('LHS-RD-001','RadonAway GP201 Fan','Radon Mitigation','ea','RadonAway',89.99,3,15),
  ('LHS-AI-001','Cat6 Cable 1000ft Spool','AIH Security & Wiring','spool','Grainger',189.00,2,10)
  on conflict do nothing;

select 'LHS Schema ready' as status;
