import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('securedoc_token') || null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const userData = await authApi.getMe();
          setUser(userData);
        } catch (error) {
          console.error('Failed to load user profile:', error);
          logout();
        }
      }
      setIsLoading(false);
    };
    fetchUser();
  }, [token]);

  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    const newToken = data.access_token;
    localStorage.setItem('securedoc_token', newToken);
    setToken(newToken);
    const userData = await authApi.getMe();
    setUser(userData);
    return userData;
  };

  const register = async (email, password, fullName) => {
    await authApi.register(email, password, fullName);
    return await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('securedoc_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
