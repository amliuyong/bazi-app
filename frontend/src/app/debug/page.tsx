'use client';

import { useState, useEffect } from 'react';
import { Card, Typography, Descriptions, Button, Alert } from 'antd';

export default function DebugPage() {
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only show this in development
    if (process.env.NODE_ENV !== 'development') {
      setError('Debug page is only available in development mode');
      return;
    }

    // Collect environment variables that are safe to display
    const safeEnvVars: Record<string, string> = {
      'NEXT_PUBLIC_WS_URL': process.env.NEXT_PUBLIC_WS_URL || '',
      'NEXTAUTH_URL': process.env.NEXTAUTH_URL || '',
      'NEXTAUTH_SECRET': process.env.NEXTAUTH_SECRET ? '[SET]' : '[NOT SET]',
      'OIDC_ISSUER': process.env.OIDC_ISSUER ? '[SET]' : '[NOT SET]',
      'OIDC_CLIENT_ID': process.env.OIDC_CLIENT_ID ? '[SET]' : '[NOT SET]',
      'OIDC_CLIENT_SECRET': process.env.OIDC_CLIENT_SECRET ? '[SET]' : '[NOT SET]',
      'NODE_ENV': process.env.NODE_ENV || '',
    };

    setEnvVars(safeEnvVars);
  }, []);

  const testCognitoEndpoint = async () => {
    try {
      if (!process.env.OIDC_ISSUER) {
        setError('OIDC_ISSUER is not set');
        return;
      }

      const wellKnownUrl = `${process.env.OIDC_ISSUER}/.well-known/openid-configuration`;
      const response = await fetch(wellKnownUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch OpenID configuration: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('OpenID Configuration:', data);
      setError(null);
      alert('OpenID configuration fetched successfully. Check console for details.');
    } catch (err) {
      console.error('Error testing Cognito endpoint:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  if (error && process.env.NODE_ENV !== 'development') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert
          message="Access Denied"
          description="This page is only available in development mode."
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <Typography.Title level={2}>Debug Information</Typography.Title>
      
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          className="mb-4"
        />
      )}
      
      <Card title="Environment Variables" className="mb-4">
        <Descriptions bordered column={1}>
          {Object.entries(envVars).map(([key, value]) => (
            <Descriptions.Item key={key} label={key}>
              {value}
            </Descriptions.Item>
          ))}
        </Descriptions>
      </Card>
      
      <Button type="primary" onClick={testCognitoEndpoint}>
        Test Cognito Endpoint
      </Button>
    </div>
  );
} 