'use client';

import React from 'react';
import { ConfigProvider } from "@/lib/contexts/config-context";
import { UserProvider } from "@/lib/contexts/user-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider>
      <UserProvider>
        {children}
      </UserProvider>
    </ConfigProvider>
  );
}
