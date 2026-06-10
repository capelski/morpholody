import { createContext, useContext, type ReactNode } from 'react';

const LoginPromptContext = createContext<() => void>(() => {});

export function LoginPromptProvider({
  children,
  onRequest,
}: {
  children: ReactNode;
  onRequest: () => void;
}) {
  return <LoginPromptContext.Provider value={onRequest}>{children}</LoginPromptContext.Provider>;
}

export function useLoginPrompt(): () => void {
  return useContext(LoginPromptContext);
}
