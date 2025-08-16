// 날짜 포맷 유틸리티 함수

export const formatDate = (dateString, language = 'ko', options = {}) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  // 기본 옵션
  const defaultOptions = {
    showWeekday: true,
    showYear: true,
    showTime: false,
    format: 'full' // full, short, numeric
  };
  
  const opts = { ...defaultOptions, ...options };
  
  if (language === 'ko') {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];
    
    // 포맷 옵션에 따른 출력
    if (opts.format === 'short') {
      // 짧은 포맷: 8/18 (월)
      return opts.showWeekday ? `${month}/${day} (${weekday})` : `${month}/${day}`;
    } else if (opts.format === 'numeric') {
      // 숫자만: 2025.08.18
      return `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
    } else {
      // 전체 포맷: 2025년 8월 18일 (월)
      let result = '';
      if (opts.showYear) result += `${year}년 `;
      result += `${month}월 ${day}일`;
      if (opts.showWeekday) result += ` (${weekday})`;
      
      // 시간 추가
      if (opts.showTime) {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const period = hours < 12 ? '오전' : '오후';
        const displayHours = hours % 12 || 12;
        result += ` ${period} ${displayHours}:${String(minutes).padStart(2, '0')}`;
      }
      
      return result;
    }
  } else {
    // 영어 포맷
    if (opts.format === 'short') {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        weekday: opts.showWeekday ? 'short' : undefined
      });
    } else if (opts.format === 'numeric') {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } else {
      const formatOptions = {
        weekday: opts.showWeekday ? 'short' : undefined,
        year: opts.showYear ? 'numeric' : undefined,
        month: 'short',
        day: 'numeric',
        hour: opts.showTime ? '2-digit' : undefined,
        minute: opts.showTime ? '2-digit' : undefined
      };
      
      // undefined 값 제거
      Object.keys(formatOptions).forEach(key => 
        formatOptions[key] === undefined && delete formatOptions[key]
      );
      
      return date.toLocaleDateString('en-US', formatOptions);
    }
  }
};

// 날짜 차이 계산 (일 단위)
export const calculateDaysDiff = (startDate, endDate, halfDay = false) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  if (halfDay && diffDays === 1) {
    return 0.5;
  }
  
  return diffDays;
};

// 오늘 날짜인지 확인
export const isToday = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate();
};

// 날짜가 과거인지 확인
export const isPastDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  return date < today;
};

// 날짜가 미래인지 확인
export const isFutureDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  return date > today;
};