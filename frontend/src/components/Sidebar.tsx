'use client';

import React from 'react';
import { Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileTextOutlined, GlobalOutlined, WindowsOutlined, UserOutlined } from '@ant-design/icons';

const { Sider } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

const menuItems: MenuItem[] = [
  {
    key: '/chat',
    icon: React.createElement(GlobalOutlined),
    label: <Link href="/chat">智能对话</Link>,
  },
  {
    key: '/astrology',
    icon: React.createElement(WindowsOutlined),
    label: <Link href="/astrology">星座分析</Link>,
  },
  {
    key: '/birth',
    icon: React.createElement(FileTextOutlined),
    label: <Link href="/birth">八字分析</Link>,
  },
  {
    key: '/bone',
    icon: React.createElement(FileTextOutlined),
    label: <Link href="/bone">骨重算命</Link>,
  },
  {
    key: '/name',
    icon: React.createElement(UserOutlined),
    label: <Link href="/name">姓名分析</Link>,
  },
  {
    key: '/naming',
    icon: <UserOutlined />,
    label: <Link href="/naming">AI 取名</Link>,
  },
];

const Sidebar = () => {
  const pathname = usePathname();

  return (
    <Sider theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
      <div className="p-4">
        <h1 className="text-xl font-bold">AI 命理</h1>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[pathname]}
        items={menuItems}
      />
    </Sider>
  );
};

export default Sidebar; 