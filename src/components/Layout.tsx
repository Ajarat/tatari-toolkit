import { Toast } from '@heroui/react';
import { BookOpen, CalendarDays, PawPrint, Settings } from 'lucide-react';
import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { SyncConflictDialog } from './SyncConflictDialog';
import { TatariEditor } from './TatariEditor';

const NAV = [
  { to: '/', label: 'Calendar', icon: CalendarDays, end: true },
  { to: '/tatari', label: 'My Tatari', icon: PawPrint, end: false },
  { to: '/evolutions', label: 'Trials', icon: BookOpen, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
];

export default function Layout() {
  const { pathname } = useLocation();
  // Card grids use the full width; reading pages stay narrow.
  const wide = pathname.startsWith('/tatari') || pathname.startsWith('/evolutions');
  const width = wide ? 'max-w-6xl' : 'max-w-3xl';
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-separator bg-background/85 backdrop-blur">
        <div className={`mx-auto flex h-14 ${width} items-center gap-4 px-4`}>
          <NavLink to="/" className="flex items-center gap-2 font-semibold">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-7" />
            <span>Stratari</span>
          </NavLink>
          <nav className="ml-auto hidden gap-1 sm:flex">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm transition-colors ${isActive ? 'bg-surface text-foreground' : 'text-muted hover:text-foreground'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className={`mx-auto w-full ${width} flex-1 px-4 pt-6 pb-28 sm:px-6 sm:pb-12`}>
        <Outlet />
        <footer className="mt-14 text-center text-xs leading-relaxed text-muted">
          Unofficial Fan-Created Work. Not made, endorsed or authorized by Farlight Games. Clash of Critters art © Farlight Games, from the official
          creator art pack. Trial data from{' '}
          <a href="https://tatadex.org/" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
            TataDex
          </a>
          .
        </footer>
      </main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-separator bg-background/95 backdrop-blur sm:hidden">
        <div className="grid grid-cols-4">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? 'text-accent' : 'text-muted'}`}
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <TatariEditor />
      <SyncConflictDialog />
      <Toast.Provider placement="top" />
    </div>
  );
}
