import fetch from 'node-fetch';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";

export const handler = async (event) => {
  console.log("event:", event);

  const connectionId = event.requestContext.connectionId;
  const domain = event.requestContext.domainName;
  const stage = event.requestContext.stage;

  console.log("domain:", domain);
  console.log("stage:", stage);
  console.log("connectionId:", connectionId);

  // endpoint
  const endpoint = `https://${domain}/${stage}`;
  console.log("endpoint:", endpoint);

  const apiGatewayClient = new ApiGatewayManagementApiClient({
    endpoint: endpoint,
  });

  try {
    const body = JSON.parse(event.body);
    console.log("body:", body);

    // ollama url
    const ollamaUrl = process.env.OLLAMA_API_URL;
    console.log("ollamaUrl:", ollamaUrl);

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: body.model,
        prompt: body.prompt,
        stream: true, // Always use streaming
      }),
    });

    // 处理流式响应
    const reader = response.body;
    const decoder = new TextDecoder();

    for await (const chunk of reader) {
      const text = decoder.decode(chunk);
      console.log("text:", text);
      
      const lines = text.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          // 发送响应给客户端
          const command = new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: JSON.stringify({
              type: 'response',
              content: data.response,
              done: data.done
            })
          });
          
          await apiGatewayClient.send(command);

          if (data.done) {
            break;
          }
        } catch (e) {
          console.error('Error parsing line:', e);
        }
      }
    }

    return { statusCode: 200 };
  } catch (error) {
    console.error('Error:', error);
    try {
      const command = new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify({
          type: 'error',
          message: error.message
        })
      });
      
      await apiGatewayClient.send(command);
    } catch (e) {
      console.error('Error sending error message:', e);
    }
    return { statusCode: 500 };
  }
}; 