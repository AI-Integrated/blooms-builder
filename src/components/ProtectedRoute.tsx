import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole, UserRole } from "@/hooks/useUserRole";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, requiredRole, allowedRoles }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { role, loading, hasRole } = useUserRole();

  useEffect(() => {
    if (loading) return;

    if (!role) {
      navigate("/auth");
      return;
    }

    // Check if user has required role
    if (requiredRole && !hasRole(requiredRole)) {
      // Redirect based on user's actual role
      if (role === 'admin') {
        navigate("/admin/dashboard");
      } else if (role === 'teacher') {
        navigate("/teacher/dashboard");
      } else {
        navigate("/auth");
      }
      return;
    }

    // Check if user has one of the allowed roles
    if (allowedRoles && !allowedRoles.some(r => hasRole(r))) {
      // Redirect based on user's actual role
      if (role === 'admin') {
        navigate("/admin/dashboard");
      } else if (role === 'teacher') {
        navigate("/teacher/dashboard");
      } else {
        navigate("/auth");
      }
    }
  }, [role, loading, requiredRole, allowedRoles, hasRole, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}