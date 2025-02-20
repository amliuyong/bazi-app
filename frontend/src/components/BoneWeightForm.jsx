'use client';

import React, { useState, useRef } from 'react';
import { Form, Button, DatePicker, TimePicker, Spin } from 'antd';
import ReactMarkdown from 'react-markdown';
import { WS_URL, MODEL } from '../config';
import solarLunar from 'solarlunar';

const BoneWeightForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [streamingResponse, setStreamingResponse] = useState('');
  const wsRef = useRef(null);

  const connectWebSocket = (formData) => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket Connected');
      const message = {
        action: "predict",
        model: MODEL,
        prompt: `今天是 ${new Date().toLocaleDateString()}，个人信息如下：${JSON.stringify(formData)}。请根据骨重算命理论，分析此人的命理，并提供相应的建议。`
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

  // 添加阳历转阴历的函数
  const getLunarDate = (dateStr) => {
    if (!dateStr) return '';

    try {
      // 解析日期
      const [year, month, day] = dateStr.split('-').map(Number);
      
      // 使用 solarLunar 转换
      const lunar = solarLunar.solar2lunar(year, month, day);
      
      // 返回格式化的阴历日期
      return `农历${lunar.lYear}年${lunar.lMonth}月${lunar.lDay}日`;
    } catch (error) {
      console.error('农历转换错误:', error);
      return dateStr; // 如果转换失败，返回原始日期
    }
  };

  // 添加时辰转换函数
  const getLunarTime = (timeStr) => {
    if (!timeStr) return '';

    const hour = parseInt(timeStr.split(':')[0]);

    // 定义时辰对照表
    const timeMap = {
      23: '子时', 0: '子时',
      1: '丑时', 2: '丑时',
      3: '寅时', 4: '寅时',
      5: '卯时', 6: '卯时',
      7: '辰时', 8: '辰时',
      9: '巳时', 10: '巳时',
      11: '午时', 12: '午时',
      13: '未时', 14: '未时',
      15: '申时', 16: '申时',
      17: '酉时', 18: '酉时',
      19: '戌时', 20: '戌时',
      21: '亥时', 22: '亥时'
    };

    return timeMap[hour] || '';
  };

  const onFinish = async (values) => {
    try {
      setLoading(true);
      setStreamingResponse('');

      const formattedDate = values.birthDate?.format('YYYY-MM-DD');
      const formattedTime = values.birthTime?.format('HH:mm');

      const formData = {
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