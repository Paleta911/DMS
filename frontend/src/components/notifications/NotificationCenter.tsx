import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "../ui/Button";
import type { OperationalNotification } from "../../hooks/useOperationalNotifications";
import { useI18n } from "../../i18n/I18nProvider";
import { useFeatureFlag } from "../../features/FeatureFlagsProvider";

export function NotificationCenter({
  notifications,
  unreadCount,
  isLoading,
  isUnread,
  onRead,
  onReadAll,
}: {
  notifications: OperationalNotification[];
  unreadCount: number;
  isLoading?: boolean;
  isUnread: (signature: string) => boolean;
  onRead: (signature: string) => void;
  onReadAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { t } = useI18n();
  const notificationsEnabled = useFeatureFlag("notifications");

  useEffect(() => {
    if (!open) {
      return;
    }
    // Close popup on outside click or Escape for keyboard/mouse accessibility.
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  if (!notificationsEnabled) {
    return null;
  }

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        aria-label={
          unreadCount > 0
            ? t("notifications.openWithCount", { unreadCount })
            : t("notifications.open")
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((prev) => !prev)}
        className="relative px-3"
      >
        <Bell size={16} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-brand-primary px-1 text-[11px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div
          role="dialog"
          aria-label={t("notifications.dialogLabel")}
          className="absolute right-0 z-30 mt-2 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3 rounded-2xl border border-brand-border bg-brand-surface p-3 shadow-soft"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-brand-text">
                {t("notifications.title")}
              </div>
              <div className="text-xs text-brand-textMuted">
                {t("notifications.subtitle")}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onReadAll();
                setOpen(false);
              }}
              disabled={notifications.length === 0}
            >
              {t("notifications.markAll")}
            </Button>
          </div>

          {isLoading ? (
            <div className="rounded-xl border border-brand-border bg-brand-bg/60 px-3 py-4 text-sm text-brand-textMuted">
              {t("notifications.loading")}
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-xl border border-brand-border bg-brand-bg/60 px-3 py-4 text-sm text-brand-textMuted">
              {t("notifications.empty")}
            </div>
          ) : (
            <ul className="flex max-h-[420px] flex-col gap-2 overflow-y-auto">
              {notifications.map((notification) => {
                const unread = isUnread(notification.signature);
                const toneClass =
                  notification.tone === "success"
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : notification.tone === "warning"
                      ? "border-amber-500/30 bg-amber-500/10"
                      : "border-brand-border bg-brand-bg/60";
                return (
                  <li key={notification.id} className="list-none">
                    <Link
                      to={notification.href}
                      className={`flex flex-col gap-1 rounded-xl border px-3 py-3 text-sm transition hover:border-brand-primary ${toneClass}`}
                      onClick={() => {
                        // Mark notification read when user navigates from it.
                        onRead(notification.signature);
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-semibold text-brand-text">
                          {notification.title}
                        </span>
                        {!unread ? null : (
                          <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[11px] font-semibold text-brand-primary">
                            {t("notifications.new")}
                          </span>
                        )}
                      </div>
                      <span className="text-brand-textMuted">
                        {notification.description}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
