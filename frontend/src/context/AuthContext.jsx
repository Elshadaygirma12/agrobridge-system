import React, { createContext, useContext, useState, useEffect } from "react";
import {
  loginUser,
  registerUser,
  forgotPassword,
  logoutUser,
  getUserProfile,
} from "../services/authService";
import { mergeLoginUser } from "../utils/roles";

// Create the context
const AuthContext = createContext(null);

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Provider component that wraps the app
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app load, check if there's a saved token in localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("access_token");
    const savedUser = localStorage.getItem("user");
    if (savedToken) {
      setToken(savedToken);
    }
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        const storedPhoto = localStorage.getItem(`profile_photo_${parsedUser.email || parsedUser.id}`);
        if (storedPhoto) {
          parsedUser.photo = storedPhoto;
        }
        setUser(parsedUser);
      } catch {
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  // Register function — calls the API, does NOT auto-login
  const register = async (formData) => {
    const data = await registerUser(formData);
    return data; // Let the page handle the redirect to /login
  };

  // Forgot password function
  const forgotPasswordFunc = async (email) => {
    const data = await forgotPassword({ email });
    return data;
  };

  // Login function — calls the API, saves the token, fetches profile for role, then persists user
  const login = async (credentials, options = {}) => {
    const data = await loginUser(credentials);

    // DEBUG: Log raw backend response to trace role resolution
    console.log("[AuthContext] Raw login response:", JSON.stringify(data, null, 2));

    const accessToken = data.access || data.token;
    const refreshToken = data.refresh || null;

    // Save token FIRST so the profile request can use it
    if (accessToken) {
      localStorage.setItem("access_token", accessToken);
    }
    if (refreshToken) {
      localStorage.setItem("refresh_token", refreshToken);
    }

    // Fetch the full user profile to reliably get the role from the backend
    let profileData = {};
    try {
      profileData = await getUserProfile();
      console.log("[AuthContext] Profile response:", JSON.stringify(profileData, null, 2));
    } catch (profileErr) {
      console.warn("[AuthContext] Could not fetch profile after login:", profileErr.message);
    }

    // Merge profile into login data so role resolution has the richest possible data
    const mergedData = {
      ...data,
      user: {
        ...(data.user || {}),
        ...profileData,
      },
      // Also spread profile fields at top level for backends that don't nest under 'user'
      ...profileData,
      // Restore tokens that profileData might have overwritten
      access: accessToken,
      refresh: refreshToken,
    };

    const userData = mergeLoginUser(mergedData, credentials, options);
    const storedPhoto = localStorage.getItem(`profile_photo_${userData.email || userData.id}`);
    if (storedPhoto) {
      userData.photo = storedPhoto;
    }
    console.log("[AuthContext] Resolved user object:", JSON.stringify(userData, null, 2));
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);

    setToken(accessToken ?? null);
    return { ...data, user: userData };
  };

  // Update user helper
  const updateUser = (updatedFields) => {
    setUser((prevUser) => {
      if (!prevUser) return null;
      const newUser = { ...prevUser, ...updatedFields };
      localStorage.setItem("user", JSON.stringify(newUser));
      return newUser;
    });
  };

  // Logout function — notify backend then clear local auth state
  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      setUser(null);
      setToken(null);
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    register,
    forgotPassword: forgotPasswordFunc,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
