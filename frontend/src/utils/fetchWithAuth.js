export async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('token');
    throw new Error('로그인이 필요합니다.');
  }
  return res;
} 