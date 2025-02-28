'use client';

import { useSession, signIn, signOut } from "next-auth/react";
import { Button, Avatar, Dropdown, Space, Menu } from "antd";
import { UserOutlined, LogoutOutlined, LoginOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";

export default function UserProfile() {
  const { data: session, status } = useSession();
  
  if (status === "loading") {
    return <div>Loading...</div>;
  }
  
  if (status === "unauthenticated") {
    return (
      <Button 
        type="primary" 
        icon={<LoginOutlined />} 
        onClick={() => signIn("cognito")}
      >
        Sign In
      </Button>
    );
  }
  
  const items: MenuProps['items'] = [
    {
      key: '1',
      label: <span>{session?.user?.name || 'User'}</span>,
      disabled: true,
    },
    {
      key: '2',
      label: <span>{session?.user?.email || ''}</span>,
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: '3',
      danger: true,
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      onClick: () => signOut(),
    },
  ];
  
  return (
    <Dropdown menu={{ items }} placement="bottomRight">
      <Space className="cursor-pointer">
        <Avatar 
          src={session?.user?.image} 
          icon={!session?.user?.image && <UserOutlined />}
        />
        <span>{session?.user?.name}</span>
      </Space>
    </Dropdown>
  );
} 