export type ActorType = "user" | "system" | "api" | "agent";

export type BuiltInAction =
  | "create"
  | "update"
  | "delete"
  | "archive"
  | "restore"
  | "comment"
  | "attachment";

export type Action = BuiltInAction | (string & {});

export type ValueType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "currency"
  | "user"
  | "enum"
  | "json"
  | "custom";

export type Resource = {
  type: string;
  id: string;
  title?: string;
};

export type ResourceReference = Pick<Resource, "type" | "id"> & {
  title?: string;
};

export type Actor = {
  type: ActorType;
  id: string;
  name: string;
  avatarUrl?: string;
};

export type Change = {
  field: string;
  label: string;
  before?: unknown;
  after?: unknown;
  valueType: ValueType;
};

export type CommentContent = {
  type: "comment";
  text: string;
};

export type AttachmentContent = {
  type: "attachment";
  fileName: string;
  mimeType: string;
  size: number;
  url?: string;
};

export type CustomContent = {
  type: "custom";
  [key: string]: unknown;
};

export type Content = CommentContent | AttachmentContent | CustomContent;

export type Metadata = {
  source?: string;
  version?: string;
  requestId?: string;
  ipAddress?: string;
  custom?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ActivityRecord = Readonly<{
  id: string;
  resource: Readonly<Resource>;
  action: Action;
  actor: Readonly<Actor>;
  timestamp: Date;
  changes?: readonly Readonly<Change>[];
  content?: Readonly<Content>;
  metadata?: Readonly<Metadata>;
}>;

export type TrackInput = {
  resource: ResourceReference;
  actor: Actor;
  action: Action;
  changes?: Change[];
  content?: Content;
  metadata?: Metadata;
  timestamp?: Date;
};

export type QueryOptions = {
  resource: ResourceReference;
  search?: string;
  actor?: string;
  actorId?: string;
  actions?: readonly Action[];
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
};

export type QueryResult = {
  entries: ActivityRecord[];
  total: number;
  hasMore: boolean;
};

export type StorageAdapter = {
  insert(entry: ActivityRecord): Promise<void>;
  query(options: QueryOptions): Promise<QueryResult>;
};

export type Activity = {
  track(input: TrackInput): Promise<ActivityRecord>;
  query(options: QueryOptions): Promise<ActivityRecord[]>;
};

export type ActivityOptions = {
  adapter: StorageAdapter;
  clock?: () => Date;
  idGenerator?: () => string;
};

export class ActivityError extends Error {
  readonly code: string;
  readonly field?: string;

  constructor(code: string, message: string, field?: string) {
    super(message);
    this.name = "ActivityError";
    this.code = code;
    this.field = field;
  }
}

export function createActivity({
  adapter,
  clock = () => new Date(),
  idGenerator = createId,
}: ActivityOptions): Activity {
  return {
    async track(input) {
      const record = createRecord(input, clock, idGenerator);
      await adapter.insert(record);
      return record;
    },
    async query(options) {
      const normalized = normalizeQuery(options);
      const result = await adapter.query(normalized);
      return result.entries;
    },
  };
}

export function createMemoryStorageAdapter(
  initialEntries: ActivityRecord[] = [],
  latency = 0,
): StorageAdapter {
  let entries = initialEntries.map(freezeRecord);

  return {
    async insert(entry) {
      await wait(latency);
      entries = [freezeRecord(entry), ...entries];
    },
    async query(options) {
      await wait(latency);
      const normalized = normalizeQuery(options);
      const filtered = entries
        .filter((entry) => entry.resource.type === normalized.resource.type)
        .filter((entry) => entry.resource.id === normalized.resource.id)
        .filter((entry) => matchesActions(entry, normalized.actions))
        .filter((entry) => matchesActor(entry, normalized.actorId ?? normalized.actor))
        .filter((entry) => matchesDates(entry, normalized.from, normalized.to))
        .filter((entry) => matchesSearch(entry, normalized.search))
        .sort(compareRecords);
      const offset = normalized.offset ?? 0;
      const limit = normalized.limit ?? 50;
      const page = filtered.slice(offset, offset + limit);

      return {
        entries: page,
        total: filtered.length,
        hasMore: offset + page.length < filtered.length,
      };
    },
  };
}

type Queryable = {
  query(sql: string, params?: readonly unknown[]): Promise<{ rows: unknown[] }>;
};

type ReleasableQueryable = Queryable & { release(): void };
type Connectable = Queryable & { connect(): Promise<ReleasableQueryable> };

export function postgresAdapter(client: Queryable | Connectable): StorageAdapter {
  return {
    async insert(entry) {
      const connection = "connect" in client ? await client.connect() : client;
      await connection.query("BEGIN");
      try {
        await connection.query(
          `insert into activity_entries (
            id, resource_type, resource_id, resource_title, action,
            actor_type, actor_id, actor_name, actor_avatar_url,
            content_type, content_json, metadata_json, created_at
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            entry.id,
            entry.resource.type,
            entry.resource.id,
            entry.resource.title ?? null,
            entry.action,
            entry.actor.type,
            entry.actor.id,
            entry.actor.name,
            entry.actor.avatarUrl ?? null,
            entry.content?.type ?? null,
            entry.content ? JSON.stringify(entry.content) : null,
            entry.metadata ? JSON.stringify(entry.metadata) : null,
            entry.timestamp.toISOString(),
          ],
        );

        for (const [position, change] of (entry.changes ?? []).entries()) {
          await connection.query(
            `insert into activity_changes (
              id, entry_id, position, field, label, before_value, after_value, value_type
            ) values ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              createId(),
              entry.id,
              position,
              change.field,
              change.label,
              JSON.stringify(change.before ?? null),
              JSON.stringify(change.after ?? null),
              change.valueType,
            ],
          );
        }

        await connection.query("COMMIT");
      } catch (error) {
        await connection.query("ROLLBACK");
        throw toActivityError(error, "STORAGE_FAILURE", "Could not insert activity record");
      } finally {
        if ("release" in connection && typeof connection.release === "function") {
          connection.release();
        }
      }
    },
    async query(options) {
      const normalized = normalizeQuery(options);
      const limit = normalized.limit ?? 50;
      const offset = normalized.offset ?? 0;
      const params: unknown[] = [normalized.resource.type, normalized.resource.id];
      const where = ["e.resource_type = $1", "e.resource_id = $2"];

      if (normalized.actions?.length) {
        params.push(normalized.actions);
        where.push(`e.action = any($${params.length}::text[])`);
      }

      const actorId = normalized.actorId ?? normalized.actor;
      if (actorId) {
        params.push(actorId);
        where.push(`e.actor_id = $${params.length}`);
      }

      if (normalized.from) {
        params.push(normalized.from.toISOString());
        where.push(`e.created_at >= $${params.length}`);
      }

      if (normalized.to) {
        params.push(normalized.to.toISOString());
        where.push(`e.created_at <= $${params.length}`);
      }

      if (normalized.search) {
        params.push(`%${normalized.search}%`);
        const index = params.length;
        where.push(`(
          e.actor_name ilike $${index}
          or e.resource_title ilike $${index}
          or e.content_json::text ilike $${index}
          or exists (
            select 1 from activity_changes c
            where c.entry_id = e.id
              and (
                c.label ilike $${index}
                or c.before_value::text ilike $${index}
                or c.after_value::text ilike $${index}
              )
          )
        )`);
      }

      const whereSql = where.join(" and ");
      const count = await client.query(
        `select count(*)::int as total from activity_entries e where ${whereSql}`,
        params,
      );
      params.push(limit + 1, offset);
      const rows = await client.query(
        `select
          e.*,
          coalesce(
            json_agg(
              json_build_object(
                'field', c.field,
                'label', c.label,
                'before', c.before_value,
                'after', c.after_value,
                'valueType', c.value_type
              )
              order by c.position
            ) filter (where c.id is not null),
            '[]'
          ) as changes
        from activity_entries e
        left join activity_changes c on c.entry_id = e.id
        where ${whereSql}
        group by e.id
        order by e.created_at desc, e.id desc
        limit $${params.length - 1} offset $${params.length}`,
        params,
      );

      const total = readTotal(count.rows[0]);
      const entries = rows.rows.slice(0, limit).map(mapPostgresRecord);

      return {
        entries,
        total,
        hasMore: rows.rows.length > limit,
      };
    },
  };
}

function createRecord(
  input: TrackInput,
  clock: () => Date,
  idGenerator: () => string,
): ActivityRecord {
  validateTrackInput(input);

  const record: ActivityRecord = {
    id: idGenerator(),
    resource: freezeObject({
      type: input.resource.type.trim(),
      id: input.resource.id.trim(),
      title: input.resource.title?.trim(),
    }),
    action: input.action.trim().toLowerCase() as Action,
    actor: freezeObject({ ...input.actor, name: input.actor.name.trim() }),
    timestamp: input.timestamp ? new Date(input.timestamp) : clock(),
    changes: input.changes?.map(normalizeChange).map(freezeObject),
    content: input.content ? freezeObject(input.content) : undefined,
    metadata: input.metadata ? freezeObject(input.metadata) : undefined,
  };

  return freezeRecord(record);
}

function validateTrackInput(input: TrackInput) {
  if (!input.resource?.type?.trim()) {
    throw new ActivityError("INVALID_RESOURCE", "resource.type is required", "resource.type");
  }

  if (!input.resource?.id?.trim()) {
    throw new ActivityError("INVALID_RESOURCE", "resource.id is required", "resource.id");
  }

  if (!["user", "system", "api", "agent"].includes(input.actor?.type)) {
    throw new ActivityError("INVALID_ACTOR", "actor.type is invalid", "actor.type");
  }

  if (!input.actor?.id?.trim()) {
    throw new ActivityError("INVALID_ACTOR", "actor.id is required", "actor.id");
  }

  if (!input.actor?.name?.trim()) {
    throw new ActivityError("INVALID_ACTOR", "actor.name is required", "actor.name");
  }

  if (!input.action?.trim()) {
    throw new ActivityError("INVALID_ACTION", "action is required", "action");
  }

  if (input.timestamp && Number.isNaN(input.timestamp.getTime())) {
    throw new ActivityError("INVALID_TIMESTAMP", "timestamp must be a valid Date", "timestamp");
  }

  if (input.action === "update" && !input.changes?.length) {
    throw new ActivityError("INVALID_ACTION", "update requires at least one change", "changes");
  }

  if ((input.action === "comment" || input.action === "attachment") && !input.content) {
    throw new ActivityError("INVALID_ACTION", `${input.action} requires content`, "content");
  }
}

function normalizeChange(change: Change): Change {
  if (!change.field.trim()) {
    throw new ActivityError("INVALID_CHANGE", "change.field is required", "changes.field");
  }

  if (!change.label.trim()) {
    throw new ActivityError("INVALID_CHANGE", "change.label is required", "changes.label");
  }

  return {
    ...change,
    field: change.field.trim(),
    label: change.label.trim(),
    valueType: change.valueType ?? inferValueType(change.after ?? change.before),
  };
}

function normalizeQuery(options: QueryOptions): QueryOptions {
  if (!options.resource?.type?.trim() || !options.resource?.id?.trim()) {
    throw new ActivityError("INVALID_RESOURCE", "query.resource is required", "resource");
  }

  if (options.limit !== undefined && (options.limit < 1 || options.limit > 500)) {
    throw new ActivityError("INVALID_LIMIT", "limit must be between 1 and 500", "limit");
  }

  if (options.offset !== undefined && options.offset < 0) {
    throw new ActivityError("INVALID_OFFSET", "offset must not be negative", "offset");
  }

  if (options.from && options.to && options.from > options.to) {
    throw new ActivityError("INVALID_DATE_RANGE", "from must be before to", "from");
  }

  return freezeObject({
    ...options,
    resource: freezeObject({
      type: options.resource.type.trim(),
      id: options.resource.id.trim(),
      title: options.resource.title?.trim(),
    }),
    search: options.search?.trim() || undefined,
    actor: options.actor?.trim() || undefined,
    actorId: options.actorId?.trim() || undefined,
    actions: options.actions
      ? Object.freeze(
          Array.from(
            new Set(options.actions.map((action) => action.trim().toLowerCase() as Action)),
          ),
        )
      : undefined,
    limit: options.limit ?? 50,
    offset: options.offset ?? 0,
  });
}

function matchesActions(entry: ActivityRecord, actions?: readonly Action[]) {
  return !actions?.length || actions.includes(entry.action);
}

function matchesActor(entry: ActivityRecord, actorId?: string) {
  return !actorId || entry.actor.id === actorId;
}

function matchesDates(entry: ActivityRecord, from?: Date, to?: Date) {
  return (!from || entry.timestamp >= from) && (!to || entry.timestamp <= to);
}

function matchesSearch(entry: ActivityRecord, search?: string) {
  if (!search) {
    return true;
  }

  return searchableText(entry).toLowerCase().includes(search.toLowerCase());
}

function searchableText(entry: ActivityRecord) {
  return [
    entry.action,
    entry.resource.title,
    entry.actor.name,
    entry.content ? JSON.stringify(entry.content) : "",
    ...(entry.changes ?? []).flatMap((change) => [
      change.field,
      change.label,
      stringifyValue(change.before),
      stringifyValue(change.after),
    ]),
  ].join(" ");
}

function compareRecords(a: ActivityRecord, b: ActivityRecord) {
  const time = b.timestamp.getTime() - a.timestamp.getTime();
  return time || b.id.localeCompare(a.id);
}

function inferValueType(value: unknown): ValueType {
  if (value instanceof Date) {
    return "date";
  }

  const valueType = typeof value;
  if (valueType === "string" || valueType === "number" || valueType === "boolean") {
    return valueType;
  }

  return "json";
}

function freezeRecord(record: ActivityRecord): ActivityRecord {
  return freezeObject({
    ...record,
    resource: freezeObject(record.resource),
    actor: freezeObject(record.actor),
    changes: record.changes?.map((change) => freezeObject(change)),
    content: record.content ? freezeObject(record.content) : undefined,
    metadata: record.metadata ? freezeObject(record.metadata) : undefined,
  });
}

function freezeObject<T extends object>(value: T): Readonly<T> {
  return Object.freeze(value);
}

function stringifyValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return typeof value === "string" ? value : JSON.stringify(value);
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `act_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function wait(ms: number) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

function readTotal(row: unknown) {
  if (isRecord(row) && typeof row.total === "number") {
    return row.total;
  }

  if (isRecord(row) && typeof row.total === "string") {
    return Number(row.total);
  }

  return 0;
}

function mapPostgresRecord(row: unknown): ActivityRecord {
  if (!isRecord(row)) {
    throw new ActivityError("STORAGE_FAILURE", "Invalid activity row returned by storage");
  }

  return freezeRecord({
    id: String(row.id),
    resource: {
      type: String(row.resource_type),
      id: String(row.resource_id),
      title: typeof row.resource_title === "string" ? row.resource_title : undefined,
    },
    action: String(row.action) as Action,
    actor: {
      type: String(row.actor_type) as ActorType,
      id: String(row.actor_id),
      name: String(row.actor_name),
      avatarUrl: typeof row.actor_avatar_url === "string" ? row.actor_avatar_url : undefined,
    },
    timestamp: new Date(String(row.created_at)),
    changes: Array.isArray(row.changes) ? row.changes.map(mapPostgresChange) : undefined,
    content: isContent(row.content_json) ? row.content_json : undefined,
    metadata: isRecord(row.metadata_json) ? row.metadata_json : undefined,
  });
}

function mapPostgresChange(change: unknown): Change {
  if (!isRecord(change)) {
    throw new ActivityError("STORAGE_FAILURE", "Invalid change row returned by storage");
  }

  return {
    field: String(change.field),
    label: String(change.label),
    before: change.before,
    after: change.after,
    valueType: String(change.valueType) as ValueType,
  };
}

function isContent(value: unknown): value is Content {
  return isRecord(value) && typeof value.type === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toActivityError(error: unknown, code: string, fallback: string) {
  if (error instanceof ActivityError) {
    return error;
  }

  if (error instanceof Error) {
    return new ActivityError(code, error.message);
  }

  return new ActivityError(code, fallback);
}
