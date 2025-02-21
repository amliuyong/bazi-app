'use client';

import React, { useState, useRef } from 'react';
import { Select, Form, Button, DatePicker, TimePicker, Spin } from 'antd';
import ReactMarkdown from 'react-markdown';
import { WS_URL } from '../config';
import { modelOptions } from '../config/models';
import { getLunarDate, getLunarTime } from '../utils/lunar';

const { Option } = Select;

const BoneWeightForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('');
  const wsRef = useRef(null);

  // 格式化个人信息
  const formatPersonalInfo = (formData) => {
    return `出生时间：${formData.birthDate} ${formData.birthTime}，农历：${getLunarDate(formData.birthDate)} ${getLunarTime(formData.birthTime)}`;
  };

  // 生成分析提示模板
  const generatePrompt = (formData) => {
    return `假设你是一位精通骨重算命的大师，给我进行骨重算命分析，我的信息：${formatPersonalInfo(formData)}。

请按照以下方面进行分析：
1. 计算骨重值
2. 骨重特征解读
3. 先天禀赋分析
4. 性格特点描述
5. 事业发展方向
6. 财运和理财建议
7. 健康状况提醒
8. 感情婚姻分析
9. 今年运势预测

今天是 ${new Date().toLocaleDateString()}, 请给出详细的分析和实用的建议，用通俗易懂的语言表达。`;
  };

  const connectWebSocket = (formData) => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket Connected');
      const prompt = generatePrompt(formData);
      setCurrentPrompt(prompt);
      
      const message = {
        action: "predict",
        model: formData.model,
        prompt: prompt
      };
      ws.send(JSON.stringify(message));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // 处理错误消息
      if (data.type === 'error') {
        setStreamingResponse(`⚠️ 错误: ${data.message}`);
        setLoading(false);
        ws.close();
        return;
      }

      // 处理正常响应
      if (data.type === 'response' && data.content) {
        setStreamingResponse(prev => prev + data.content);
      }

      // 检查是否是最后一条消息
      if (data.type === 'response' && data.done) {
        setLoading(false);
        ws.close();
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      alert('连接错误，请重试！');
      setLoading(false);
    };

    ws.onclose = () => {
      console.log('WebSocket Disconnected');
      setLoading(false);
    };
  };

  const onFinish = async (values) => {
    try {
      setLoading(true);
      setStreamingResponse('');

      const formattedDate = values.birthDate?.format('YYYY-MM-DD');
      const formattedTime = values.birthTime?.format('HH:mm');

      const formData = {
        model: values.model,
        birthDate: formattedDate,
        birthTime: formattedTime,
        lunarDate: getLunarDate(formattedDate),
        lunarTime: getLunarTime(formattedTime),
      };

      setSubmittedData(formData);
      connectWebSocket(formData);
    } catch (error) {
      console.error('提交失败:', error);
      alert('提交失败，请重试！');
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
    <div className="flex gap-6">
      {/* 左侧表单 */}
      <div className="w-[400px] bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-medium mb-6">骨重算命</h2>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            name="model"
            label="选择模型"
            rules={[{ required: true, message: '请选择模型' }]}
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
            name="birthDate"
            label="出生日期"
            rules={[{ required: true, message: '请选择出生日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="birthTime"
            label="出生时间"
            rules={[{ required: true, message: '请选择出生时间' }]}
          >
            <TimePicker style={{ width: '100%' }} format="HH:mm" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              提交
            </Button>
          </Form.Item>
        </Form>
      </div>

      {/* 右侧结果显示 */}
      <div className="flex-1">
        {submittedData ? (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-medium mb-4">个人信息</h2>
            <div className="mb-6 text-sm">
              <p className="mb-2"><strong>公历出生日期：</strong>{submittedData.birthDate}</p>
              <p className="mb-2"><strong>公历出生时间：</strong>{submittedData.birthTime}</p>
              <p className="mb-2"><strong>阴历出生日期：</strong>{submittedData.lunarDate}</p>
              <p className="mb-2"><strong>阴历出生时间：</strong>{submittedData.lunarTime}</p>
            </div>

            <h2 className="text-lg font-medium mb-4">分析提示</h2>
            <div className="mb-6 p-4 bg-gray-50 rounded text-sm font-mono whitespace-pre-wrap">
              {currentPrompt}
            </div>

            <h2 className="text-lg font-medium mb-4">分析结果</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              {streamingResponse ? (
                <ReactMarkdown
                  className="prose prose-sm max-w-none"
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-xl font-bold my-4" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-lg font-bold my-3" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-base font-bold my-2" {...props} />,
                    p: ({node, ...props}) => <p className="my-2 leading-relaxed" {...props} />,
                    ul: ({node, ...props}) => <ul className="my-2 pl-6 list-disc" {...props} />,
                    ol: ({node, ...props}) => <ol className="my-2 pl-6 list-decimal" {...props} />,
                    code: ({node, inline, ...props}) => (
                      inline ? 
                        <code className="bg-gray-100 px-1 py-0.5 rounded" {...props} /> :
                        <code className="block bg-gray-100 p-4 rounded my-2" {...props} />
                    ),
                  }}
                >
                  {streamingResponse}
                </ReactMarkdown>
              ) : (
                <div className="flex items-center gap-2 text-gray-500">
                  <Spin size="small" />
                  <span>正在分析...</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-sm text-gray-500 text-center">
            请在左侧填写个人信息
          </div>
        )}
      </div>
    </div>
  );
};

export default BoneWeightForm; 