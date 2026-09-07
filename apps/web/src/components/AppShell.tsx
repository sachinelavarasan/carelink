import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '../lib/auth';
import { ThemeToggle } from '../theme/ThemeToggle';
import { Button } from './ui/button';

const navLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-1 py-0.5 text-sm transition-colors',
    isActive ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground',
  );

export function AppShell({ children }: { children: ReactNode }) {
  const { me, logout } = useAuth();
  const isDoctor = me?.user.role === 'DOCTOR';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center gap-5 border-b border-border px-5 py-3">
        <strong className="text-base font-semibold">CareLink</strong>
        <nav className="flex flex-1 items-center gap-4">
          <NavLink to="/" end className={navLink}>
            Home
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
            <NavLink to="/history" className={navLink}>
              History
            </NavLink>
          )}
          {isDoctor && (
            <NavLink to="/availability" className={navLink}>
              Availability
            </NavLink>
          )}
          <NavLink to="/profile" className={navLink}>
            Profile
          </NavLink>
        </nav>
        <ThemeToggle />
        <Button variant="outline" size="sm" onClick={() => void logout()}>
          Sign out
        </Button>
      </header>
      <main className="my-7 w-full px-5 sm:px-6 lg:px-10">{children}</main>
    </div>
  );
}
