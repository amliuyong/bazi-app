'use client';

import { useSearchParams } from "next/navigation";
import { Card, Typography, Button } from "antd";
import Link from "next/link";

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-96 shadow-lg">
        <div className="text-center">
          <Typography.Title level={3}>Authentication Error</Typography.Title>
          <Typography.Paragraph className="mt-4">
            {error || "An error occurred during authentication."}
          </Typography.Paragraph>
          <Link href="/auth/signin">
            <Button type="primary">Try Again</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
} 