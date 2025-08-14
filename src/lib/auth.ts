
interface Admin {
  email: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
}

// Admin credentials as specified
const ADMIN_CREDENTIALS: Admin[] = [
  {
    email: "efraemfllanda@asscat.edu.ph",
    password: "efraemllanda123",
  },
  {
    email: "cherrylviscaya@asscat.edu.ph",
    password: "cherryviscaya123",
  },
];

// Simple token generation (in a real app, use a proper JWT library)
const generateToken = (email: string): string => {
  return btoa(JSON.stringify({ email, timestamp: Date.now() }));
};

export const auth = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const admin = ADMIN_CREDENTIALS.find(
      (admin) => admin.email === email && admin.password === password
    );

    if (admin) {
      const token = generateToken(admin.email);
      // Store the token securely
      localStorage.setItem("authToken", token);
      localStorage.setItem("isAuthenticated", "true");
      return {
        success: true,
        message: "Login successful",
        token,
      };
    }

    return {
      success: false,
      message: "Invalid email or password",
    };
  },

  logout: () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("isAuthenticated");
  },

  isAuthenticated: (): boolean => {
    return localStorage.getItem("isAuthenticated") === "true";
  },

  getToken: (): string | null => {
    return localStorage.getItem("authToken");
  },
};
