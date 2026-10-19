import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient, { setAccessToken, setRefreshToken, getRefreshToken } from '../api/client';
import type { User, LoginCredentials, RegisterData } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (): Promise<User | null> => {
    try {
      const { data } = await apiClient.get<User>('/auth/profile/');
      setUser(data);
      return data;
    } catch {
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      // Attempt to get a new access token on mount
      apiClient
        .post('/auth/token/refresh/', { refresh: refreshToken })
        .then(({ data }) => {
          setAccessToken(data.access);
          if (data.refresh) setRefreshToken(data.refresh);
          return fetchProfile();
        })
        .catch(() => {
          setAccessToken(null);
          setRefreshToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [fetchProfile]);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    const { data } = await apiClient.post('/auth/token/', credentials);
    setAccessToken(data.access);
    setRefreshToken(data.refresh);
    const profile = await fetchProfile();
    if (!profile) {
      throw new Error('Failed to retrieve user profile after authentication.');
    }
    return profile;
  };

  const register = async (registerData: RegisterData) => {
    await apiClient.post('/auth/register/', registerData);
    // Auto-login after registration
    await login({ email: registerData.email, password: registerData.password });
  };

  const logout = () => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  const updateProfile = async (data: Partial<User>) => {
    const { data: updatedUser } = await apiClient.patch<User>('/auth/profile/', data);
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
