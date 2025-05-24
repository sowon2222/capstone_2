const FASTAPI_URL = process.env.REACT_APP_FASTAPI_URL;

export const authService = {
  register: async (username, password, name, email) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('name', name);
    formData.append('email', email);

    const response = await fetch(`${FASTAPI_URL}/register`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || errorData.message || '회원가입 실패');
    }
    return response.json();
  },
  login: async (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${FASTAPI_URL}/login`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '로그인 실패');
    }
    return response.json();
  },
  logout: async () => {
    // 서버에 별도 요청 없이 클라이언트 토큰만 삭제
    localStorage.removeItem('token');
    return true;
  }
}; 