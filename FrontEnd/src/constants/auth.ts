export type UserRole = 'paciente' | 'psicologo';

export interface TestUser {
  email: string;
  role: UserRole;
  name: string;
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
