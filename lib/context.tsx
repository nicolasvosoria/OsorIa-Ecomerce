'use client';

import { createContext, ReactNode } from 'react';

type V0ContextType = {
  isV0: boolean;
};

const V0Context = createContext<V0ContextType | undefined>(undefined);

type V0ProviderProps = {
  children: ReactNode;
  isV0: boolean;
};

export const V0Provider = ({ children, isV0 }: V0ProviderProps) => {
  return <V0Context.Provider value={{ isV0 }}>{children}</V0Context.Provider>;
};

