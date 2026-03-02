import { Navigate, useLocation } from "react-router-dom";
import pb from "../lib/pocketbase";

interface RequireAuthProps {
  children: React.ReactNode;
}

/**
 * Route guard component
 * Check if user is logged in and token is not expired
 * If not logged in or token expired, redirect to login page
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation();

  // Check for valid authentication info
  const isAuthenticated = pb.authStore.isValid;

  if (!isAuthenticated) {
    // Not logged in or token expired, redirect to login page
    // Save current path to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
