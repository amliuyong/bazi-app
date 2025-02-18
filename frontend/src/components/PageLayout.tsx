'use client';

import React from 'react';
import Sidebar from './Sidebar';

interface PageLayoutProps {
  children: React.ReactNode;
}

const PageLayout = ({ children }: PageLayoutProps) => {
  return (
    <div className="flex min-h-screen">
      <div className="w-48">
        <Sidebar />
      </div>
      <main className="flex-1 bg-[#f0f2f5] p-5">
        {children}
      </main>
    </div>
  );
};

export default PageLayout; 