export const authService = {
  register: async (username, password) => {
    const response = await fetch(`${process.env.REACT_APP_FASTAPI_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return response.json();
  },
  login: async (username, password) => {
    const response = await fetch(`${process.env.REACT_APP_FASTAPI_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return response.json();
  }
}; 