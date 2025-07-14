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
      // Check for guest login first
      const isLoggedIn = localStorage.getItem("isLoggedIn");
      const loginMode = localStorage.getItem("loginMode");
      const username = localStorage.getItem("username");
      const userId = localStorage.getItem("userId");
      const email = localStorage.getItem("email");

      if (isLoggedIn === "true" && loginMode === "guest" && username && userId) {
        // Guest login mode
        setAuthState({
          user: {
            id: userId,
            username: username,
            email: email || "",
          },
          isLoading: false,
          isAuthenticated: true,
        });
        return;
      }

      // Regular API-based authentication
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
    // Clear all auth-related localStorage items
    localStorage.removeItem("authToken");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    localStorage.removeItem("email");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("loginMode");
    
    AuthAPI.logout();
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
    
    // Refresh the page to ensure all components are properly updated
    window.location.reload();
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
 
