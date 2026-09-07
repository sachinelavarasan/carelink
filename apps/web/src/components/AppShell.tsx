import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '../lib/auth';
import { ThemeToggle } from '../theme/ThemeToggle';
import { Avatar } from './Avatar';
import { Logo } from './Logo';
import { RoleBadge } from './RoleBadge';
import { Button } from './ui/button';

const navLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-full px-3 py-1 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  );

export function AppShell({ children }: { children: ReactNode }) {
  const { me, logout } = useAuth();
  const isDoctor = me?.user.role === 'DOCTOR';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center gap-5 border-b border-border px-5 py-3">
        <NavLink to="/" aria-label="CareLink home">
          <Logo size="sm" />
        </NavLink>
        <nav className="flex flex-1 items-center gap-1">
          <NavLink to="/" end className={navLink}>
            Dashboard
          </NavLink>
          <NavLink to="/appointments" className={navLink}>
            Appointments
          </NavLink>
          {!isDoctor && (
            <NavLink to="/doctors" className={navLink}>
              Find a doctor
            </NavLink>
          )}
          {!isDoctor && (
            <NavLink to="/my-doctors" className={navLink}>
              My doctors
            </NavLink>
          )}
          {isDoctor && (
            <NavLink to="/patients" className={navLink}>
              Patients
            </NavLink>
          )}
          {isDoctor && (
            <NavLink to="/availability" className={navLink}>
              Availability
            </NavLink>
          )}
        </nav>

        {me && (
          <NavLink
            to="/profile"
            title="Your profile"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-full border py-1 pr-2.5 pl-1 transition-colors',
                isActive
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border hover:bg-muted',
              )
            }
          >
            <Avatar name={me.user.fullName} src={me.user.avatarUrl} size="sm" />
            <span className="hidden items-center gap-2 sm:flex">
              <span className="max-w-[14ch] truncate text-sm font-medium">
                {me.user.fullName}
              </span>
              <RoleBadge role={me.user.role} />
            </span>
          </NavLink>
        )}

        <ThemeToggle />
        <Button variant="outline" size="sm" onClick={() => void logout()}>
          Sign out
        </Button>
      </header>
      <main className="my-7 w-full px-5 sm:px-6 lg:px-10">{children}</main>
    </div>
  );
}
