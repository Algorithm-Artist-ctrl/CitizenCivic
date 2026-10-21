import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  CheckCheck,
  Award,
  AlertCircle,
  FileText,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import apiClient from '../api/client';
import type { InAppNotification, NotificationResponse } from '../types';

function formatRelativeTime(dateString: string, lang: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) {
      return lang === 'hi' ? 'अभी' : 'just now';
    }
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) {
      return lang === 'hi' ? `${diffMin} मि॰ पहले` : `${diffMin}m ago`;
    }
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) {
      return lang === 'hi' ? `${diffHours} घंटे पहले` : `${diffHours}h ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return lang === 'hi' ? `${diffDays} दिन पहले` : `${diffDays}d ago`;
    }
    return date.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export const NotificationDropdown: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get<NotificationResponse>('/notifications', {
        params: { limit: 20 },
      });
      setNotifications(res.data.results || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.warn('[NotificationDropdown] Could not fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Periodic check every 45s for fresh notifications
    const interval = setInterval(() => {
      fetchNotifications();
    }, 45000);

    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notif: InAppNotification) => {
    if (!notif.is_read) {
      try {
        await apiClient.post(`/notifications/${notif.id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.warn('[NotificationDropdown] Error marking as read:', err);
      }
    }

    if (notif.related_case_id) {
      setIsOpen(false);
      navigate(`/cases/${notif.related_case_id}`);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    try {
      setIsMarkingAll(true);
      await apiClient.post('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('[NotificationDropdown] Error marking all read:', err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const isHindi = i18n.language === 'hi';

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'CASE_RESOLVED':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case 'REWARD_EARNED':
        return <Award className="h-4 w-4 text-amber-500" />;
      case 'CASE_CREATED':
        return <FileText className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-indigo-500" />;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) {
            fetchNotifications();
          }
        }}
        aria-label={t('nav.notifications', 'Notifications')}
        aria-expanded={isOpen}
        className="relative h-9 w-9 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center leading-none animate-in fade-in zoom-in duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 z-50 overflow-hidden text-xs">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">
                {t('notifications.title', 'Notifications')}
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold text-[10px]">
                  {unreadCount} {t('notifications.unread', 'unread')}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isMarkingAll ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5" />
                )}
                {t('notifications.markAllRead', 'Mark all read')}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {isLoading && notifications.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                <span className="text-xs">{t('common.loading', 'Loading...')}</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-center text-slate-400 gap-2">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="font-semibold text-slate-700 text-xs">
                  {t('notifications.emptyTitle', 'No notifications yet')}
                </p>
                <p className="text-[11px] text-slate-500 max-w-[200px]">
                  {t('notifications.emptySubtitle', 'Updates on your reported cases and karma points will appear here.')}
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const title = isHindi && notif.title_hi ? notif.title_hi : notif.title;
                const message = isHindi && notif.message_hi ? notif.message_hi : notif.message;
                const relativeTime = formatRelativeTime(notif.created_at, i18n.language);

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-slate-50 ${
                      !notif.is_read ? 'bg-emerald-50/40' : 'bg-white'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5 p-1.5 rounded-lg bg-white border border-slate-200/80 shadow-xs">
                      {getNotificationIcon(notif.notification_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs truncate ${!notif.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                          {title}
                        </p>
                        {!notif.is_read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-snug">
                        {message}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 inline-block">
                        {relativeTime}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
