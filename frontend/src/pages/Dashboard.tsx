import { useAuthStore } from '../store/authStore';
import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const Dashboard = () => {
    const user = useAuthStore((state) => state.user);

    const stats = [
        { name: 'Total Assets', value: '142', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-100' },
        { name: 'Active Logs', value: '28', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
        { name: 'In Maintenance', value: '5', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
        { name: 'Operational', value: '137', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
    ];

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Welcome back, {user?.name}</h2>
                    <p className="text-gray-500 mt-1">Here is the overview of your industrial registry today.</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">System Status</p>
                    <div className="flex items-center mt-1">
                        <span className="h-3 w-3 bg-green-500 rounded-full mr-2"></span>
                        <span className="font-semibold text-gray-900">All Systems Nominal</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.name} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center">
                                <div className={`${stat.bg} ${stat.color} p-3 rounded-lg`}>
                                    <Icon className="h-6 w-6" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Placeholder for Recent Activity Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-8">
                <div className="px-6 py-5 border-b border-gray-100">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Recent Log Activity</h3>
                </div>
                <div className="p-6 flex justify-center text-gray-500">
                    Feature coming soon in advanced modules.
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
