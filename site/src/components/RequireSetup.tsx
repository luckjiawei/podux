import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Loading } from "./Loading";
import { useSystemStore } from "../stores/systemStore";

interface RequireSetupProps {
  children: React.ReactNode;
}

/**
 * Route guard component
 * Check if system has been initialized by checking the settings table
 * If not initialized, redirect to setup page
 */
export function RequireSetup({ children }: RequireSetupProps) {
  const location = useLocation();
  const { checkInitialized } = useSystemStore();
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  console.log("RequireSetup component rendered");

  useEffect(() => {
    console.log("RequireSetup useEffect triggered");
    checkInitialization();
  }, []);

  const checkInitialization = async () => {
    console.log("checkInitialization called");
    try {
      const initialized = await checkInitialized();
      console.log("Initialization status:", initialized);
      setIsInitialized(initialized);
    } catch (error: any) {
      console.error("Failed to check initialization status:", error);
      setIsInitialized(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loading fullscreen />;
  }

  if (!isInitialized) {
    // Not initialized, redirect to setup page
    return <Navigate to="/setup" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
