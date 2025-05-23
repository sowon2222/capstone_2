//문제(퀴즈) 관련 API 요청을 담당하는 파일
// 문제 생성: 슬라이드 데이터를 보내서 문제를 생성해달라고 서버에 요청
// 문제 제출: 사용자가 푼 문제의 답안을 서버에 제출
// 오답노트 조회: 사용자의 오답노트(틀린 문제 목록)를 서버에서 받아옴
export const quizService = {
  generateQuestion: async (data, token) => {
    const response = await fetch(`${process.env.REACT_APP_FASTAPI_URL}/quiz/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },
  submitAnswer: async (answerData, token) => {
    const response = await fetch(`${process.env.REACT_APP_FASTAPI_URL}/quiz/submit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(answerData)
    });
    return response.json();
  },
  getWrongNotes: async (userId, token) => {
    const response = await fetch(`${process.env.REACT_APP_FASTAPI_URL}/quiz/wrong-notes?user_id=${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.json();
  }
}; 