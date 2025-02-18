'use client';

import React, { useState } from 'react';
import { Select, Form, Input, Button, DatePicker, TimePicker } from 'antd';
import axios from 'axios';
import { provinces, cityData } from '../data/cities';
import { endpoints } from '../config';

const { Option } = Select;

const BirthInfoForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [submittedData, setSubmittedData] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);

  const onProvinceChange = (value) => {
    setSelectedProvince(value);
    form.setFieldValue('city', undefined); // 清空城市选择
  };

  const getCities = () => {
    if (!selectedProvince) return [];
    return cityData[selectedProvince]?.cities || [];
  };

  const onFinish = async (values) => {
    try {
      setLoading(true);
      // 格式化日期和时间
      const formattedDate = values.birthDate?.format('YYYY-MM-DD');
      const formattedTime = values.birthTime?.format('HH:mm');
      
      const formData = {
        ...values,
        birthDate: formattedDate,
        birthTime: formattedTime,
        province: cityData[values.province]?.label,
        city: getCities().find(city => city.value === values.city)?.label,
      };

      const response = await axios.post(endpoints.predict, formData);
      
      console.log('提交成功:', response.data);
      // 保存提交的数据和API响应
      setSubmittedData(formData);
      setApiResponse(response.data);
      form.resetFields();
    } catch (error) {
      console.error('提交失败:', error);
      alert('提交失败，请重试！');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <h1>个人信息登记表</h1>
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

      {/* 显示提交结果 */}
      {submittedData && (
        <div style={{ marginTop: 24, padding: 24, border: '1px solid #d9d9d9', borderRadius: 8 }}>
          <h2>提交信息</h2>
          <div style={{ marginBottom: 16 }}>
            <p><strong>姓名：</strong>{submittedData.name}</p>
            <p><strong>性别：</strong>{submittedData.gender === 'male' ? '男' : '女'}</p>
            <p><strong>出生日期：</strong>{submittedData.birthDate}</p>
            <p><strong>出生时间：</strong>{submittedData.birthTime}</p>
            <p><strong>出生地点：</strong>{submittedData.province} {submittedData.city}</p>
          </div>
          
          <h2>预测结果</h2>
          <div style={{ 
            padding: 16, 
            background: '#f5f5f5', 
            borderRadius: 4,
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            overflowX: 'auto'
          }}>
            {JSON.stringify(apiResponse, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
};

export default BirthInfoForm; 