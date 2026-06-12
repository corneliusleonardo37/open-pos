import type { CurrentUserProfile } from "@/lib/database/profiles";
import { supabaseAdmin } from "@/lib/supabase/admin";

const jakartaUtcOffsetMs = 7 * 60 * 60 * 1000;

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type AuditLogFilters = {
  startDate: string;
  endDate: string;
  action: string;
  entityType: string;
  keyword: string;
};

export type AuditLogEntry = {
  id: string;
  actor_name: string;
  actor_profile_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: JsonValue;
  created_at: string;
};

type AuditLogRow = {
  id: string;
  actor_profile_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: JsonValue;
  created_at: string;
};

function normalizeDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "";
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }

  return value;
}

function dateStringToJakartaUtc(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day) - jakartaUtcOffsetMs);
}

function getDateRange(filters: AuditLogFilters) {
  const startDate = normalizeDate(filters.startDate);
  const endDate = normalizeDate(filters.endDate);
  const start = startDate ? dateStringToJakartaUtc(startDate) : null;
  const endStart = endDate ? dateStringToJakartaUtc(endDate) : null;
  const end = endStart
    ? new Date(endStart.getTime() + 24 * 60 * 60 * 1000)
    : null;

  if (start && end && end.getTime() < start.getTime()) {
    return {
      start: start.toISOString(),
      end: new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  return {
    start: start?.toISOString() ?? "",
    end: end?.toISOString() ?? "",
  };
}

function normalizeText(value: string | undefined) {
  return (value ?? "").trim();
}

export function resolveAuditLogFilters({
  startDate,
  endDate,
  action,
  entityType,
  keyword,
}: {
  startDate?: string;
  endDate?: string;
  action?: string;
  entityType?: string;
  keyword?: string;
}): AuditLogFilters {
  const normalizedStartDate = normalizeDate(startDate);
  const normalizedEndDate = normalizeDate(endDate);

  if (
    normalizedStartDate &&
    normalizedEndDate &&
    normalizedEndDate.localeCompare(normalizedStartDate) < 0
  ) {
    return {
      startDate: normalizedStartDate,
      endDate: normalizedStartDate,
      action: normalizeText(action),
      entityType: normalizeText(entityType),
      keyword: normalizeText(keyword),
    };
  }

  return {
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
    action: normalizeText(action),
    entityType: normalizeText(entityType),
    keyword: normalizeText(keyword),
  };
}

async function getActorNames(
  organizationId: string,
  actorIds: Array<string | null>,
) {
  const uniqueActorIds = Array.from(
    new Set(actorIds.filter((id): id is string => Boolean(id))),
  );

  if (uniqueActorIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name")
    .eq("organization_id", organizationId)
    .in("id", uniqueActorIds);

  if (error) {
    throw new Error(`Gagal membaca nama actor: ${error.message}`);
  }

  return new Map(
    (data ?? []).map((profile) => [
      String(profile.id),
      String(profile.full_name),
    ]),
  );
}

function matchesKeyword(log: AuditLogRow, keyword: string) {
  if (!keyword) {
    return true;
  }

  const normalizedKeyword = keyword.toLowerCase();
  const searchableText = [
    log.action,
    log.entity_type,
    log.entity_id ?? "",
    JSON.stringify(log.metadata),
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(normalizedKeyword);
}

export async function getAuditLogs(
  profile: CurrentUserProfile,
  filters: AuditLogFilters,
) {
  const range = getDateRange(filters);
  const queryLimit = filters.keyword ? 500 : 100;
  let query = supabaseAdmin
    .from("audit_logs")
    .select(
      "id, actor_profile_id, action, entity_type, entity_id, metadata, created_at",
    )
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })
    .limit(queryLimit);

  if (range.start) {
    query = query.gte("created_at", range.start);
  }

  if (range.end) {
    query = query.lt("created_at", range.end);
  }

  if (filters.action) {
    query = query.ilike("action", `%${filters.action}%`);
  }

  if (filters.entityType) {
    query = query.ilike("entity_type", `%${filters.entityType}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Gagal membaca audit log: ${error.message}`);
  }

  const rows = ((data ?? []) as AuditLogRow[])
    .filter((log) => matchesKeyword(log, filters.keyword))
    .slice(0, 100);
  const actorNames = await getActorNames(
    profile.organization_id,
    rows.map((log) => log.actor_profile_id),
  );

  return rows.map((log) => ({
    id: log.id,
    actor_profile_id: log.actor_profile_id,
    actor_name: log.actor_profile_id
      ? actorNames.get(log.actor_profile_id) ?? "User"
      : "System",
    action: log.action,
    entity_type: log.entity_type,
    entity_id: log.entity_id,
    metadata: log.metadata,
    created_at: log.created_at,
  }));
}
