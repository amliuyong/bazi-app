'use client';

import React, { useState, useRef } from 'react';
import { Select, Form, DatePicker, Input, Button, Spin } from 'antd';
import ReactMarkdown from 'react-markdown';
import { WS_URL } from '../config';
import { modelOptions } from '../config/models';
import { getLunarDate, getLunarTime } from '../utils/lunar';

const { Option } = Select;
const { TimePicker } = DatePicker;

const nameCountOptions = [
  { value: '2', label: '2字' },
  { value: '3', label: '3字' },
  { value: '4', label: '4字' },
];

const recommendCountOptions = [
  { value: '5', label: '5个' },
  { value: '10', label: '10个' },
  { value: '15', label: '15个' },
  { value: '20', label: '20个' },
];

// 获取名字字数的显示文本
const getNameCountLabel = (value) => {
  const option = nameCountOptions.find(opt => opt.value === value);
  return option ? option.label : value;
};

const NamingForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('');
  const wsRef = useRef(null);

  // 格式化个人信息
  const formatPersonalInfo = (formData) => {
    const gender = formData.gender === 'male' ? '男' : '女';
    let info = `姓氏：${formData.lastName}，性别：${gender}，出生时间：${formData.birthDate} ${formData.birthTime}，农历：${getLunarDate(formData.birthDate)} ${getLunarTime(formData.birthTime)}`;
    
    if (formData.fatherName) {
      info += `，父亲姓名：${formData.fatherName}`;
    }
    if (formData.motherName) {
      info += `，母亲姓名：${formData.motherName}`;
    }
    info += `，期望字数：${getNameCountLabel(formData.nameCount)}`;
    info += `，推荐数量：${formData.recommendCount}个`;
    
    return info;
  };

  // 生成分析提示模板
  const generatePrompt = (formData) => {
    return `假设你是一位精通起名、八字和星座的大师，请帮我取名，我的信息：${formatPersonalInfo(formData)}。

请按照以下方面进行分析和起名：
1. 八字分析：根据出生时间分析八字特征
2. 五行分析：分析五行缺失和喜用神
3. 星座分析：分析星座特征和性格倾向
4. 姓名学分析：结合姓氏分析音律、字形、五行搭配

根据以上分析，推荐${formData.recommendCount}个高分名字，每个名字需要：
1. 完整解释名字的寓意
2. 分析名字的五行配置
3. 与八字的契合度
4. 与星座特征的呼应
5. 音律和美感分析
6. 综合评分（满分100分）
7. 对未来发展的影响

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

  const onFinish = (values) => {
    const formData = {
      ...values,
      birthDate: values.birthDate.format('YYYY-MM-DD'),
      birthTime: values.birthTime.format('HH:mm'),
    };
    
    setLoading(true);
    setSubmittedData(formData);
    setStreamingResponse('');
    connectWebSocket(formData);
  };

  return (
    <div className="flex gap-6">
      <div className="w-96 bg-white p-6 rounded-lg shadow-sm">
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
            name="lastName"
            label="姓氏"
            rules={[{ required: true, message: '请输入姓氏' }]}
          >
            <Input placeholder="请输入姓氏" />
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
            <TimePicker 
              style={{ width: '100%' }} 
              format="HH:mm"
              minuteStep={1}
              showNow={false}
            />
          </Form.Item>

          <Form.Item
            name="nameCount"
            label="名字字数"
            rules={[{ required: true, message: '请选择名字字数' }]}
          >
            <Select placeholder="请选择名字字数">
              {nameCountOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="recommendCount"
            label="推荐姓名个数"
            rules={[{ required: true, message: '请选择推荐姓名个数' }]}
            initialValue="10"
          >
            <Select placeholder="请选择推荐姓名个数">
              {recommendCountOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="fatherName"
            label="父亲姓名（可选）"
          >
            <Input placeholder="请输入父亲姓名" />
          </Form.Item>

          <Form.Item
            name="motherName"
            label="母亲姓名（可选）"
          >
            <Input placeholder="请输入母亲姓名" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              开始分析
            </Button>
          </Form.Item>
        </Form>
      </div>

      <div className="flex-1">
        {submittedData ? (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-medium mb-4">个人信息</h2>
            <div className="mb-6 text-sm">
              <p className="mb-2"><strong>姓氏：</strong>{submittedData.lastName}</p>
              <p className="mb-2"><strong>性别：</strong>{submittedData.gender === 'male' ? '男' : '女'}</p>
              <p className="mb-2"><strong>公历：</strong>{submittedData.birthDate} {submittedData.birthTime}</p>
              <p className="mb-2"><strong>农历：</strong>{getLunarDate(submittedData.birthDate)} {getLunarTime(submittedData.birthTime)}</p>
              <p className="mb-2"><strong>名字字数：</strong>{getNameCountLabel(submittedData.nameCount)}</p>
              <p className="mb-2"><strong>推荐个数：</strong>{submittedData.recommendCount}个</p>
              {submittedData.fatherName && (
                <p className="mb-2"><strong>父亲姓名：</strong>{submittedData.fatherName}</p>
              )}
              {submittedData.motherName && (
                <p className="mb-2"><strong>母亲姓名：</strong>{submittedData.motherName}</p>
              )}
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

export default NamingForm; 