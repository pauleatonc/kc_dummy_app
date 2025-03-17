import { useState, useEffect } from 'react'
import Keycloak from 'keycloak-js'
import axios from 'axios'
import andesLogo from './assets/AndesLogo.svg'

function App() {
  const [keycloak, setKeycloak] = useState(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [message, setMessage] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initializeKeycloak = async () => {
      try {
        const keycloakConfig = {
          url: import.meta.env.VITE_KEYCLOAK_URL,
          realm: import.meta.env.VITE_KEYCLOAK_REALM,
          clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID
        }

        console.log('Keycloak config:', keycloakConfig) // Para debug

        const keycloakClient = new Keycloak(keycloakConfig)

        // Configuración mínima sin SSO ni iframe
        await keycloakClient.init({
          onLoad: null,
          pkceMethod: 'S256',
          checkLoginIframe: false,
          redirectUri: window.location.origin + window.location.pathname
        })

        // Verificar si hay un token válido
        const isAuthenticated = keycloakClient.authenticated || false

        // Configurar interceptor de Axios para tokens
        axios.interceptors.request.use(
          (config) => {
            if (keycloakClient.authenticated && keycloakClient.token) {
              config.headers.Authorization = `Bearer ${keycloakClient.token}`
            }
            return config
          },
          (error) => Promise.reject(error)
        )

        setKeycloak(keycloakClient)
        setAuthenticated(isAuthenticated)
        setMessage(isAuthenticated ? 'Sesión iniciada correctamente' : '')
        setIsInitialized(true)
      } catch (error) {
        console.error('Keycloak init error:', error)
        setMessage('Error al inicializar la autenticación')
        setIsInitialized(true)
      }
    }

    initializeKeycloak()
  }, [])

  const handleLogin = () => {
    if (keycloak) {
      try {
        keycloak.login({
          redirectUri: window.location.origin + window.location.pathname,
          scope: 'openid profile email'
        }).catch(error => {
          console.error('Login error:', error)
          setMessage('Error al iniciar sesión')
        })
      } catch (error) {
        console.error('Login error:', error)
        setMessage('Error al iniciar sesión')
      }
    }
  }

  const handleLogout = () => {
    if (keycloak) {
      try {
        keycloak.logout({
          redirectUri: window.location.origin + window.location.pathname
        }).catch(error => {
          console.error('Logout error:', error)
          setMessage('Error al cerrar sesión')
        })
      } catch (error) {
        console.error('Logout error:', error)
        setMessage('Error al cerrar sesión')
      }
    }
  }

  const fetchProtectedData = async () => {
    if (keycloak && authenticated) {
      try {
        console.log('Frontend Token:', keycloak.token);
        
        // Primero intercambiamos el token
        const authResponse = await axios.post('http://localhost:8000/api/auth/token/', null, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keycloak.token}`
          },
          withCredentials: true
        });

        const backendToken = authResponse.data.token;
        console.log('Backend Token:', backendToken);

        // Luego hacemos la petición protegida con el token del backend
        const response = await axios.get('http://localhost:8000/api/test/', {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${backendToken}`
          },
          withCredentials: true
        });

        console.log('Response:', response.data);
        setMessage(response.data.message);
      } catch (error) {
        console.error('API call error:', error);
        console.error('Error response:', error.response?.data);
        if (error.response?.status === 401) {
          keycloak.login();
        } else {
          setMessage('Error al obtener datos del servidor: ' + (error.response?.data?.error || error.message));
        }
      }
    }
  }

  if (!isInitialized) {
    return (
      <div className="vh-100 d-flex justify-content-center align-items-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-vh-100 bg-light">
      <div className="container-fluid bg-white py-4">
        <div className="row">
          <div className="col-12">
            <div className="d-flex align-items-center gap-3 mb-4">
              <img 
                src={andesLogo} 
                alt="Andes Digital Logo" 
                style={{ height: '40px', filter: 'brightness(0)' }} 
              />            
            </div>
            
            <h2 className="h4 text-muted mb-5">Test de integración con Keycloak</h2>

            {authenticated ? (
              <div className="mt-4">
                <p className="text-success mb-4">{message || 'Sesión iniciada correctamente'}</p>
                <div className="d-grid gap-3" style={{ maxWidth: '400px' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={fetchProtectedData}
                  >
                    Probar API
                  </button>
                  <button 
                    className="btn btn-outline-primary" 
                    onClick={handleLogout}
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <button 
                  className="btn btn-primary d-inline-flex align-items-center gap-3 px-4 py-3"
                  onClick={handleLogin}
                >
                  <div className="bg-white rounded-circle p-2 text-primary">
                    👤
                  </div>
                  <div className="d-flex flex-column align-items-start">
                    <small className="opacity-75">Iniciar sesión con</small>
                    <span className="fw-bold">Keycloak</span>
                  </div>
                </button>
                {message && (
                  <p className="text-danger mt-3">{message}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App 