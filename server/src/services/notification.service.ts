import { query } from '../db';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  titleHi?: string;
  message: string;
  messageHi?: string;
  type: string;
  relatedCaseId?: string | null;
}

export async function createNotification(params: CreateNotificationParams): Promise<any> {
  const { userId, title, titleHi, message, messageHi, type, relatedCaseId } = params;
  try {
    const res = await query(
      `INSERT INTO notifications_notification 
         (user_id, title, title_hi, message, message_hi, notification_type, related_case_id, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())
       RETURNING *;`,
      [userId, title, titleHi || null, message, messageHi || null, type, relatedCaseId || null]
    );
    return res.rows[0];
  } catch (err: any) {
    console.error('[notification.service] Failed to create notification:', err.message);
    return null;
  }
}

export async function getUserNotifications(
  userId: string,
  options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
): Promise<{ count: number; unread_count: number; results: any[] }> {
  const limit = Math.min(Math.max(options.limit || 20, 1), 100);
  const offset = Math.max(options.offset || 0, 0);

  const countRes = await query(
    `SELECT 
       COUNT(*)::int AS total_count,
       COUNT(CASE WHEN is_read = false THEN 1 END)::int AS unread_count
     FROM notifications_notification
     WHERE user_id = $1;`,
    [userId]
  );

  const totalCount = countRes.rows[0]?.total_count || 0;
  const unreadCount = countRes.rows[0]?.unread_count || 0;

  let queryText = `
    SELECT id, user_id, title, title_hi, message, message_hi, notification_type, related_case_id, is_read, created_at
    FROM notifications_notification
    WHERE user_id = $1
  `;
  const queryParams: any[] = [userId];

  if (options.unreadOnly) {
    queryText += ` AND is_read = false`;
  }

  queryText += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3;`;
  queryParams.push(limit, offset);

  const res = await query(queryText, queryParams);

  return {
    count: totalCount,
    unread_count: unreadCount,
    results: res.rows,
  };
}

export async function markNotificationAsRead(userId: string, notificationId: string): Promise<boolean> {
  const res = await query(
    `UPDATE notifications_notification
     SET is_read = true
     WHERE id = $1 AND user_id = $2
     RETURNING id;`,
    [notificationId, userId]
  );
  return res.rowCount !== null && res.rowCount > 0;
}

export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  const res = await query(
    `UPDATE notifications_notification
     SET is_read = true
     WHERE user_id = $1 AND is_read = false
     RETURNING id;`,
    [userId]
  );
  return res.rowCount || 0;
}
