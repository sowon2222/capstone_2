const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

export const authService = {
  // 일반 회원가입
  async register(userData) {
    const response = await fetch(`${API_BASE_URL}/users/`, {
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

  // 일반 로그인 (JWT 토큰 발급)
  async login({ username, password }) {
    const response = await fetch(`${API_BASE_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username,
        password,
      }),
    });

    if (!response.ok) {
      throw new Error('로그인에 실패했습니다.');
    }

    return response.json();
  },

  // 로그아웃
  async logout() {
    // JWT는 클라이언트에서 토큰만 삭제하면 됨
    return true;
  },

  // 소셜 로그인/회원가입 (미구현)
  async socialAuth(provider, isRegister = false) {
    throw new Error('소셜 로그인/회원가입은 아직 지원하지 않습니다.');
  }
}; 