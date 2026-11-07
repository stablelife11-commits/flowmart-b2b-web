import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import axiosClient, { extractErrorMessage } from '../api/axiosClient';
import {
  AuthResponseDto,
  LoginRequestDto,
  RegisterRequestDto,
  Role,
  UserProfileDto,
  UserResponseDto,
} from '../types/api';

interface AuthContextType {
  user: UserResponseDto | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    credentials: LoginRequestDto,
    expectedRole?: Role
  ) => Promise<{ success: boolean; message?: string; user?: UserResponseDto }>;
  register: (
    data: RegisterRequestDto
  ) => Promise<{ success: boolean; message?: string; user?: UserResponseDto }>;
  logout: () => void;
  updateUserProfile: (partial: Partial<UserResponseDto>) => void;
  saveProfileToBackend: (
    profile: UserProfileDto
  ) => Promise<{ success: boolean; message?: string; user?: UserResponseDto }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeAuthUser(data: Partial<AuthResponseDto> & Record<string, any>, fallbackEmail?: string): UserResponseDto {
  const resolvedId = data.userId ?? data.id ?? data.user?.id;
  const businessPhone = data.businessPhone ?? data.phone ?? data.mobile ?? data.user?.businessPhone;
  const gstNumber = data.gstNumber ?? data.gstin ?? data.user?.gstNumber;
  const businessAddress = data.businessAddress ?? data.address ?? data.user?.businessAddress;
  const businessName = data.businessName ?? data.user?.businessName;

  return {
    id: Number(resolvedId),
    name: data.name || data.user?.name || (fallbackEmail ? fallbackEmail.split('@')[0] : 'User'),
    email: data.email || data.user?.email || fallbackEmail || '',
    role: (data.role || data.user?.role || 'BUYER') as Role,
    active: data.active !== undefined ? Boolean(data.active) : true,
    customerId: data.customerId ?? data.user?.customerId ?? null,
    businessName: businessName || undefined,
    gstNumber: gstNumber || undefined,
    businessPhone: businessPhone || undefined,
    businessAddress: businessAddress || undefined,
    phone: businessPhone || undefined,
    gstin: gstNumber || undefined,
    address: businessAddress || undefined,
  };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponseDto | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    localStorage.removeItem('flowmart_session');
    setToken(null);
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await axiosClient.get<UserProfileDto>('/users/me');
      const profile = res.data;
      setUser((prev) => {
        if (!prev) return null;
        const updated: UserResponseDto = {
          ...prev,
          id: profile.id ?? prev.id,
          name: profile.name || prev.name,
          email: profile.email || prev.email,
          role: (profile.role as Role) || prev.role,
          businessName: profile.businessName || undefined,
          gstNumber: profile.gstNumber || undefined,
          businessPhone: profile.businessPhone || undefined,
          businessAddress: profile.businessAddress || undefined,
          phone: profile.businessPhone || undefined,
          gstin: profile.gstNumber || undefined,
          address: profile.businessAddress || undefined,
        };
        const stored = localStorage.getItem('flowmart_session');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            parsed.user = updated;
            localStorage.setItem('flowmart_session', JSON.stringify(parsed));
          } catch {
            // ignore storage write error
          }
        }
        return updated;
      });
    } catch {
      // If 401, axiosClient interceptor dispatches flowmart:unauthorized
    }
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('flowmart:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('flowmart:unauthorized', handleUnauthorized);
  }, [logout]);

  // Initialize session from localStorage on mount & verify with /users/me
  useEffect(() => {
    const initAuth = async () => {
      try {
        const stored = localStorage.getItem('flowmart_session');
        if (stored) {
          const parsed = JSON.parse(stored);
          const storedToken = parsed?.token || parsed?.accessToken || null;
          const storedUser = parsed?.user || null;

          if (storedToken && storedUser && storedUser.id) {
            setToken(storedToken);
            setUser(storedUser);
            try {
              const res = await axiosClient.get<UserProfileDto>('/users/me');
              const profile = res.data;
              const verifiedUser: UserResponseDto = {
                ...storedUser,
                id: profile.id ?? storedUser.id,
                name: profile.name || storedUser.name,
                email: profile.email || storedUser.email,
                role: (profile.role as Role) || storedUser.role,
                businessName: profile.businessName || storedUser.businessName,
                gstNumber: profile.gstNumber || storedUser.gstNumber,
                businessPhone: profile.businessPhone || storedUser.businessPhone,
                businessAddress: profile.businessAddress || storedUser.businessAddress,
                phone: profile.businessPhone || storedUser.phone,
                gstin: profile.gstNumber || storedUser.gstin,
                address: profile.businessAddress || storedUser.address,
              };
              setUser(verifiedUser);
              localStorage.setItem(
                'flowmart_session',
                JSON.stringify({ token: storedToken, user: verifiedUser })
              );
            } catch {
              // If token expired, interceptor clears session
            }
          } else {
            localStorage.removeItem('flowmart_session');
          }
        }
      } catch {
        localStorage.removeItem('flowmart_session');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (
    credentials: LoginRequestDto,
    expectedRole?: Role
  ): Promise<{ success: boolean; message?: string; user?: UserResponseDto }> => {
    try {
      const res = await axiosClient.post<AuthResponseDto>('/auth/login', {
        email: credentials.email.trim(),
        password: credentials.password,
      });
      const data = res.data;
      const receivedToken = data.token;
      const receivedUser = normalizeAuthUser(data, credentials.email);

      if (expectedRole && receivedUser.role !== expectedRole) {
        if (!(expectedRole === 'SELLER' && receivedUser.role === 'ADMIN')) {
          return {
            success: false,
            message: `Access Denied: This portal requires ${expectedRole} credentials, but your account role is ${receivedUser.role}.`,
          };
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
      return { success: false, message: extractErrorMessage(err) };
    }
  };

  const register = async (
    data: RegisterRequestDto
  ): Promise<{ success: boolean; message?: string; user?: UserResponseDto }> => {
    try {
      const digitsOnlyMobile = (data.mobile || '').replace(/\D/g, '').slice(-10);
      if (!/^\d{10}$/.test(digitsOnlyMobile)) {
        return {
          success: false,
          message: 'Mobile number must be exactly 10 digits (e.g. 9876543210).',
        };
      }

      const payload: RegisterRequestDto = {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        mobile: digitsOnlyMobile,
        role: data.role === 'SELLER' ? 'SELLER' : 'BUYER',
        businessName: data.businessName?.trim() || undefined,
        gstNumber: data.gstNumber?.trim().toUpperCase() || undefined,
        businessAddress: data.businessAddress?.trim() || undefined,
      };

      const res = await axiosClient.post<AuthResponseDto>('/auth/register', payload);
      const resData = res.data;
      const receivedToken = resData.token;
      const receivedUser = normalizeAuthUser(resData, payload.email);

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
        message: 'Registration completed successfully!',
        user: receivedUser,
      };
    } catch (err) {
      return { success: false, message: extractErrorMessage(err) };
    }
  };

  const updateUserProfile = (partial: Partial<UserResponseDto>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated: UserResponseDto = {
        ...prev,
        ...partial,
        phone: partial.businessPhone ?? partial.phone ?? prev.phone,
        gstin: partial.gstNumber ?? partial.gstin ?? prev.gstin,
        address: partial.businessAddress ?? partial.address ?? prev.address,
      };
      const stored = localStorage.getItem('flowmart_session');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.user = updated;
          localStorage.setItem('flowmart_session', JSON.stringify(parsed));
        } catch {
          // ignore
        }
      }
      return updated;
    });
  };

  const saveProfileToBackend = async (
    profile: UserProfileDto
  ): Promise<{ success: boolean; message?: string; user?: UserResponseDto }> => {
    try {
      const res = await axiosClient.put<UserProfileDto>('/users/me/profile', {
        name: profile.name.trim(),
        businessName: profile.businessName?.trim() || undefined,
        gstNumber: profile.gstNumber?.trim().toUpperCase() || undefined,
        businessPhone: profile.businessPhone?.trim() || undefined,
        businessAddress: profile.businessAddress?.trim() || undefined,
      });
      const saved = res.data;
      updateUserProfile({
        name: saved.name,
        businessName: saved.businessName,
        gstNumber: saved.gstNumber,
        businessPhone: saved.businessPhone,
        businessAddress: saved.businessAddress,
      });
      return { success: true, message: 'Business profile updated successfully!' };
    } catch (err) {
      return { success: false, message: extractErrorMessage(err) };
    }
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
        saveProfileToBackend,
        refreshProfile,
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