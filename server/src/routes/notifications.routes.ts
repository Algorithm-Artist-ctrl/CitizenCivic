import { Router, Request, Response } from 'express';
import { authenticateToken } from '../auth/middleware';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notification.service';

const router = Router();

// GET /api/v1/notifications — Paginated list of notifications + unread count
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const unreadOnly = req.query.unread === 'true';

    const data = await getUserNotifications(user.id, { limit, offset, unreadOnly });
    res.json(data);
  } catch (err: any) {
    console.error('[notifications/list] Error:', err);
    res.status(500).json({ detail: 'Failed to retrieve notifications.' });
  }
});

// POST /api/v1/notifications/:id/read — Mark a single notification as read
router.post('/:id/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const notificationId = req.params.id;

    const success = await markNotificationAsRead(user.id, notificationId);
    if (!success) {
      res.status(404).json({ detail: 'Notification not found or already read.' });
      return;
    }

    res.json({ success: true, id: notificationId, is_read: true });
  } catch (err: any) {
    console.error('[notifications/mark-read] Error:', err);
    res.status(500).json({ detail: 'Failed to update notification status.' });
  }
});

// POST /api/v1/notifications/mark-all-read — Mark all notifications as read
router.post('/mark-all-read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const updatedCount = await markAllNotificationsAsRead(user.id);
    res.json({ success: true, updated_count: updatedCount });
  } catch (err: any) {
    console.error('[notifications/mark-all-read] Error:', err);
    res.status(500).json({ detail: 'Failed to mark all notifications as read.' });
  }
});

export default router;
