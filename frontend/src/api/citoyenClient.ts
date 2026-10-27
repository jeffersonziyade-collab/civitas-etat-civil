import axios from 'axios';

const citoyenClient = axios.create({ baseURL: '/api' });

citoyenClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('citoyen_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default citoyenClient;
