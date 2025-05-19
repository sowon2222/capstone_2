import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

/**
 * PDF 파일을 분석하여 슬라이드 요약을 생성합니다.
 * @param {File} file - 분석할 PDF 파일
 * @returns {Promise<Object>} 요약 데이터
 */
export const generateSlideSummary = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${API_BASE_URL}/api/summarize`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.error('슬라이드 요약 생성 중 오류 발생:', error);
    throw error;
  }
};

/**
 * 저장된 슬라이드 요약을 조회합니다.
 * @param {string} summaryId - 조회할 요약 ID
 * @returns {Promise<Object>} 요약 데이터
 */
export const getSlideSummary = async (summaryId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/summaries/${summaryId}`);
    return response.data;
  } catch (error) {
    console.error('슬라이드 요약 조회 중 오류 발생:', error);
    throw error;
  }
}; 