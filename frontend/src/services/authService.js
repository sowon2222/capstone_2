const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

export const authService = {
  // 일반 회원가입
  async register(userData) {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error('회원가입에 실패했습니다.');
    }

    return response.json();
  },

  // 일반 로그인
  async login(credentials) {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error('로그인에 실패했습니다.');
    }

    return response.json();
  },

  // 로그아웃
  async logout() {
    const response = await fetch(`${API_BASE_URL}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('로그아웃에 실패했습니다.');
    }
  },

  // 소셜 로그인/회원가입
  async socialAuth(provider, isRegister = false) {
    const endpoint = isRegister ? 'register' : 'login';
    const response = await fetch(`${API_BASE_URL}/auth/${provider}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`${provider} ${isRegister ? '회원가입' : '로그인'}에 실패했습니다.`);
    }

    return response.json();
  }
}; 