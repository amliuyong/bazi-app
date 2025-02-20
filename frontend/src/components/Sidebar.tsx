'use client';

import React from 'react';
import { Menu } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

const Sidebar = () => {
  const pathname = usePathname();

  const menuItems = [
    {
      key: '/',
      label: <Link href="/">八字算命</Link>,
    },
    {
      key: '/astrology',
      label: <Link href="/astrology">星座分析</Link>,
    },
    {
      key: '/bone-weight',
      label: <Link href="/bone-weight">骨重算命</Link>,
    },
  ];

  return (
    <div className="h-screen bg-white shadow-sm">
      <div className="p-4 text-xl font-bold border-b flex items-center gap-2">
        <Image
          src="/taiji.svg"
          alt="太极图"
          width={24}
          height={24}
          className="inline-block"
        />
        八字分析
      </div>
      <Menu
        mode="inline"
        selectedKeys={[pathname]}
        items={menuItems}
        className="border-r-0"
      />
    </div>
  );
};

export default Sidebar; 