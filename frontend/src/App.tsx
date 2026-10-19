import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import Demo from './pages/Demo';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import Logs from './pages/Logs';
import MaintenanceAnalytics from './pages/MaintenanceAnalytics';
import Layout from './components/Layout';

function App() {
    return (
        <Router>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/demo" element={<Demo />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                    <Route element={<Layout />}>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/assets" element={<Assets />} />
                        <Route path="/logs" element={<Logs />} />
                        <Route path="/analytics" element={<MaintenanceAnalytics />} />
                        {/* Add more protected routes here in Phase 4 */}
                    </Route>
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
