//문서 분석 관련 API 요청을 담당하는 파일
export const documentAnalysisService = {
  createSlideSummary: async (lectureId, slideNumber, token) => {
    const response = await fetch(
      `${process.env.REACT_APP_NODE_URL}/archive/${lectureId}/slide/${slideNumber}/summary`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.json();
  }
};
