// Authentication API service for connecting to backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// API Response types
interface APIResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

interface SendVerificationResponse extends APIResponse {
  // No additional data needed
}

interface VerifyEmailResponse extends APIResponse {
  tempToken?: string;
}

interface RegisterResponse extends APIResponse {
  token?: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

interface LoginResponse extends APIResponse {
  token?: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

interface VerifyTokenResponse extends APIResponse {
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

interface UpdateUsernameResponse extends APIResponse {
  token?: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

interface ApiKeyInfoResponse extends APIResponse {
  data?: {
    apiKey: string;
    baseUrl: string;
  };
}

class AuthAPI {
  // Generic fetch wrapper with error handling
  private static async fetchAPI<T>(
    endpoint: string, 
    options: RequestInit = {},
  ): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Request failed");
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Send verification code to email
  static async sendVerificationCode(email: string): Promise<SendVerificationResponse> {
    return this.fetchAPI<SendVerificationResponse>("/send-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  // Verify email with code and password
  static async verifyEmail(
    email: string, 
    code: string, 
    password: string,
  ): Promise<VerifyEmailResponse> {
    return this.fetchAPI<VerifyEmailResponse>("/verify-email", {
      method: "POST",
      body: JSON.stringify({ email, code, password }),
    });
  }

  // Complete registration with username
  static async register(
    username: string, 
    tempToken: string,
  ): Promise<RegisterResponse> {
    return this.fetchAPI<RegisterResponse>("/register", {
      method: "POST",
      body: JSON.stringify({ username, tempToken }),
    });
  }

  // Login with email and password only
  static async login(
    email: string, // User email
    password: string, // User password
  ): Promise<LoginResponse> {
    // Send login request with email and password
    return this.fetchAPI<LoginResponse>("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  // Update username for registered users
  static async updateUsername(newUsername: string): Promise<UpdateUsernameResponse> {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("No authentication token found");
    }

    return this.fetchAPI<UpdateUsernameResponse>("/update-username", {
      method: "PUT",
      body: JSON.stringify({ token, newUsername }),
    });
  }

  // Verify JWT token
  static async verifyToken(token: string): Promise<VerifyTokenResponse> {
    return this.fetchAPI<VerifyTokenResponse>("/verify-token", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  // Get current user from stored token
  static async getCurrentUser(): Promise<VerifyTokenResponse | null> {
    const token = localStorage.getItem("authToken");
    if (!token) return null;

    try {
      return await this.verifyToken(token);
    } catch (error) {
      // Token is invalid, remove it
      localStorage.removeItem("authToken");
      return null;
    }
  }

  // Get API key and base URL for official API
  static async getApiKeyInfo(): Promise<ApiKeyInfoResponse> {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("No authentication token found");
    }

    return this.fetchAPI<ApiKeyInfoResponse>("/get-api-key-info", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  // Logout - clear local storage
  static logout(): void {
    localStorage.removeItem("authToken");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    localStorage.removeItem("email");
    localStorage.removeItem("isLoggedIn");
  }
}

export default AuthAPI; 
 
