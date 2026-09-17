import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
  timeout: 30000
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Tratamento unificado de erros de rede / conexão
    if (!error.response) {
      console.warn('Servidor Spring Boot offline ou inatingível. Verifique se o backend está em execução na porta 8080.')
    }
    return Promise.reject(error)
  }
)

export default api
