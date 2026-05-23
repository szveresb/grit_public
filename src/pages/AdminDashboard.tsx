import { Navigate, useNavigate } from 'react-router-dom';
import type { ComponentType } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserRole } from '@/hooks/useUserRole';
import {
  FLibrary,
  FUsers,
  FMessageCircle,
  FFileText,
  FHome,
  FHeartPulse,
} from '@/components/icons/FreudIcons';

interface AdminWidget {
  key: string;
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { t, localePath } = useLanguage();
  const { hasRole, hasAnyRole, loading } = useUserRole();

  const isAdmin = hasRole('admin');
  const canManageLibrary = hasAnyRole('admin', 'editor', 'guest_editor');
  const canManageQuestionnaires = hasAnyRole('admin', 'editor');
  const canManageLanding = hasAnyRole('admin', 'editor');

  if (loading) {
    return (
      <DashboardLayout>
        <p className="text-sm text-muted-foreground">{t.loading}</p>
      </DashboardLayout>
    );
  }

  if (!isAdmin && !canManageLibrary && !canManageQuestionnaires && !canManageLanding) {
    return <Navigate to={localePath('/journal')} replace />;
  }

  const widgets: AdminWidget[] = [
    ...(canManageLibrary
      ? [{
          key: 'library',
          title: t.nav.manageLibrary,
          description: t.admin.dashboard.libraryDesc,
          href: '/admin/library',
          icon: FLibrary,
        }]
      : []),
    ...(canManageQuestionnaires
      ? [{
          key: 'questionnaires',
          title: t.nav.manageQuestionnaires,
          description: t.admin.dashboard.questionnairesDesc,
          href: '/admin/questionnaires',
          icon: FFileText,
        }]
      : []),
    ...(canManageLanding
      ? [{
          key: 'landing',
          title: t.nav.manageLanding,
          description: t.admin.dashboard.landingDesc,
          href: '/admin/landing',
          icon: FHome,
        }]
      : []),
    ...(isAdmin
      ? [
          {
            key: 'users',
            title: t.nav.manageUsers,
            description: t.admin.dashboard.usersDesc,
            href: '/admin/users',
            icon: FUsers,
          },
          {
            key: 'feedback',
            title: t.nav.manageFeedback,
            description: t.admin.dashboard.feedbackDesc,
            href: '/admin/feedback',
            icon: FMessageCircle,
          },
          {
            key: 'monitoring',
            title: t.nav.monitoring,
            description: t.admin.dashboard.monitoringDesc,
            href: '/admin/monitoring',
            icon: FHeartPulse,
          },
        ]
      : []),
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <header>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{t.admin.dashboard.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.admin.dashboard.subtitle}</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {widgets.map((widget) => (
            <button
              key={widget.key}
              type="button"
              onClick={() => navigate(localePath(widget.href))}
              className="surface-card p-5 text-left transition-colors hover:border-border h-full"
            >
              <widget.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-4 text-sm font-semibold text-foreground">{widget.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{widget.description}</p>
            </button>
          ))}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
