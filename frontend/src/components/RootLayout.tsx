'use client';

import React from 'react';
import { Layout } from 'antd';
import Sidebar from './Sidebar';

const { Content } = Layout;

interface RootLayoutProps {
  children: React.ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Content>
        {children}
      </Content>
    </Layout>
  );
};

export default RootLayout; 