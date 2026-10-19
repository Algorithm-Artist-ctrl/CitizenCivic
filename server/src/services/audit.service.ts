import crypto from 'crypto';
import { query } from '../db';

export interface AuditLogEntry {
  actor_id?: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  changes?: Record<string, any> | null;
  ip_address?: string | null;
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  const id = crypto.randomUUID();
  try {
    await query(
      `INSERT INTO core_auditlog 
       (id, actor_id, action, resource_type, resource_id, changes, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        id,
        entry.actor_id || null,
        entry.action,
        entry.resource_type,
        entry.resource_id,
        entry.changes ? JSON.stringify(entry.changes) : null,
        entry.ip_address || null,
      ]
    );
  } catch (err: any) {
    console.error('[audit] Failed to write audit log:', err.message);
  }
}
