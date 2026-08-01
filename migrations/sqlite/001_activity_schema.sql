create table if not exists activity_entries (
  id text primary key,
  resource_type text not null,
  resource_id text not null,
  resource_title text,
  action text not null,
  actor_type text not null,
  actor_id text not null,
  actor_name text not null,
  actor_avatar_url text,
  content_type text,
  content_json text,
  metadata_json text,
  created_at text not null
);

create table if not exists activity_changes (
  id text primary key,
  entry_id text not null references activity_entries(id) on delete cascade,
  position integer not null check (position >= 0),
  field text not null,
  label text not null,
  before_value text,
  after_value text,
  value_type text not null
);

create index if not exists activity_entries_resource_created_idx
  on activity_entries (resource_type, resource_id, created_at desc, id desc);

create index if not exists activity_entries_actor_idx on activity_entries (actor_id);
create index if not exists activity_entries_action_idx on activity_entries (action);
create index if not exists activity_entries_created_idx on activity_entries (created_at desc);
