import fetch from 'node-fetch';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from "@aws-sdk/client-bedrock-runtime";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import OpenAI from 'openai';

export const handler = async (event) => {
  console.log("event:", event);

  const connectionId = event.requestContext.connectionId;
  const domain = event.requestContext.domainName;
  const stage = event.requestContext.stage;
  const endpoint = `https://${domain}/${stage}`;
  
  const apiGatewayClient = new ApiGatewayManagementApiClient({
    endpoint: endpoint,
  });

  try {
    const body = JSON.parse(event.body);
    console.log("body:", body);

    if (body.model.startsWith('deepseek')) {
      // 使用 Ollama API
      return await handleOllamaStream(body, connectionId, apiGatewayClient);
    } else if (body.model.startsWith('anthropic')) {
      // 使用 AWS Bedrock
      return await handleBedrockAnthropicStream(body, connectionId, apiGatewayClient);
    } else if (body.model.startsWith('amazon.nova')) {
      // 使用 AWS Bedrock Nova
      return await handleNovaStream(body, connectionId, apiGatewayClient);
    } else if (body.model.startsWith('openai')) {
      // 使用 OpenAI API
      return await handleOpenAIStream(body, connectionId, apiGatewayClient);
    } else {
      throw new Error('Unsupported model');
    }

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

// Ollama 处理函数
async function handleOllamaStream(body, connectionId, apiGatewayClient) {
  const ollamaUrl = process.env.OLLAMA_API_URL;
  const response = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: body.model,
      prompt: body.prompt,
      stream: true,
    }),
  });

  const reader = response.body;
  const decoder = new TextDecoder();

  for await (const chunk of reader) {
    const text = decoder.decode(chunk);
    const lines = text.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        await apiGatewayClient.send(new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: JSON.stringify({
            type: 'response',
            content: data.response,
            done: data.done
          })
        }));

        if (data.done) break;
      } catch (e) {
        console.error('Error parsing line:', e);
      }
    }
  }

  return { statusCode: 200 };
}

// Bedrock 处理函数
async function handleBedrockAnthropicStream(body, connectionId, apiGatewayClient) {
  const bedrockClient = new BedrockRuntimeClient({ 
    region: process.env.AWS_REGION
  });
  
  // Use Claude 3 models
  const modelId = body.model;

  console.log('Using model:', modelId);

  const command = new InvokeModelWithResponseStreamCommand({
    modelId: modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: body.prompt
            }
          ]
        }
      ]
    })
  });

  try {
    const response = await bedrockClient.send(command);
    const chunks = [];

    for await (const chunk of response.body) {
      const decoded = JSON.parse(new TextDecoder().decode(chunk.chunk.bytes));
      console.log('decoded chunk:', decoded);

      if (decoded.type === 'content_block_delta') {
        await apiGatewayClient.send(new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: JSON.stringify({
            type: 'response',
            content: decoded.delta.text,
            done: false
          })
        }));
        chunks.push(decoded.delta.text);
      }
    }

    // 发送完成信号
    await apiGatewayClient.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify({
        type: 'response',
        content: '',
        done: true
      })
    }));

    return { statusCode: 200 };
  } catch (error) {
    console.error('Bedrock Error:', error);
    await apiGatewayClient.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify({
        type: 'error',
        message: `Bedrock Error: ${error.message}`
      })
    }));
    return { statusCode: 500 };
  }
}

// Nova handler function
async function handleNovaStream(body, connectionId, apiGatewayClient) {
  const bedrockClient = new BedrockRuntimeClient({ 
    region: process.env.AWS_REGION
  });
  
  const modelId = body.model;
  console.log('Using Nova model:', modelId);

  const command = new InvokeModelWithResponseStreamCommand({
    modelId: modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      inferenceConfig: {
        max_new_tokens: 4096,
      },
      messages: [
        {
          role: "user",
          content: [
            {
              text: body.prompt
            }
          ]
        }
      ]
    })
  });

  try {
    const response = await bedrockClient.send(command);
    let isFirstChunk = true;
    let responseText = '';

    let messageStop = false;

    for await (const chunk of response.body) {
      const decoded = JSON.parse(new TextDecoder().decode(chunk.chunk.bytes));
      
      // Log first chunk for debugging
      if (isFirstChunk) {
        console.log('First chunk:', decoded);
        isFirstChunk = false;
      }

      console.log('decoded chunk:', decoded);

      // Nova returns chunks with delta.text field
      if (decoded.contentBlockDelta?.delta?.text) {
        responseText += decoded.contentBlockDelta.delta.text;
        await apiGatewayClient.send(new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: JSON.stringify({
            type: 'response',
            content: decoded.contentBlockDelta.delta.text,
            done: false
          })
        }));
      }
    }

    // Send final response if we have accumulated text
    if (responseText && !messageStop) {
      await apiGatewayClient.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify({
          type: 'response',
          content: '',
          done: true
        })
      }));
    } else {
      // If no response was generated, send an error
      await apiGatewayClient.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify({
          type: 'error',
          message: 'No response generated from Nova model'
        })
      }));
    }

    return { statusCode: 200 };
  } catch (error) {
    console.error('Nova Error:', error);
    await apiGatewayClient.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify({
        type: 'error',
        message: `Nova Error: ${error.message}`
      })
    }));
    return { statusCode: 500 };
  }
}

// 添加获取 OpenAI API Key 的函数
async function getOpenAIKey() {
  const ssmClient = new SSMClient({ region: process.env.AWS_REGION });
  const command = new GetParameterCommand({
    Name: '/openai/api-key',
    WithDecryption: true,
  });
  
  try {
    const response = await ssmClient.send(command);
    return response.Parameter.Value;
  } catch (error) {
    console.error('Error fetching OpenAI API Key:', error);
    throw new Error('Failed to fetch OpenAI API Key');
  }
}

// OpenAI 处理函数
async function handleOpenAIStream(body, connectionId, apiGatewayClient) {
  const apiKey = await getOpenAIKey();
  const openai = new OpenAI({
    apiKey: apiKey
  });

  const model = body.model.replace('openai.', '');
  console.log("model:", model);
  
  const stream = await openai.chat.completions.create({
    model: model,
    messages: [{ role: 'user', content: body.prompt }],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      await apiGatewayClient.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify({
          type: 'response',
          content: content,
          done: false
        })
      }));
    }
  }

  // 发送完成信号
  await apiGatewayClient.send(new PostToConnectionCommand({
    ConnectionId: connectionId,
    Data: JSON.stringify({
      type: 'response',
      content: '',
      done: true
    })
  }));

  return { statusCode: 200 };
} 