'use client';

import React, { useState, useRef } from 'react';
import { Select, Form, DatePicker, TimePicker, Button, Spin, Input } from 'antd';
import { provinces, cityData } from '../data/cities';
import ReactMarkdown from 'react-markdown';
import { WS_URL } from '../config';
import { modelOptions } from '../config/models';

const { Option } = Select;

const AstrologyForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [submittedData, setSubmittedData] = useState(null);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('');
  const wsRef = useRef(null);

  const onProvinceChange = (value) => {
    setSelectedProvince(value);
    form.setFieldValue('city', undefined);
  };

  const getCities = () => {
    if (!selectedProvince) return [];
    return cityData[selectedProvince]?.cities || [];
  };

  // 格式化个人信息
  const formatPersonalInfo = (formData) => {
    const gender = formData.gender === 'male' ? '男' : '女';
    return `姓名：${formData.name}，性别：${gender}，出生时间：${formData.birthDate} ${formData.birthTime}，出生地点：${formData.province}${formData.city}`;
  };

  // 生成分析提示模板
  const generatePrompt = (formData) => {
    return `假设你是一位著名的星座大师，给我进行星座和运势分析，我的信息：${formatPersonalInfo(formData)}。
先根据我的出生日期和时间计算太阳星座，月亮星座，上升星座。
请根据的星座特征，结合 MBTI 性格分析，描述这个星座的典型性格特征、优缺点、适合的职业、恋爱风格，并提供 3 条建议帮助他们更好地成长。
结合星座和塔罗牌，请提供运势解析，并给予实用建议。
今天是 ${new Date().toLocaleDateString()}, 提供今年，今月，今日运势，幸运数，幸运色。
语言生动、有趣，带点幽默感。`;
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
        ...values,
        birthDate: formattedDate,
        birthTime: formattedTime,
        province: cityData[values.province]?.label,
        city: getCities().find(city => city.value === values.city)?.label,
        model: values.model,
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
        <h2 className="text-lg font-medium mb-6">星座分析</h2>
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

          <Form.Item
            name="birthTime"
            label="出生时间"
            rules={[{ required: true, message: '请选择出生时间' }]}
          >
            <TimePicker style={{ width: '100%' }} format="HH:mm" />
          </Form.Item>

          <Form.Item
            name="province"
            label="出生省份"
            rules={[{ required: true, message: '请选择出生省份' }]}
          >
            <Select
              placeholder="请选择省份"
              onChange={onProvinceChange}
            >
              {provinces.map(province => (
                <Option key={province.value} value={province.value}>
                  {province.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="city"
            label="出生城市"
            rules={[{ required: true, message: '请选择出生城市' }]}
          >
            <Select
              placeholder="请选择城市"
              disabled={!selectedProvince}
            >
              {getCities().map(city => (
                <Option key={city.value} value={city.value}>
                  {city.label}
                </Option>
              ))}
            </Select>
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
              <p className="mb-2"><strong>姓名：</strong>{submittedData.name}</p>
              <p className="mb-2"><strong>性别：</strong>{submittedData.gender === 'male' ? '男' : '女'}</p>
              <p className="mb-2"><strong>出生日期：</strong>{submittedData.birthDate}</p>
              <p className="mb-2"><strong>出生时间：</strong>{submittedData.birthTime}</p>
              <p className="mb-2"><strong>出生地点：</strong>{submittedData.province} {submittedData.city}</p>
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

export default AstrologyForm; 