import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import { TestUser } from '../constants/auth';
import { MySqlPatientRecord } from '../types/patient';
import {
  authService,
  patientService,
  storageService,
  authSession,
  ApiResponse,
} from '../services';

export interface AuthContextType {
  user: TestUser | null;
  isLoading: boolean;
  patients: MySqlPatientRecord[];
  login: (userData: TestUser, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  registerPatient: (record: MySqlPatientRecord) => Promise<ApiResponse<MySqlPatientRecord>>;
  refreshPatients: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<TestUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [patients, setPatients] = useState<MySqlPatientRecord[]>([]);

  // Restauración de sesión al abrir la app (Auto-Login con "Recuérdame")
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const saved = await storageService.getUserSession();
        if (saved && isMounted) {
          if (saved.token) {
            authSession.setToken(saved.token);
          }
          const currentUser: TestUser = {
            email: saved.email,
            role: saved.role,
            name: saved.name,
            token: saved.token,
          };
          setUser(currentUser);

          if (saved.role === 'psicologo') {
            const list = await patientService.getRecentPatients(5, saved.email);
            if (isMounted) setPatients(list);
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Error restaurando sesión guardada:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(
    async (userData: TestUser, rememberMe: boolean = false): Promise<void> => {
      if (userData.token) {
        authSession.setToken(userData.token);
      }
      setUser(userData);

      if (rememberMe) {
        await storageService.saveRememberedEmail(userData.email);
        await storageService.saveUserSession({
          email: userData.email,
          role: userData.role,
          name: userData.name,
          token: userData.token,
          rememberMe: true,
        });
      } else {
        await storageService.clearRememberedEmail();
        await storageService.clearUserSession();
      }

      if (userData.role === 'psicologo') {
        const list = await patientService.getRecentPatients(5, userData.email);
        setPatients(list);
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
      await storageService.clearAll();
    } catch (e) {
      console.warn('[AuthContext] Error cerrando sesión:', e);
    } finally {
      authSession.clearToken();
      setUser(null);
      setPatients([]);
    }
  }, []);

  const refreshPatients = useCallback(async (): Promise<void> => {
    if (user?.role === 'psicologo') {
      const list = await patientService.getRecentPatients(5, user.email);
      setPatients(list);
    }
  }, [user?.role, user?.email]);

  const registerPatient = useCallback(
    async (
      record: MySqlPatientRecord
    ): Promise<ApiResponse<MySqlPatientRecord>> => {
      const res = await patientService.registerPatient(record, user?.email);
      if (res.success) {
        await refreshPatients();
      }
      return res;
    },
    [user?.email, refreshPatients]
  );

  const value = useMemo(
    () => ({
      user,
      isLoading,
      patients,
      login,
      logout,
      registerPatient,
      refreshPatients,
    }),
    [user, isLoading, patients, login, logout, registerPatient, refreshPatients]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider');
  }
  return context;
};
