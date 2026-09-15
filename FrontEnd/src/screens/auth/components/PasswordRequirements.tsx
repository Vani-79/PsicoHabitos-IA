import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authStyles } from './authStyles';

export interface PasswordRulesState {
  reqLength: boolean;
  reqUpper: boolean;
  reqLower: boolean;
  reqNumber: boolean;
  reqSpecial: boolean;
  reqMatch: boolean;
  isValid: boolean;
}

export const checkPasswordRequirements = (
  password: string,
  confirmPassword?: string
): PasswordRulesState => {
  const reqLength = password.trim().length >= 8;
  const reqUpper = /[A-Z]/.test(password);
  const reqLower = /[a-z]/.test(password);
  const reqNumber = /\d/.test(password);
  const reqSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const reqMatch =
    confirmPassword !== undefined
      ? password.length > 0 && password === confirmPassword
      : true;

  const isValid =
    reqLength && reqUpper && reqLower && reqNumber && reqSpecial && reqMatch;

  return {
    reqLength,
    reqUpper,
    reqLower,
    reqNumber,
    reqSpecial,
    reqMatch,
    isValid,
  };
};

interface PasswordRequirementsProps {
  password: string;
  confirmPassword?: string;
}

interface RequirementItemProps {
  label: string;
  isValid: boolean;
}

const RequirementItem: React.FC<RequirementItemProps> = ({ label, isValid }) => (
  <View style={authStyles.reqRow}>
    <Ionicons
      name={isValid ? 'checkmark-circle' : 'ellipse-outline'}
      size={16}
      color={isValid ? '#0F613B' : '#9CA3AF'}
    />
    <Text style={[authStyles.reqText, isValid && authStyles.reqTextActive]}>
      {label}
    </Text>
  </View>
);

interface PasswordMatchItemProps {
  isMatch: boolean;
}

const PasswordMatchItem: React.FC<PasswordMatchItemProps> = ({ isMatch }) => (
  <View style={authStyles.reqRow}>
    <Ionicons
      name={isMatch ? 'checkmark-circle' : 'close-circle-outline'}
      size={16}
      color={isMatch ? '#0F613B' : '#DC2626'}
    />
    <Text
      style={[
        authStyles.reqText,
        isMatch ? authStyles.reqTextActive : { color: '#DC2626' },
      ]}
    >
      {isMatch ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
    </Text>
  </View>
);

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({
  password,
  confirmPassword,
}) => {
  const {
    reqLength,
    reqUpper,
    reqLower,
    reqNumber,
    reqSpecial,
    reqMatch,
  } = checkPasswordRequirements(password, confirmPassword);

  const hasConfirm = Boolean(confirmPassword && confirmPassword.length > 0);

  const requirements = [
    { label: 'Mínimo 8 caracteres', isValid: reqLength },
    { label: 'Al menos una letra mayúscula (A-Z)', isValid: reqUpper },
    { label: 'Al menos una letra minúscula (a-z)', isValid: reqLower },
    { label: 'Al menos un número (0-9)', isValid: reqNumber },
    { label: 'Al menos un carácter especial (ej. @, #, $, !)', isValid: reqSpecial },
  ];

  return (
    <View style={authStyles.requirementsBox}>
      <Text style={authStyles.requirementsTitle}>Requisitos de seguridad:</Text>
      {requirements.map((item) => (
        <RequirementItem key={item.label} label={item.label} isValid={item.isValid} />
      ))}
      {hasConfirm && <PasswordMatchItem isMatch={reqMatch} />}
    </View>
  );
};
