import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

/**
 * PDF 파일을 분석하여 기출문제를 생성합니다.
 * @param {File} file - 분석할 PDF 파일
 * @param {Object} options - 문제 생성 옵션 (난이도, 문제 유형 등)
 * @returns {Promise<Object>} 생성된 문제 데이터
 */
export const generateQuestions = async (file, options = {}) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('options', JSON.stringify(options));

    const response = await axios.post(`${API_BASE_URL}/api/generate-questions`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.error('기출문제 생성 중 오류 발생:', error);
    throw error;
  }
};

/**
 * 저장된 기출문제 세트를 조회합니다.
 * @param {string} questionSetId - 조회할 문제 세트 ID
 * @returns {Promise<Object>} 문제 세트 데이터
 */
export const getQuestionSet = async (questionSetId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/question-sets/${questionSetId}`);
    return response.data;
  } catch (error) {
    console.error('기출문제 세트 조회 중 오류 발생:', error);
    throw error;
  }
};

/**
 * 기출문제 세트를 저장합니다.
 * @param {Object} questionSet - 저장할 문제 세트 데이터
 * @returns {Promise<Object>} 저장된 문제 세트 데이터
 */
export const saveQuestionSet = async (questionSet) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/question-sets`, questionSet);
    return response.data;
  } catch (error) {
    console.error('기출문제 세트 저장 중 오류 발생:', error);
    throw error;
  }
}; 