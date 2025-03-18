import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const auth = useAuth();
  const location = useLocation();
  
  // Handle case when auth context is not available
  if (!auth) {
    console.error('AuthContext is undefined in ProtectedRoute');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const { user, loading, initialized } = auth;

  // Show loading state while checking authentication
  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated, render the protected component
  return children;
};

export default ProtectedRoute; 