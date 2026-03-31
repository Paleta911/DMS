import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Files,
  Shield,
  FolderCog,
  UserCog,
  FileLock2,
  ClipboardList,
  User,
  KeyRound,
  UserPlus,
  ClipboardCheck,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Button } from './ui/Button';
import { getHealth } from '../api/endpoints/auth';
import { Pill } from './ui/Badge';
import { bsmLogoUrl } from '../utils/brand';
import { translateRole } from '../utils/labels';
import {
  buildStaggerContainer,
  buildStaggerItem,
  PAGE_VARIANTS,
  TRANSITION,
} from './ui/Motion';
import { ThemeToggle } from './ui/ThemeToggle';
import { queryKeys } from '../app/queryKeys';
import { useOperationalNotifications } from '../hooks/useOperationalNotifications';
import { NotificationCenter } from './notifications/NotificationCenter';
import { useFeatureFlag } from '../features/FeatureFlagsProvider';
import { useI18n } from '../i18n/I18nProvider';
import { LanguageToggle } from './ui/LanguageToggle';

const baseLink =
  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition';

export function AppShell() {
  const { user, logout, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const navVariants = buildStaggerContainer(0.05, 0.04);
  const navItemVariants = buildStaggerItem(8);
  const showHealth = import.meta.env.DEV;
  const notifications = useOperationalNotifications(user, isAdmin);
  const notificationsEnabled = useFeatureFlag('notifications');
  const darkModeEnabled = useFeatureFlag('dark-mode');
  const analyticsEnabled = useFeatureFlag('admin-analytics');
  const i18nEnabled = useFeatureFlag('i18n');
  const { t } = useI18n();
  const healthQuery = useQuery({
    queryKey: queryKeys.health,
    queryFn: getHealth,
    enabled: showHealth,
    staleTime: 15000,
    gcTime: 60000,
    refetchInterval: () => (document.visibilityState === 'visible' ? 15000 : false),
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="skip-link absolute left-4 top-4 z-50 rounded-full bg-brand-surface px-4 py-2 text-sm font-semibold text-brand-primary shadow-soft"
      >
        {t('app.skipContent')}
      </a>
      <AnimatePresence>
        {sidebarOpen ? (
          <motion.div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        ) : null}
      </AnimatePresence>
      <div className="mx-auto flex min-h-screen max-w-[1400px] gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <aside
          aria-label="Navegación principal"
          className={[
            'fixed inset-y-0 left-0 z-40 flex w-72 flex-col gap-6 border border-brand-border bg-brand-surface/95 p-4 shadow-soft backdrop-blur transition-transform md:static md:h-dvh md:translate-x-0 md:w-64',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {bsmLogoUrl ? (
                <img src={bsmLogoUrl} alt="BSM" className="h-10 w-10 object-contain" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-sm font-bold text-white">
                  BSM
                </div>
              )}
              <div>
                <div className="font-display text-lg text-brand-primary">BSM</div>
                <div className="text-xs uppercase tracking-[0.2em] text-brand-textMuted">
                  DMS SIG
                </div>
              </div>
            </div>
            <button
              type="button"
              className="rounded-full border border-brand-border p-2 text-brand-textMuted md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar menú"
              aria-controls="main-navigation"
              aria-expanded={sidebarOpen}
            >
              <X size={16} />
            </button>
          </div>
          <motion.nav
            id="main-navigation"
            className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1"
            initial={reduceMotion ? false : 'hidden'}
            animate="show"
            variants={navVariants}
          >
            <motion.div variants={navItemVariants}>
              <NavLink
                to="/documents"
                className={({ isActive }) =>
                  `${baseLink} ${
                    isActive
                      ? 'bg-brand-primary text-white'
                      : 'text-brand-text hover:bg-brand-bg'
                  }`
                }
              >
                <Files size={18} /> {t('app.nav.documents')}
              </NavLink>
            </motion.div>
            <motion.div variants={navItemVariants}>
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `${baseLink} ${
                    isActive
                      ? 'bg-brand-primary text-white'
                      : 'text-brand-text hover:bg-brand-bg'
                  }`
                }
              >
                <User size={18} /> {t('app.nav.profile')}
              </NavLink>
            </motion.div>
            {!user?.isSuperAdmin ? (
              <motion.div variants={navItemVariants}>
                <NavLink
                  to="/permissions/request"
                  className={({ isActive }) =>
                    `${baseLink} ${
                      isActive
                        ? 'bg-brand-primary text-white'
                        : 'text-brand-text hover:bg-brand-bg'
                    }`
                  }
                  >
                    <KeyRound size={18} /> {t('app.nav.permissionRequests')}
                  </NavLink>
                </motion.div>
              ) : null}
            {isAdmin ? (
              <motion.div variants={navItemVariants} className="mt-4">
                <div className="mb-2 text-xs uppercase tracking-[0.2em] text-brand-textMuted">
                  {t('app.nav.admin')}
                </div>
                <div className="flex flex-col gap-2">
                  <NavLink
                    to="/admin/categories"
                    className={({ isActive }) =>
                      `${baseLink} ${
                        isActive
                          ? 'bg-brand-primary text-white'
                          : 'text-brand-text hover:bg-brand-bg'
                      }`
                    }
                  >
                    <FolderCog size={18} /> {t('app.nav.categories')}
                  </NavLink>
                  <NavLink
                    to="/admin/types-areas"
                    className={({ isActive }) =>
                      `${baseLink} ${
                        isActive
                          ? 'bg-brand-primary text-white'
                          : 'text-brand-text hover:bg-brand-bg'
                      }`
                    }
                  >
                    <FileLock2 size={18} /> {t('app.nav.typesAreas')}
                  </NavLink>
                  <NavLink
                    to="/admin/users-areas"
                    className={({ isActive }) =>
                      `${baseLink} ${
                        isActive
                          ? 'bg-brand-primary text-white'
                          : 'text-brand-text hover:bg-brand-bg'
                      }`
                    }
                  >
                    <UserCog size={18} /> {t('app.nav.usersAreas')}
                  </NavLink>
                  <NavLink
                    to="/admin/audit-logs"
                    className={({ isActive }) =>
                      `${baseLink} ${
                        isActive
                          ? 'bg-brand-primary text-white'
                          : 'text-brand-text hover:bg-brand-bg'
                      }`
                    }
                  >
                    <ClipboardList size={18} /> {t('app.nav.audit')}
                  </NavLink>
                  {analyticsEnabled ? (
                    <NavLink
                      to="/admin/analytics"
                      className={({ isActive }) =>
                        `${baseLink} ${
                          isActive
                            ? 'bg-brand-primary text-white'
                            : 'text-brand-text hover:bg-brand-bg'
                        }`
                      }
                    >
                      <Shield size={18} /> {t('app.nav.analytics')}
                    </NavLink>
                  ) : null}
                  <NavLink
                    to="/admin/registrations"
                    className={({ isActive }) =>
                      `${baseLink} ${
                        isActive
                          ? 'bg-brand-primary text-white'
                          : 'text-brand-text hover:bg-brand-bg'
                      }`
                    }
                  >
                    <UserPlus size={18} /> {t('app.nav.registrations')}
                  </NavLink>
                  <NavLink
                    to="/admin/permission-requests"
                    className={({ isActive }) =>
                      `${baseLink} ${
                        isActive
                          ? 'bg-brand-primary text-white'
                          : 'text-brand-text hover:bg-brand-bg'
                      }`
                    }
                  >
                    <ClipboardCheck size={18} /> {t('app.nav.requests')}
                  </NavLink>
                </div>
              </motion.div>
            ) : null}
          </motion.nav>
          <div className="mt-auto rounded-xl border border-brand-border bg-brand-bg px-3 py-3 text-sm">
            <div className="text-xs uppercase tracking-widest text-brand-textMuted">
              {t('app.user.label')}
            </div>
            <div className="mt-1 truncate font-semibold text-brand-text">{user?.email ?? '-'}</div>
            <div className="text-xs text-brand-textMuted">
              {t('app.role.label')}: {translateRole(user?.role)}
            </div>
            <Button className="mt-3 w-full" variant="outline" onClick={logout}>
              {t('app.logout')}
            </Button>
          </div>
        </aside>
        <main id="main-content" tabIndex={-1} className="flex min-w-0 flex-1 flex-col gap-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-full border border-brand-border bg-brand-surface p-2 text-brand-textMuted md:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Abrir menú"
                aria-controls="main-navigation"
                aria-expanded={sidebarOpen}
              >
                <Menu size={18} />
              </button>
              <div>
                <h1 className="font-display text-xl text-brand-primary sm:text-2xl">
                  {t('app.header.title')}
                </h1>
                <p className="text-sm text-brand-textMuted">{t('app.header.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {notificationsEnabled ? (
                <NotificationCenter
                  notifications={notifications.notifications}
                  unreadCount={notifications.unreadCount}
                  isLoading={notifications.isLoading}
                  isUnread={notifications.isUnread}
                  onRead={notifications.markAsRead}
                  onReadAll={notifications.markAllAsRead}
                />
              ) : null}
              {darkModeEnabled ? <ThemeToggle /> : null}
              {i18nEnabled ? <LanguageToggle /> : null}
              <div className="flex items-center gap-3 rounded-full border border-brand-border bg-brand-surface px-4 py-2 text-sm text-brand-text">
                <Shield size={16} className="text-bsm-hippieGreen" />
                {t('app.session.active')}
              </div>
            </div>
          </header>
          {showHealth ? (
            <div
              role="status"
              aria-live="polite"
              className="card flex flex-wrap items-center gap-3 px-4 py-3 text-xs text-brand-textMuted"
            >
              <span className="text-xs uppercase tracking-[0.2em] text-brand-textMuted">Backend</span>
              <Pill tone={healthQuery.data?.db === 'up' ? 'DB_UP' : 'DB_DOWN'}>
                DB: {healthQuery.data?.db ?? '-'}
              </Pill>
              <Pill tone={healthQuery.data?.es === 'up' ? 'ES_UP' : 'ES_DOWN'}>
                ES: {healthQuery.data?.es ?? '-'}
              </Pill>
              <span className="text-xs text-brand-textMuted">
                idSolicitud: {healthQuery.data?.requestId ?? '-'}
              </span>
            </div>
          ) : null}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              className="min-h-0"
              initial={reduceMotion ? false : PAGE_VARIANTS.initial}
              animate={PAGE_VARIANTS.animate}
              exit={reduceMotion ? { opacity: 0 } : PAGE_VARIANTS.exit}
              transition={TRANSITION}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
