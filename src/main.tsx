import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './index.css'
import App from './App.tsx'
import { testTmdbConnection } from './services/tmdb'
import { AuthProvider } from './contexts/AuthContext'

if (import.meta.env.DEV) {
  testTmdbConnection().then((result) => {
    if (result.ok) {
      console.info(`[TMDb] conexão ok, ${result.count} itens em alta`)
    } else {
      console.error(`[TMDb] falha na conexão: ${result.error}`)
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
    <ToastContainer
      position="bottom-right"
      autoClose={4000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnHover
      theme="dark"
    />
  </StrictMode>,
)
