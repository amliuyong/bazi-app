'use client';

import React, { useState, useRef } from 'react';
import { Select, Form, DatePicker, Button, Spin, Input } from 'antd';
import ReactMarkdown from 'react-markdown';
import { WS_URL } from '../config';
import { modelOptions } from '../config/models';
import { getLunarDate } from '../utils/lunar';

const { Option } = Select;

const NameAnalysisForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('');
  const wsRef = useRef(null);

  // 格式化个人信息
  const formatPersonalInfo = (formData) => {
    const gender = formData.gender === 'male' ? '男' : '女';
    return `姓名：${formData.name}，性别：${gender}，出生时间：${formData.birthDate}，农历：${getLunarDate(formData.birthDate)}`;
  };

  // 生成分析提示模板
  const generatePrompt = (formData) => {
    return `假设你是一位精通姓名学、八字和星座的大师，给我进行姓名分析，我的信息：${formatPersonalInfo(formData)}。

请按照以下方面进行分析：
1. 姓名五行分析
2. 姓名三才配置
3. 姓名笔画分析
4. 结合生辰八字分析姓名契合度
5. 结合星座特征分析姓名寓意
6. 姓名对个人发展的影响
7. 给出姓名综合评分（满分100分）

最后请根据以上分析，结合生辰八字、星座特征，推荐10个高分候选名字(2个字或者3个字)，并说明每个名字的寓意和评分。

今天是 ${new Date().toLocaleDateString()}, 请用专业且通俗易懂的语言进行分析。`;
  };

  const connectWebSocket = (formData) => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
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

      if (data.type === 'error') {
        setStreamingResponse(`⚠️ 错误: ${data.message}`);
        setLoading(false);
        ws.close();
        return;
      }

      if (data.type === 'response' && data.content) {
        setStreamingResponse(prev => prev + data.content);
      }

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

      const formData = {
        ...values,
        birthDate: formattedDate,
        lunarDate: getLunarDate(formattedDate),
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
        <h2 className="text-lg font-medium mb-6">姓名分析</h2>
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
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Form.Item
            name="gender"
            label="性别"
            rules={[{ required: true, message: '请选择性别' }]}
          >
            <Select placeholder="请选择性别">
              <Option value="male">男</Option>
              <Option value="female">女</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="birthDate"
            label="出生日期"
            rules={[{ required: true, message: '请选择出生日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              开始分析
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
              <p className="mb-2"><strong>姓名：</strong>{submittedData.name}</p>
              <p className="mb-2"><strong>性别：</strong>{submittedData.gender === 'male' ? '男' : '女'}</p>
              <p className="mb-2"><strong>公历出生日期：</strong>{submittedData.birthDate}</p>
              <p className="mb-2"><strong>农历出生日期：</strong>{submittedData.lunarDate}</p>
            </div>

            <h2 className="text-lg font-medium mb-4">分析提示</h2>
            <div className="mb-6 p-4 bg-gray-50 rounded text-sm font-mono whitespace-pre-wrap">
              {currentPrompt}
            </div>

            <h2 className="text-lg font-medium mb-4">分析结果</h2>
            <div className="prose max-w-none">
              {streamingResponse ? (
                <ReactMarkdown>
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

export default NameAnalysisForm; 