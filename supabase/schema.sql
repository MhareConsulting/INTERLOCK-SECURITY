-- ============================================================
-- INTERLOCK SECURITY — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor (supabase.com > your project > SQL Editor)
-- ============================================================

-- ─── EXTENSION ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── TECHNICIANS ─────────────────────────────────────────────
create table if not exists technicians (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  phone         text,
  specialisation text not null default 'General Security',
  status        text not null default 'active' check (status in ('active','enroute','offline')),
  lat           double precision default -26.2041,
  lng           double precision default 28.0473,
  created_at    timestamptz default now()
);

-- ─── JOBS ────────────────────────────────────────────────────
create table if not exists jobs (
  id              text primary key,           -- e.g. JC-0001
  title           text not null,
  client          text not null,
  type            text not null,
  priority        text not null default 'normal' check (priority in ('normal','high','urgent')),
  status          text not null default 'new'  check (status in ('new','in progress','completed','pending')),
  technician_name text references technicians(name) on update cascade,
  address         text,
  date            date,
  description     text,
  notes           text default '',
  created_at      timestamptz default now()
);

-- ─── JOB CHECKLIST ───────────────────────────────────────────
create table if not exists job_checklist (
  id          uuid primary key default uuid_generate_v4(),
  job_id      text references jobs(id) on delete cascade,
  item_label  text not null,
  checked     boolean not null default false,
  updated_at  timestamptz default now()
);

-- ─── JOB GPS LOG ─────────────────────────────────────────────
create table if not exists job_gps_log (
  id          uuid primary key default uuid_generate_v4(),
  job_id      text references jobs(id) on delete cascade,
  lat         double precision not null,
  lng         double precision not null,
  logged_at   timestamptz default now()
);

-- ─── JOB PHOTOS ──────────────────────────────────────────────
create table if not exists job_photos (
  id            uuid primary key default uuid_generate_v4(),
  job_id        text references jobs(id) on delete cascade,
  storage_path  text not null,   -- Supabase Storage object path
  uploaded_at   timestamptz default now()
);

-- ─── JOB SIGNATURES ──────────────────────────────────────────
create table if not exists job_signatures (
  id                  uuid primary key default uuid_generate_v4(),
  job_id              text unique references jobs(id) on delete cascade,
  client_name         text,
  signature_data_url  text,     -- base64 data URL of canvas drawing
  captured_at         timestamptz default now()
);

-- ─── TECHNICIAN GPS HISTORY ──────────────────────────────────
create table if not exists technician_gps (
  id               uuid primary key default uuid_generate_v4(),
  technician_name  text references technicians(name) on update cascade on delete cascade,
  lat              double precision not null,
  lng              double precision not null,
  pinged_at        timestamptz default now()
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
-- Enable RLS on all tables
alter table technicians    enable row level security;
alter table jobs           enable row level security;
alter table job_checklist  enable row level security;
alter table job_gps_log    enable row level security;
alter table job_photos     enable row level security;
alter table job_signatures enable row level security;
alter table technician_gps enable row level security;

-- Allow authenticated users full access (adjust per role as needed)
create policy "Authenticated full access" on technicians    for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on jobs           for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on job_checklist  for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on job_gps_log    for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on job_photos     for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on job_signatures for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on technician_gps for all using (auth.role() = 'authenticated');

-- ─── SEED DATA ───────────────────────────────────────────────
insert into technicians (name, phone, specialisation, status, lat, lng) values
  ('Sipho Dlamini',  '+27 82 111 2233', 'General Security', 'active',  -25.7461, 28.1881),
  ('Lerato Molefe',  '+27 71 432 8891', 'CCTV Specialist',  'enroute', -26.1076, 28.0567),
  ('Mpho Sithole',   '+27 64 567 4412', 'Access Control',   'active',  -26.0274, 27.8650),
  ('James Pretorius','+27 83 998 1155', 'Alarm Systems',    'offline', -26.1929, 28.0305)
on conflict do nothing;

insert into jobs (id, title, client, type, priority, status, technician_name, address, date, description, notes) values
  ('JC-0001','Gate Motor Installation','Thabo Nkosi','Installation','high','in progress','Sipho Dlamini','14 Baobab St, Midrand','2026-04-04','Install CENTURION D5 Evo motor on sliding gate.',''),
  ('JC-0002','CCTV Camera Upgrade','Sandton Mall','CCTV','urgent','new','Lerato Molefe','83 Rivonia Rd, Sandton','2026-04-04','Replace 12x dome cameras with 4K Hikvision units.',''),
  ('JC-0003','Alarm Panel Repair','Mrs van der Merwe','Repair','normal','completed','Mpho Sithole','7 Fynbos Cres, Randburg','2026-04-03','Faulty zone on alarm panel.','Replaced tampered zone PCB. All zones clear.'),
  ('JC-0004','Electric Fence Maintenance','Sunninghill Estate','Electric Fence','normal','pending','Sipho Dlamini','Sunninghill HOA, JHB','2026-04-05','Monthly maintenance and energiser check.',''),
  ('JC-0005','Access Control System','Growthpoint Offices','Access Control','high','in progress','Lerato Molefe','1 Discovery Place, Sandton','2026-04-04','Install HID card readers at 4 entry points.','Floors 1-3 complete. Floor 4 reader awaiting delivery.'),
  ('JC-0006','Panic Button Response','Mariana Costa','Alarm Response','urgent','completed','James Pretorius','9 Hawthorne Rd, Rosebank','2026-04-04','Client activated panic. Respond and assess.','False alarm. Remote accidentally triggered.')
on conflict do nothing;

-- Seed checklists for JC-0001
insert into job_checklist (job_id, item_label, checked) values
  ('JC-0001','Survey site',true),('JC-0001','Mount motor bracket',true),
  ('JC-0001','Wire motor',false),('JC-0001','Program remotes',false),('JC-0001','Test & handover',false)
on conflict do nothing;

insert into job_checklist (job_id, item_label, checked) values
  ('JC-0002','Remove old cameras',false),('JC-0002','Run new cabling',false),
  ('JC-0002','Install 4K cameras',false),('JC-0002','Configure NVR',false),('JC-0002','Test remote view',false)
on conflict do nothing;

insert into job_checklist (job_id, item_label, checked) values
  ('JC-0003','Diagnose fault',true),('JC-0003','Replace board',true),
  ('JC-0003','Test all zones',true),('JC-0003','Client sign-off',true)
on conflict do nothing;

insert into job_checklist (job_id, item_label, checked) values
  ('JC-0004','Inspect fence wires',false),('JC-0004','Test energiser',false),
  ('JC-0004','Clear vegetation',false),('JC-0004','Check earth stakes',false),('JC-0004','Service report',false)
on conflict do nothing;

insert into job_checklist (job_id, item_label, checked) values
  ('JC-0005','Install floor 1',true),('JC-0005','Install floor 2',true),
  ('JC-0005','Install floor 3',true),('JC-0005','Install floor 4',false),
  ('JC-0005','Configure access',false),('JC-0005','Train admin',false)
on conflict do nothing;

insert into job_checklist (job_id, item_label, checked) values
  ('JC-0006','Respond to site',true),('JC-0006','Assess threat',true),('JC-0006','Report to control',true)
on conflict do nothing;
