export type UserRole = 'paciente' | 'psicologo';

export interface SubscriptionInfo {
  isActive: boolean;
  status: 'activa' | 'expirada' | 'inactiva';
  finDate?: string;
  daysRemaining?: number;
  meses?: number;
}

export interface TestUser {
  id?: number;
  email: string;
  role: UserRole;
  name: string;
  token?: string;
  availableRoles?: UserRole[];
  hasMultipleRoles?: boolean;
  subscription?: SubscriptionInfo;
}

export interface PsychologistProfileData {
  nombre: string;
  email?: string;
  fechaIngreso: string;
  fechaVencimiento?: string;
  mesesSuscripcion?: number;
  tipoSuscripcion?: string;
  estadoSuscripcion: 'Activo' | 'Inactivo';
  suscripcionActiva: boolean;
  availableRoles?: UserRole[];
  hasMultipleRoles?: boolean;
}


export const MOCK_USERS: Record<string, TestUser> = {
  'roberto@gmail.com': {
    email: 'roberto@gmail.com',
    role: 'psicologo',
    name: 'Ps. Roberto Gonzales',
  },
  'carlos@gmail.com': {
    email: 'carlos@gmail.com',
    role: 'paciente',
    name: 'Carlos Lopez',
  },
  'paciente1@gmail.com': {
    email: 'paciente1@gmail.com',
    role: 'paciente',
    name: 'Carlos Lopez',
  },
  'psicologo1@gmail.com': {
    email: 'psicologo1@gmail.com',
    role: 'psicologo',
    name: 'Ps. Roberto Gonzales',
  },
};
