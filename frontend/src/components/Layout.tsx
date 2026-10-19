import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LayoutDashboard, Database, ClipboardList, BarChart3, LogOut, User as UserIcon } from 'lucide-react';

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

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    const currentPage = navItems.find((item) => item.path === location.pathname)?.name || 'Dashboard';

    return (
        <div className="min-h-screen bg-gray-100 lg:flex">
            {/* Desktop navigation never consumes mobile viewport width. */}
            <aside className="hidden w-64 shrink-0 bg-dark-900 text-white lg:flex lg:flex-col">
                <Link to="/dashboard" className="flex h-16 items-center border-b border-gray-800 px-6 text-lg font-bold tracking-wider">
                    <span className="mr-2 text-primary-500">IND</span> E-LOGBOOK
                </Link>
                <nav aria-label="Primary navigation" className="flex flex-1 flex-col gap-2 px-4 py-6">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const selected = location.pathname === item.path;
                        return (
                            <Link key={item.name} to={item.path} aria-current={selected ? 'page' : undefined}
                                className={`flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors
                                    ${selected ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
                                <Icon className="mr-3 h-5 w-5" aria-hidden="true" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
                <div className="border-t border-gray-800 p-4">
                    <div className="mb-4 flex items-center text-sm text-gray-300">
                        <UserIcon className="mr-3 h-8 w-8 rounded-full bg-gray-800 p-1.5" aria-hidden="true" />
                        <div className="min-w-0">
                            <p className="truncate font-medium text-white">{user?.name}</p>
                            <p className="text-xs capitalize text-gray-400">{user?.role}</p>
                        </div>
                    </div>
                    <button type="button" onClick={handleLogout}
                        className="flex w-full items-center rounded-lg px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-900/20 hover:text-red-300">
                        <LogOut className="mr-3 h-4 w-4" aria-hidden="true" /> Sign out
                    </button>
                </div>
            </aside>

            <div className="flex min-h-screen min-w-0 flex-1 flex-col">
                <header className="relative z-10 bg-white shadow-sm">
                    <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700 lg:hidden">PlantLog</p>
                            <h1 className="truncate text-lg font-semibold text-gray-800 sm:text-xl">{currentPage}</h1>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 lg:hidden">
                            <span className="hidden max-w-24 truncate text-xs text-gray-600 sm:block">{user?.name}</span>
                            <button type="button" onClick={handleLogout} aria-label="Sign out"
                                className="rounded-lg border border-gray-200 p-2.5 text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700">
                                <LogOut className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                    <nav aria-label="Mobile primary navigation" className="overflow-x-auto border-t border-gray-100 bg-slate-50 lg:hidden">
                        <div className="flex w-max min-w-full gap-2 px-3 py-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const selected = location.pathname === item.path;
                                return (
                                    <Link key={item.name} to={item.path} aria-label={item.name}
                                        aria-current={selected ? 'page' : undefined}
                                        className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold
                                            focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700
                                            ${selected ? 'bg-teal-800 text-white' : 'bg-white text-slate-700 hover:bg-teal-50'}`}>
                                        <Icon className="h-4 w-4" aria-hidden="true" />
                                        <span>{item.shortName}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>
                </header>

                <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
