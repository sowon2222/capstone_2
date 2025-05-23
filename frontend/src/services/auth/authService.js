const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

export const authService = {
  // 일반 회원가입
  async register(userData) {
    // 임시 테스트용 코드
    console.log('회원가입 시도:', userData);
    return {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      token: 'dummy_token_' + Date.now()
    };

    // 실제 API 연동 시 사용할 코드
    /*
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
    */
  },

  // 일반 로그인
  async login(credentials) {
    // 임시 테스트용 코드
    console.log('로그인 시도:', credentials);
    return {
      id: credentials.id,
      name: '테스트 사용자',
      email: 'test@example.com',
      token: 'dummy_token_' + Date.now()
    };

    // 실제 API 연동 시 사용할 코드
    /*
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
    */
  },

  // 로그아웃
  async logout() {
    // 임시 테스트용 코드
    console.log('로그아웃 시도');
    return true;

    // 실제 API 연동 시 사용할 코드
    /*
    const response = await fetch(`${API_BASE_URL}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('로그아웃에 실패했습니다.');
    }
    */
  }
}; 