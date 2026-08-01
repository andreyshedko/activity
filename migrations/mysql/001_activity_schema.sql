create table if not exists activity_entries (
  id varchar(191) primary key,
  resource_type varchar(191) not null,
  resource_id varchar(191) not null,
  resource_title text,
  action varchar(191) not null,
  actor_type varchar(32) not null,
  actor_id varchar(191) not null,
  actor_name varchar(191) not null,
  actor_avatar_url text,
  content_type varchar(32),
  content_json json,
  metadata_json json,
  created_at varchar(24) not null,
  index activity_entries_resource_created_idx (resource_type, resource_id, created_at desc, id desc),
  index activity_entries_actor_idx (actor_id),
  index activity_entries_action_idx (action),
  index activity_entries_created_idx (created_at desc)
) engine = InnoDB default charset = utf8mb4 collate = utf8mb4_unicode_ci;

create table if not exists activity_changes (
  id varchar(191) primary key,
  entry_id varchar(191) not null,
  position integer unsigned not null,
  field varchar(191) not null,
  label varchar(191) not null,
  before_value json,
  after_value json,
  value_type varchar(32) not null,
  constraint activity_changes_entry_fk foreign key (entry_id)
    references activity_entries(id) on delete cascade,
  index activity_changes_entry_position_idx (entry_id, position)
) engine = InnoDB default charset = utf8mb4 collate = utf8mb4_unicode_ci;
