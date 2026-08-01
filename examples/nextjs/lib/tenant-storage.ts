import type {
  ActivityRecord,
  QueryResult,
  StorageAdapter,
} from "@feedclip/activity";

const separator = "\u001f";

export function createTenantAdapter(adapter: StorageAdapter, tenantId: string): StorageAdapter {
  const prefix = `${tenantId}${separator}`;
  return {
    insert: (entry) => adapter.insert(withResourceId(entry, `${prefix}${entry.resource.id}`)),
    async query(options) {
      const result = await adapter.query({
        ...options,
        resource: { ...options.resource, id: `${prefix}${options.resource.id}` },
      });
      return mapResult(result, prefix);
    },
  };
}

function mapResult(result: QueryResult, prefix: string): QueryResult {
  return {
    ...result,
    entries: result.entries.map((entry) => {
      if (!entry.resource.id.startsWith(prefix)) throw new Error("Tenant boundary violation");
      return withResourceId(entry, entry.resource.id.slice(prefix.length));
    }),
  };
}

function withResourceId(entry: ActivityRecord, id: string): ActivityRecord {
  return { ...entry, resource: { ...entry.resource, id } };
}
