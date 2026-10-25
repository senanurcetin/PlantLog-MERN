import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useRef, useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { LayoutDashboard, Database, ClipboardList, BarChart3, LogOut, User as UserIcon } from 'lucide-react';
import NexusBrand from './NexusBrand';

const navItems = [
    { name: 'Dashboard', shortName: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Asset Registry', shortName: 'Assets', path: '/assets', icon: Database },
    { name: 'Maintenance Logs', shortName: 'Logs', path: '/logs', icon: ClipboardList },
    { name: 'Maintenance Analytics', shortName: 'Analytics', path: '/analytics', icon: BarChart3 },
];

const Layout = () => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSigningOut, setIsSigningOut] = useState(false);
    const signoutInFlight = useRef(false);

    const handleLogout = async () => {
        if (signoutInFlight.current) return;
        signoutInFlight.current = true;
        setIsSigningOut(true);
        // Capture the originating session. A late response must never clear
        // credentials belonging to a different, more recently signed-in user.
        const original = useAuthStore.getState();
        try {
            if (original.token) {
                await api.post('/auth/logout', {}, { timeout: 4000 });
            }
        } catch {
            // A network failure can leave the signed bearer token valid at the
            // API until expiry. Do not claim remote revocation on failure.
        } finally {
            const current = useAuthStore.getState();
            if (current.token === original.token &&
                current.sessionEpoch === original.sessionEpoch) {
                logout();
                navigate('/login', { replace: true });
            }
            signoutInFlight.current = false;
            setIsSigningOut(false);
        }
    };

    const currentPage = navItems.find((item) => item.path === location.pathname)?.name || 'Dashboard';

    return (
        <div className="nexus-shell min-h-screen lg:flex">
            <aside className="nexus-sidebar hidden w-72 shrink-0 text-white lg:flex lg:flex-col">
                <Link to="/dashboard" aria-label="NEXUS PlantLog home"
                    className="border-b border-white/10 px-6 py-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00E0FF]">
                    <NexusBrand />
                </Link>
                <p className="px-7 pt-7 pb-2 text-[10px] font-bold uppercase tracking-[.24em] text-[#8F9BFF]">
                    Workspace navigation
                </p>
                <nav aria-label="Primary navigation" className="flex flex-1 flex-col gap-2 px-4 py-4">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const selected = location.pathname === item.path;
                        return (
                            <Link key={item.name} to={item.path} aria-current={selected ? 'page' : undefined}
                                className={`nexus-sidebar-link flex items-center rounded-xl px-4 py-3 text-sm font-semibold
                                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00E0FF]
                                    ${selected ? 'nexus-sidebar-selected' : 'text-slate-300 hover:text-white'}`}>
                                <Icon className="mr-3 h-5 w-5 shrink-0" aria-hidden="true" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
                <div className="border-t border-white/10 p-5">
                    <div className="mb-4 flex items-center text-sm text-slate-300">
                        <UserIcon className="mr-3 h-9 w-9 rounded-xl bg-white/10 p-2" aria-hidden="true" />
                        <div className="min-w-0">
                            <p className="truncate font-semibold text-white">{user?.name}</p>
                            <p className="text-xs capitalize text-[#B9C5CE]">{user?.role}</p>
                        </div>
                    </div>
                    <button type="button" onClick={() => { void handleLogout(); }} disabled={isSigningOut}
                        className="flex w-full items-center rounded-lg px-4 py-2 text-sm text-rose-200 hover:bg-white/10 hover:text-white">
                        <LogOut className="mr-3 h-4 w-4" aria-hidden="true" /> {isSigningOut ? 'Signing out...' : 'Sign out'}
                    </button>
                    <p className="mt-5 text-[10px] uppercase tracking-widest text-slate-400">
                        NEXUS / PlantLog demonstrator
                    </p>
                </div>
            </aside>

            <div className="flex min-h-screen min-w-0 flex-1 flex-col">
                <header className="nexus-topbar relative z-10">
                    <div className="flex min-h-20 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                        <div className="min-w-0">
                            <div className="lg:hidden">
                                <Link to="/dashboard" aria-label="NEXUS PlantLog home">
                                    <NexusBrand compact />
                                </Link>
                            </div>
                            <p className="hidden text-[10px] font-bold uppercase tracking-[.2em] text-[#4EA8FF] lg:block">
                                NEXUS / Industrial operations
                            </p>
                            <h1 className="hidden truncate text-xl font-bold tracking-tight text-white lg:block">
                                {currentPage}
                            </h1>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 lg:hidden">
                            <span className="hidden max-w-24 truncate text-xs text-slate-300 sm:block">{user?.name}</span>
                            <button type="button" onClick={() => { void handleLogout(); }} disabled={isSigningOut} aria-label="Sign out"
                                className="rounded-lg border border-white/20 p-2.5 text-slate-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00E0FF]">
                                <LogOut className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                    <nav aria-label="Mobile primary navigation"
                        className="overflow-x-auto border-t border-white/10 lg:hidden">
                        <div className="flex w-max min-w-full gap-2 px-3 py-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const selected = location.pathname === item.path;
                                return (
                                    <Link key={item.name} to={item.path} aria-label={item.name}
                                        aria-current={selected ? 'page' : undefined}
                                        className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold
                                            focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00E0FF]
                                            ${selected ? 'bg-[#4EA8FF] text-[#0B0F19]' : 'text-slate-200 hover:bg-white/10'}`}>
                                        <Icon className="h-4 w-4" aria-hidden="true" />
                                        <span>{item.shortName}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>
                </header>
                <main className="nexus-content min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
