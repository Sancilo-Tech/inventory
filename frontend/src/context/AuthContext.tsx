/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authAPI } from '../services/api';

interface User {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'staff' | 'analyzer';
  is_active: boolean;
  email_notification: boolean;
  location_ids: string[];
  first_login?: boolean;
  token: string;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('inventory-token');
    const userData = localStorage.getItem('inventory-user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        localStorage.removeItem('inventory-token');
        localStorage.removeItem('inventory-user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('inventory-token', userData.token);
    localStorage.setItem('inventory-user', JSON.stringify(userData));
  };

  const logout = async() => {
    const stored = localStorage.getItem('inventory-user');
    if (stored) {
      const u = JSON.parse(stored);
      localStorage.removeItem(`selectedLocation_${u.user_id}`);
    }
    setUser(null);
    await authAPI.logout();
    localStorage.removeItem('inventory-token');
    localStorage.removeItem('inventory-user');
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};