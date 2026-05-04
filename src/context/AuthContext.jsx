import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize from localStorage on first mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('hka_maps_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Failed to parse user from local storage', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (email, password) => {
    // Dummy authentication logic
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email === 'admin@hka.co.id' && password === 'admin') {
          const userData = { email, role: 'admin', name: 'Admin HKA' };
          setUser(userData);
          localStorage.setItem('hka_maps_user', JSON.stringify(userData));
          resolve(userData);
        } else if (email === 'user@hka.co.id' && password === 'user') {
          const userData = { email, role: 'user', name: 'User Monitoring' };
          setUser(userData);
          localStorage.setItem('hka_maps_user', JSON.stringify(userData));
          resolve(userData);
        } else {
          reject(new Error('Email atau password salah!'));
        }
      }, 800); // simulate network delay
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('hka_maps_user');
  };

  if (loading) {
    return <div className="min-h-screen bg-surface-100 flex items-center justify-center">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
