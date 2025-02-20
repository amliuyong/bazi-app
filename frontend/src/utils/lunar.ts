import solarLunar from 'solarlunar';

// 阳历转阴历的函数
export const getLunarDate = (dateStr: string): string => {
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

// 时辰转换函数
export const getLunarTime = (timeStr: string): string => {
  if (!timeStr) return '';

  const hour = parseInt(timeStr.split(':')[0]);

  // 定义时辰对照表
  const timeMap: { [key: number]: string } = {
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