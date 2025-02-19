'use client';

import React, { useState, useRef } from 'react';
import { Select, Form, DatePicker, TimePicker, Button, Spin, Input } from 'antd';
import { provinces, cityData } from '../data/cities';
import ReactMarkdown from 'react-markdown';
import { WS_URL, MODEL } from '../config';

const { Option } = Select;

const AstrologyForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [submittedData, setSubmittedData] = useState(null);
  const [streamingResponse, setStreamingResponse] = useState('');
  const wsRef = useRef(null);

  const onProvinceChange = (value) => {
    setSelectedProvince(value);
    form.setFieldValue('city', undefined);
  };

  const getCities = () => {
    if (!selectedProvince) return [];
    return cityData[selectedProvince]?.cities || [];
  };

  const connectWebSocket = (formData) => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket Connected');
      const message = {
        action: "predict",
        model: MODEL,
        prompt: `今天是 ${new Date().toLocaleDateString()}，个人信息如下：${JSON.stringify(formData)}。分析我的星座运势，分析结果包含：星座特点、性格分析、爱情观、事业发展、月亮星座、上升星座、今年运势、建议等。`
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

export default AstrologyForm; 