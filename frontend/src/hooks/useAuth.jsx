// useAuth Hook - Manage authentication state
import { useState, useEffect, createContext, useContext } from 'react';
import * as authService from '../services/authService';

// Create Auth Context
const AuthContext = createContext(null);

/**
 * Auth Provider Component
 * Wrap your app with this to provide auth state to all components
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);

    // Set up axios interceptor
    authService.setupAxiosInterceptor();
  }, []);

  const signIn = async (tipEmail, studentId) => {
    const response = await authService.signIn(tipEmail, studentId);
    setUser(response.user);
    return response;
  };

  const signUp = async (userData) => {
    const response = await authService.signUp(userData);
    setUser(response.user);
    return response;
  };

  const signOut = () => {
    authService.signOut();
    setUser(null);
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook
 * Access auth state and methods from any component
 * 
 * @example
 * const { user, signIn, signOut, isAuthenticated } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
