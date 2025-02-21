'use client';

import React, { useState, useRef } from 'react';
import { Select, Form, Input, Button, Spin } from 'antd';
import ReactMarkdown from 'react-markdown';
import { WS_URL } from '../config';
import { modelOptions } from '../config/models';

const { Option } = Select;
const { TextArea } = Input;

const ChatForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textAreaRef = useRef(null);
  const [shouldFocus, setShouldFocus] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse]);

  const connectWebSocket = (formData) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    let responseAccumulator = '';

    ws.onopen = () => {
      console.log('WebSocket Connected');
      
      // 获取最近5条聊天历史
      const recentMessages = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const message = {
        action: "predict",
        model: formData.model,
        prompt: formData.message,
        context: recentMessages  // 添加聊天历史作为上下文
      };
      
      console.log(message);
      ws.send(JSON.stringify(message));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'error') {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `⚠️ 错误: ${data.message}`
        }]);
        setLoading(false);
        ws.close();
        return;
      }

      if (data.type === 'response') {
        if (data.content) {
          responseAccumulator += data.content;
          setCurrentResponse(responseAccumulator);
        }

        if (data.done) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: responseAccumulator
          }]);
          setCurrentResponse('');
          setLoading(false);
          form.resetFields(['message']);
          setTimeout(() => {
            const messageInput = form.getFieldInstance('message');
            if (messageInput) {
              messageInput.focus();
              messageInput.textArea?.focus();
            }
          }, 0);
          ws.close();
        }
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      alert('连接错误，请重试！');
      setLoading(false);
      ws.close();
    };

    ws.onclose = () => {
      console.log('WebSocket Disconnected');
      wsRef.current = null;  // 清除引用
      setLoading(false);
    };
  };

  const onFinish = async (values) => {
    try {
      if (loading) return;
      setLoading(true);

      // 清空当前响应，为新的对话做准备
      setCurrentResponse('');

      // 先添加用户消息到历史记录，这样它也会被包含在context中
      const newMessage = {
        role: 'user',
        content: values.message
      };
      
      setMessages(prev => [...prev, newMessage]);

      const formData = {
        model: values.model,
        message: values.message,
      };

      connectWebSocket(formData);
    } catch (error) {
      console.error('发送失败:', error);
      alert('发送失败，请重试！');
      setLoading(false);
    }
  };

  React.useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-40px)]">
      <div className="flex-1 bg-white rounded-lg shadow-sm mb-4 p-6 overflow-y-auto">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`mb-4 ${msg.role === 'user' ? 'text-right' : ''}`}
          >
            <div
              className={`inline-block max-w-[80%] p-3 rounded-lg ${msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
                }`}
            >
              <ReactMarkdown
                className="prose prose-sm max-w-none"
                components={{
                  p: ({ node, ...props }) => <p className="my-1" {...props} />,
                  pre: ({ node, ...props }) => (
                    <pre className="bg-gray-800 text-white p-2 rounded" {...props} />
                  ),
                  code: ({ node, inline, ...props }) => (
                    inline
                      ? <code className="bg-gray-200 px-1 rounded" {...props} />
                      : <code className="block bg-gray-800 text-white p-2 rounded" {...props} />
                  ),
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {currentResponse && (
          <div className="mb-4">
            <div className="inline-block max-w-[80%] p-3 rounded-lg bg-gray-100 text-gray-800">
              <ReactMarkdown
                className="prose prose-sm max-w-none"
                components={{
                  p: ({ node, ...props }) => <p className="my-1" {...props} />,
                  pre: ({ node, ...props }) => (
                    <pre className="bg-gray-800 text-white p-2 rounded" {...props} />
                  ),
                  code: ({ node, inline, ...props }) => (
                    inline
                      ? <code className="bg-gray-200 px-1 rounded" {...props} />
                      : <code className="block bg-gray-800 text-white p-2 rounded" {...props} />
                  ),
                }}
              >
                {currentResponse}
              </ReactMarkdown>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <div className="flex gap-4">
            <Form.Item
              name="model"
              className="w-48 mb-0"
              initialValue="amazon.nova-pro-v1:0"
            >
              <Select>
                {modelOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="message"
              className="flex-1 mb-0"
              rules={[{ required: true, message: '请输入消息' }]}
            >
              <TextArea
                autoFocus={shouldFocus}
                placeholder="请输入消息"
                autoSize={{ minRows: 1, maxRows: 6 }}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    form.submit();
                  }
                }}
              />
            </Form.Item>

            <Form.Item className="mb-0">
              <Button type="primary" htmlType="submit" loading={loading}>
                发送
              </Button>
            </Form.Item>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default ChatForm; 