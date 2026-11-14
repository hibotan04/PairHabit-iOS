import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';

export interface AuthContextType {
  user: FirebaseUser | null;
  coupleId: string | null;
  isSetupCompleted: boolean;
  setIsSetupCompleted: (value: boolean) => void;
}

export const AuthContext = React.createContext<AuthContextType>({
  user: null,
  coupleId: null,
  isSetupCompleted: false,
  setIsSetupCompleted: () => { },
});
