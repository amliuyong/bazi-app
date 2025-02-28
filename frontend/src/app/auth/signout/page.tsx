'use client';

import { signOut } from "next-auth/react";
import { useEffect } from "react";
import { Card, Typography, Spin } from "antd";

export default function SignOut() {
  useEffect(() => {
    signOut({ callbackUrl: "/" });
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-96 shadow-lg">
        <div className="text-center">
          <Typography.Title level={3}>Signing out...</Typography.Title>
          <Spin size="large" />
        </div>
      </Card>
    </div>
  );
} 