const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

export const socialAuthService = {
  // 소셜 로그인/회원가입
  async socialAuth(provider, isRegister = false) {
    // 임시 테스트용 코드
    console.log(`${provider} ${isRegister ? '회원가입' : '로그인'} 시도`);
    return {
      id: `social_${provider}_${Date.now()}`,
      name: `${provider} 사용자`,
      email: `${provider}@example.com`,
      token: `dummy_token_${provider}_${Date.now()}`
    };

    // 실제 API 연동 시 사용할 코드
    /*
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
    */
  }
}; 