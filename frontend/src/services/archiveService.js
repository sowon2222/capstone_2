export const archiveService = {
  uploadPDF: async (file, token) => {
    const formData = new FormData();
    formData.append('pdf', file);
    const response = await fetch(`${process.env.REACT_APP_NODE_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    return response.json();
  },
  getMaterialList: async (token) => {
    const response = await fetch(`${process.env.REACT_APP_NODE_URL}/archive/list`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.json();
  },
  getMaterialDetail: async (lectureId, token) => {
    const response = await fetch(`${process.env.REACT_APP_NODE_URL}/archive/${lectureId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.json();
  }
}; 