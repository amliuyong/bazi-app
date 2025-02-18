'use client';

import { StyleProvider } from '@ant-design/cssinjs';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <StyleProvider hashPriority="high">
      {children}
    </StyleProvider>
  );
} 