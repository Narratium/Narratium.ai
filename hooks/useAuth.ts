import { useState, useEffect } from "react";
import AuthAPI from "@/lib/api/auth";

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await AuthAPI.getCurrentUser();
      
      if (response?.success && response.user) {
        setAuthState({
          user: response.user,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  // Login with email and password only
  const login = async (email: string, password: string) => {
    try {
      const response = await AuthAPI.login(email, password);
      if (response.success && response.token && response.user) {
        // Store authentication data
        localStorage.setItem("authToken", response.token);
        localStorage.setItem("username", response.user.username);
        localStorage.setItem("userId", response.user.id);
        localStorage.setItem("email", response.user.email);
        localStorage.setItem("isLoggedIn", "true");
        setAuthState({
          user: response.user,
          isLoading: false,
          isAuthenticated: true,
        });
        return { success: true };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error("Login failed:", error);
      return { success: false, message: "Login failed" };
    }
  };

  const logout = () => {
    AuthAPI.logout();
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  const refreshAuth = () => {
    checkAuthStatus();
  };

  return {
    ...authState,
    login,
    logout,
    refreshAuth,
  };
}; 
