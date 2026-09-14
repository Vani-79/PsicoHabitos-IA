export type UserRole = 'paciente' | 'psicologo';

export interface TestUser {
  email: string;
  role: UserRole;
  name: string;
}

export const MOCK_USERS: Record<string, TestUser> = {
  'paciente1@gmail.com': {
    email: 'paciente1@gmail.com',
    role: 'paciente',
    name: 'Carlos (Paciente)',
  },
  'psicologo1@gmail.com': {
    email: 'psicologo1@gmail.com',
    role: 'psicologo',
    name: 'Dra. María González',
  },
};
