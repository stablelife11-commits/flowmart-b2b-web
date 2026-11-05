import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axiosClient, { extractErrorMessage } from '../api/axiosClient';
import { AuthResponseDto, LoginRequestDto, RegisterRequestDto, Role, UserResponseDto } from '../types/api';

interface AuthContextType {
  user: UserResponseDto | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequestDto, expectedRole?: Role) => Promise<{ success: boolean; message?: string; user?: UserResponseDto }>;
  register: (data: RegisterRequestDto) => Promise<{ success: boolean; message?: string; user?: UserResponseDto }>;
  logout: () => void;
  updateUserProfile: (partial: Partial<UserResponseDto>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponseDto | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('flowmart_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        const storedToken = parsed.token || parsed.accessToken || (typeof stored === 'string' ? stored : null);
        const storedUser = parsed.user || null;

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
        }
      }
    } catch (err) {
      console.warn('Failed to parse flowmart_session from localStorage', err);
      localStorage.removeItem('flowmart_session');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (
    credentials: LoginRequestDto,
    expectedRole?: Role
  ): Promise<{ success: boolean; message?: string; user?: UserResponseDto }> => {
    try {
      const res = await axiosClient.post<any>('/auth/login', credentials);
      const data = res.data;

      // Normalize token and user across possible backend response formats
      const receivedToken: string = data.token || data.accessToken || data.jwt || '';
      let receivedUser: UserResponseDto = data.user;

      if (!receivedUser && data.id) {
        // Backend returned flat user object combined with token
        receivedUser = {
          id: data.id,
          name: data.name || data.fullName || 'User',
          email: data.email || credentials.email,
          phone: data.phone || data.mobile,
          role: data.role as Role,
          businessName: data.businessName,
          gstin: data.gstin,
          address: data.address,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          active: data.active !== undefined ? data.active : true,
        };
      }

      if (!receivedUser) {
        // Fallback user if backend returns minimal payload
        receivedUser = {
          id: 1,
          name: credentials.email.split('@')[0],
          email: credentials.email,
          role: (data.role || expectedRole || 'BUYER') as Role,
          active: true,
        };
      }

      // Role check verification
      if (expectedRole && receivedUser.role !== expectedRole) {
        // If an ADMIN logs into seller portal, that's often allowed, but specific portals check expected role
        if (!(expectedRole === 'SELLER' && receivedUser.role === 'ADMIN')) {
          const roleError = `Access Denied: This portal requires ${expectedRole} credentials. Your account role is ${receivedUser.role}.`;
          return { success: false, message: roleError };
        }
      }

      const sessionData = {
        token: receivedToken,
        user: receivedUser,
      };

      localStorage.setItem('flowmart_session', JSON.stringify(sessionData));
      setToken(receivedToken);
      setUser(receivedUser);

      return { success: true, user: receivedUser };
    } catch (err) {
      const msg = extractErrorMessage(err);
      return { success: false, message: msg };
    }
  };

  const register = async (
    data: RegisterRequestDto
  ): Promise<{ success: boolean; message?: string; user?: UserResponseDto }> => {
    try {
      const res = await axiosClient.post<any>('/auth/register', data);
      const resData = res.data;

      const receivedToken: string = resData.token || resData.accessToken || '';
      const receivedUser: UserResponseDto = resData.user || {
        id: resData.id || Date.now(),
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        businessName: data.businessName,
        gstin: data.gstin,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        active: true,
      };

      if (receivedToken) {
        const sessionData = {
          token: receivedToken,
          user: receivedUser,
        };
        localStorage.setItem('flowmart_session', JSON.stringify(sessionData));
        setToken(receivedToken);
        setUser(receivedUser);
      }

      return {
        success: true,
        message: 'Registration successful!',
        user: receivedUser,
      };
    } catch (err) {
      const msg = extractErrorMessage(err);
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('flowmart_session');
    setToken(null);
    setUser(null);
  };

  const updateUserProfile = (partial: Partial<UserResponseDto>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...partial };
      const stored = localStorage.getItem('flowmart_session');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.user = updated;
          localStorage.setItem('flowmart_session', JSON.stringify(parsed));
        } catch (e) {
          console.warn('Failed to update localStorage session user', e);
        }
      }
      return updated;
    });
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
        updateUserProfile,
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

export default AuthContext;

