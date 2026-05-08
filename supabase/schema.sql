-- ============================================================
-- INTERLOCK SECURITY — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor (supabase.com > your project > SQL Editor)
-- ============================================================

-- ─── EXTENSION ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── TECHNICIANS ─────────────────────────────────────────────
create table if not exists technicians (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null unique,
  phone         text,
  specialisation text not null default 'General Security',
  status        text not null default 'active' check (status in ('active','enroute','offline')),
  lat           double precision default -26.2041,
  lng           double precision default 28.0473,
  created_at    timestamptz default now()
);

-- ─── JOBS ────────────────────────────────────────────────────
create table if not exists jobs (
  id                text primary key,           -- e.g. JC-0001
  title             text not null,
  client            text not null,
  type              text not null,
  priority          text not null default 'normal' check (priority in ('normal','high','urgent')),
  status            text not null default 'new'  check (status in ('new','in progress','completed','pending')),
  technician_name   text references technicians(name) on update cascade,  -- primary (legacy compat)
  technician_names  text[] default '{}',                                   -- all assignees (up to 3)
  address           text,
  date              date,
  description       text,
  notes             text default '',
  created_at        timestamptz default now()
);

-- Backfill technician_names for existing rows that only have technician_name
update jobs set technician_names = array[technician_name]
  where technician_name is not null and (technician_names is null or technician_names = '{}');

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

-- ─── USER PROFILES (role + technician link) ──────────────────
-- Created automatically when a Supabase Auth user is added.
-- role: 'admin' | 'technician'
-- technician_name: matches technicians.name (required when role = 'technician')
create table if not exists user_profiles (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null unique references auth.users(id) on delete cascade,
  role             text not null default 'admin' check (role in ('admin','technician')),
  technician_name  text references technicians(name) on update cascade on delete set null,
  created_at       timestamptz default now()
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
alter table user_profiles  enable row level security;

-- Helper: is the current user an admin?
create or replace function is_admin()
returns boolean language sql security definer as $$
  select coalesce(
    (select role = 'admin' from user_profiles where user_id = auth.uid()),
    true  -- no profile yet → treated as admin (first-run / legacy)
  );
$$;

-- Helper: name of the technician linked to the current user
create or replace function my_tech_name()
returns text language sql security definer as $$
  select technician_name from user_profiles where user_id = auth.uid();
$$;

-- ── technicians: admins see all; technicians see only themselves ──
create policy "Admin: full access to technicians"
  on technicians for all
  using (is_admin());

create policy "Technician: read own record"
  on technicians for select
  using (name = my_tech_name());

-- ── jobs: admins see all; technicians see only jobs they are assigned to ──
create policy "Admin: full access to jobs"
  on jobs for all
  using (is_admin());

create policy "Technician: read assigned jobs"
  on jobs for select
  using (my_tech_name() = any(technician_names));

-- ── job sub-tables: follow the same job-level visibility ──
create policy "Admin: full access to job_checklist"
  on job_checklist for all using (is_admin());

create policy "Technician: read/write own job checklist"
  on job_checklist for all
  using (
    exists (
      select 1 from jobs
      where jobs.id = job_checklist.job_id
        and my_tech_name() = any(jobs.technician_names)
    )
  );

create policy "Admin: full access to job_gps_log"
  on job_gps_log for all using (is_admin());

create policy "Technician: read own job gps log"
  on job_gps_log for select
  using (
    exists (
      select 1 from jobs
      where jobs.id = job_gps_log.job_id
        and my_tech_name() = any(jobs.technician_names)
    )
  );

create policy "Admin: full access to job_photos"
  on job_photos for all using (is_admin());

create policy "Technician: read/write own job photos"
  on job_photos for all
  using (
    exists (
      select 1 from jobs
      where jobs.id = job_photos.job_id
        and my_tech_name() = any(jobs.technician_names)
    )
  );

create policy "Admin: full access to job_signatures"
  on job_signatures for all using (is_admin());

create policy "Technician: read/write own job signatures"
  on job_signatures for all
  using (
    exists (
      select 1 from jobs
      where jobs.id = job_signatures.job_id
        and my_tech_name() = any(jobs.technician_names)
    )
  );

create policy "Admin: full access to technician_gps"
  on technician_gps for all using (is_admin());

create policy "Technician: write own gps"
  on technician_gps for insert
  with check (technician_name = my_tech_name());

-- ── user_profiles: each user can read/update their own profile ──
create policy "Users: manage own profile"
  on user_profiles for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── SEED DATA ───────────────────────────────────────────────
insert into technicians (name, phone, specialisation, status, lat, lng) values
  ('Joe',     '+27 60 100 0001', 'General Security', 'active', -26.1500, 28.0100),
  ('Brian',   '+27 60 100 0002', 'Gate & Automation','active', -26.0900, 28.0800),
  ('Tatenda', '+27 60 100 0003', 'CCTV Specialist',  'active', -26.2200, 28.0400),
  ('Tashy',   '+27 60 100 0004', 'Alarm Systems',    'active', -26.1800, 27.9900),
  ('Edward',  '+27 60 100 0005', 'Electric Fencing', 'active', -26.0600, 28.1200),
  ('Edmore',  '+27 60 100 0006', 'Electric Fencing', 'active', -26.2500, 28.0600)
on conflict do nothing;

insert into jobs (id, title, client, type, priority, status, technician_name, technician_names, address, date, description, notes) values
  ('JC-0001','Gate Motor Installation','Thabo Nkosi','Installation','high','in progress','Joe',array['Joe','Brian'],'14 Baobab St, Midrand','2026-04-04','Install CENTURION D5 Evo motor on sliding gate.',''),
  ('JC-0002','CCTV Camera Upgrade','Sandton Mall','CCTV','urgent','new','Tatenda',array['Tatenda','Tashy'],'83 Rivonia Rd, Sandton','2026-04-04','Replace 12x dome cameras with 4K Hikvision units.',''),
  ('JC-0003','Alarm Panel Repair','Mrs van der Merwe','Repair','normal','completed','Brian',array['Brian'],'7 Fynbos Cres, Randburg','2026-04-03','Faulty zone on alarm panel.','Replaced tampered zone PCB. All zones clear.'),
  ('JC-0004','Electric Fence Maintenance','Sunninghill Estate','Electric Fence','normal','pending','Edward',array['Edward','Edmore'],'Sunninghill HOA, JHB','2026-04-05','Monthly maintenance and energiser check.',''),
  ('JC-0005','Access Control System','Growthpoint Offices','Access Control','high','in progress','Tatenda',array['Tatenda'],'1 Discovery Place, Sandton','2026-04-04','Install HID card readers at 4 entry points.','Floors 1-3 complete. Floor 4 reader awaiting delivery.'),
  ('JC-0006','Panic Button Response','Mariana Costa','Alarm Response','urgent','completed','Joe',array['Joe'],'9 Hawthorne Rd, Rosebank','2026-04-04','Client activated panic. Respond and assess.','False alarm. Remote accidentally triggered.')
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

-- ─── TECHNICIAN USER ACCOUNTS ────────────────────────────────
-- After running this schema, create the following Supabase Auth users
-- in the Supabase Dashboard (Authentication > Users > Invite / Add user),
-- then insert their user_id into user_profiles.
--
-- Suggested emails and passwords (change passwords after first login):
--
--   joe@interlocksa.co.za        / Interlock@Joe1
--   brian@interlocksa.co.za      / Interlock@Brian1
--   tatenda@interlocksa.co.za    / Interlock@Tatenda1
--   tashy@interlocksa.co.za      / Interlock@Tashy1
--   edward@interlocksa.co.za     / Interlock@Edward1
--   edmore@interlocksa.co.za     / Interlock@Edmore1
--
-- Once the Auth users exist, link them to their technician records:
--
--   insert into user_profiles (user_id, role, technician_name) values
--     ('<joe_uuid>',    'technician', 'Joe'),
--     ('<brian_uuid>',  'technician', 'Brian'),
--     ('<tatenda_uuid>','technician', 'Tatenda'),
--     ('<tashy_uuid>',  'technician', 'Tashy'),
--     ('<edward_uuid>', 'technician', 'Edward'),
--     ('<edmore_uuid>', 'technician', 'Edmore')
--   on conflict do nothing;
--
-- Technicians will then only see jobs they are assigned to.
