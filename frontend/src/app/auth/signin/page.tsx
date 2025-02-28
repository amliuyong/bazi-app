'use client';

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button, Card, Space, Typography, Alert } from "antd";
import { useSearchParams } from "next/navigation";

export default function SignIn() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  
  // Check for error in URL
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setError(errorParam);
    }
  }, [searchParams]);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("Starting sign-in process with OIDC provider");
      console.log("Callback URL:", callbackUrl);
      
      const result = await signIn("cognito", { 
        callbackUrl,
        redirect: true,
      });
      
      console.log("Sign-in result:", result);
      
      if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error("Sign-in error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-96 shadow-lg">
        <div className="text-center">
          <Typography.Title level={3}>Sign In</Typography.Title>
          
          {error && (
            <Alert
              message="Authentication Error"
              description={error}
              type="error"
              showIcon
              className="mb-4"
            />
          )}
          
          <Space direction="vertical" className="w-full mt-4">
            <Button 
              type="primary" 
              size="large" 
              block 
              onClick={handleSignIn}
              loading={isLoading}
            >
              Sign in with Cognito
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
} 