import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
    // Temporary auth check utilizing the future Zustand persist structure
    const authState = localStorage.getItem('auth-storage');
    let isAuthenticated = false;

    if (authState) {
        try {
            const parsedState = JSON.parse(authState);
            isAuthenticated = !!parsedState?.state?.token;
        } catch (e) {
            isAuthenticated = false;
        }
    }

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
