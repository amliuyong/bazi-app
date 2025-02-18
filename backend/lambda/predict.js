export const handler = async (event) => {
  try {
    // 解析请求体
    const body = JSON.parse(event.body);
    const {
      name,
      gender,
      birthDate,
      birthTime,
      province,
      city
    } = body;

    // 这里添加您的业务逻辑
    const result = {
      message: "数据接收成功",
      data: {
        name,
        gender,
        birthDate,
        birthTime,
        province,
        city,
        // 添加其他处理结果...
      }
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        // 允许跨域请求
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST"
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST"
      },
      body: JSON.stringify({
        message: "Internal server error",
        error: error.message
      })
    };
  }
}; 