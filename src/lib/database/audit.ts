import type { CurrentUserProfile } from "@/lib/database/profiles";
import { supabaseAdmin } from "@/lib/supabase/admin";

type AuditMetadata =
  | string
  | number
  | boolean
  | null
  | AuditMetadata[]
  | { [key: string]: AuditMetadata };

export async function createAuditLog({
  profile,
  action,
  entityType,
  entityId,
  metadata = {},
}: {
  profile: CurrentUserProfile;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: AuditMetadata;
}) {
  const { error } = await supabaseAdmin.from("audit_logs").insert({
    organization_id: profile.organization_id,
    branch_id: profile.branch_id,
    actor_profile_id: profile.id,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    metadata,
  });

  if (error) {
    console.error(`Failed to write audit log: ${error.message}`);
  }
}
