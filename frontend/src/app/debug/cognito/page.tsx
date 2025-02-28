'use client';

import { useState } from 'react';
import { Card, Typography, Button, Alert, Input, Form, Space } from 'antd';

export default function CognitoDebugPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testCognitoEndpoint = async (values: any) => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const wellKnownUrl = `${values.issuer}/.well-known/openid-configuration`;
      console.log("Testing endpoint:", wellKnownUrl);
      
      const response = await fetch(wellKnownUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch OpenID configuration: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('OpenID Configuration:', data);
      setResult(data);
    } catch (err) {
      console.error('Error testing Cognito endpoint:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <Typography.Title level={2}>Cognito Configuration Tester</Typography.Title>
      
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          className="mb-4"
        />
      )}
      
      <Card title="Test Cognito Configuration" className="mb-4">
        <Form onFinish={testCognitoEndpoint} layout="vertical" initialValues={{
          issuer: process.env.OIDC_ISSUER || 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KsExye6ap',
          clientId: process.env.OIDC_CLIENT_ID || '7uu9n8u815hesal3hgv2ctbtok',
          redirectUri: `${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/auth/callback/cognito`
        }}>
          <Form.Item 
            name="issuer" 
            label="Issuer URL"
            rules={[{ required: true, message: 'Please enter the issuer URL' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item 
            name="clientId" 
            label="Client ID"
            rules={[{ required: true, message: 'Please enter the client ID' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item 
            name="redirectUri" 
            label="Redirect URI"
            rules={[{ required: true, message: 'Please enter the redirect URI' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Test Configuration
              </Button>
              <Button onClick={() => window.open('https://console.aws.amazon.com/cognito/users', '_blank')}>
                Open Cognito Console
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
      
      {result && (
        <Card title="OpenID Configuration">
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </Card>
      )}
      
      <Typography.Title level={3} className="mt-8">Common Issues</Typography.Title>
      <Card>
        <Typography.Paragraph>
          <strong>invalid_client error:</strong> This usually means one of the following:
        </Typography.Paragraph>
        <ul className="list-disc pl-8">
          <li>The client ID is incorrect</li>
          <li>The client secret is required but not provided (check if your app is configured as "confidential" in Cognito)</li>
          <li>The redirect URI is not configured correctly in the Cognito User Pool</li>
        </ul>
        
        <Typography.Title level={4} className="mt-4">Cognito App Client Configuration Checklist:</Typography.Title>
        <ul className="list-disc pl-8">
          <li>Ensure the app client is configured with the correct callback URL: <code>{process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/auth/callback/cognito</code></li>
          <li>If your app is configured as a "public client" (no client secret), ensure you're not providing a client secret</li>
          <li>If your app requires a client secret, ensure you've provided the correct one</li>
          <li>Check that the "Allowed OAuth Flows" includes "Authorization code grant"</li>
          <li>Verify that "Allowed OAuth Scopes" includes "openid", "email", and "profile"</li>
        </ul>
      </Card>
    </div>
  );
} 