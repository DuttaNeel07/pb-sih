"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface AdminUser {
  _id: string;
  email: string;
  role: "super-admin" | "evaluator";
  createdAt?: Date;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isEvaluator: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(
  undefined
);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
};

interface AdminAuthProviderProps {
  children: ReactNode;
}

export const AdminAuthProvider: React.FC<AdminAuthProviderProps> = ({
  children,
}) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if admin is already authenticated on mount
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch("/sih/api/admin/verify", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAdmin(data.admin);
      } else {
        localStorage.removeItem("adminToken");
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("adminToken");
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch("/sih/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Store token in localStorage
      localStorage.setItem("adminToken", data.token);
      setAdmin(data.admin);
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      if (token) {
        await fetch("/sih/api/admin/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("adminToken");
      setAdmin(null);
      setLoading(false);
    }
  };

  const value = {
    admin,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!admin,
    isSuperAdmin: admin?.role === "super-admin",
    isEvaluator: admin?.role === "evaluator",
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};
