import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LayoutDashboard, Database, ClipboardList, LogOut, User as UserIcon } from 'lucide-react';

const Layout = () => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Asset Registry', path: '/assets', icon: Database },
        { name: 'Maintenance Logs', path: '/logs', icon: ClipboardList },
    ];

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Sidebar */}
            <div className="w-64 bg-dark-900 text-white flex flex-col">
                <div className="h-16 flex items-center px-6 border-b border-gray-800 font-bold text-lg tracking-wider">
                    <span className="text-primary-500 mr-2">IND</span> E-LOGBOOK
                </div>

                <div className="flex-1 py-6 flex flex-col gap-2 px-4">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                    }`}
                            >
                                <Icon className="mr-3 h-5 w-5" />
                                {item.name}
                            </Link>
                        )
                    })}
                </div>

                <div className="p-4 border-t border-gray-800">
                    <div className="flex items-center mb-4 text-sm text-gray-300">
                        <UserIcon className="h-8 w-8 p-1.5 rounded-full bg-gray-800 mr-3" />
                        <div>
                            <p className="font-medium text-white">{user?.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-lg transition-colors"
                    >
                        <LogOut className="mr-3 h-4 w-4" />
                        Sign out
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 bg-white shadow-sm flex items-center px-8 z-10">
                    <h1 className="text-xl font-semibold text-gray-800 capitalize">
                        {location.pathname.substring(1).replace('-', ' ') || 'Dashboard'}
                    </h1>
                </header>

                <main className="flex-1 overflow-y-auto p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
