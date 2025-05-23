//학습 통계(공부량, 공부 시간) 관련 API 요청을 담당하는 파일
export const studyService = {
  getTodayIntensity: async (token) => {
    const response = await fetch(`${process.env.REACT_APP_NODE_URL}/api/study-intensity/today`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.json();
  },
  recordStudyTime: async (duration, token) => {
    const response = await fetch(`${process.env.REACT_APP_NODE_URL}/api/study-time`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ duration })
    });
    return response.json();
  }
}; 