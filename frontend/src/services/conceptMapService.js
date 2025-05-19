import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

/**
 * PDF 파일을 분석하여 개념맵을 생성합니다.
 * @param {File} file - 분석할 PDF 파일
 * @returns {Promise<Object>} 개념맵 데이터
 */
export const analyzePdf = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${API_BASE_URL}/analyze-pdf`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.error('PDF 분석 중 오류 발생:', error);
    throw error;
  }
};

/**
 * 개념맵 데이터를 저장합니다.
 * @param {Object} conceptMapData - 저장할 개념맵 데이터
 * @returns {Promise<Object>} 저장된 개념맵 데이터
 */
export const saveConceptMap = async (conceptMapData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/concept-maps`, conceptMapData);
    return response.data;
  } catch (error) {
    console.error('개념맵 저장 중 오류 발생:', error);
    throw error;
  }
};

/**
 * 저장된 개념맵을 조회합니다.
 * @param {string} conceptMapId - 조회할 개념맵 ID
 * @returns {Promise<Object>} 개념맵 데이터
 */
export const getConceptMap = async (conceptMapId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/concept-maps/${conceptMapId}`);
    return response.data;
  } catch (error) {
    console.error('개념맵 조회 중 오류 발생:', error);
    throw error;
  }
}; 