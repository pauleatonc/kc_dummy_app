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
    const keycloakConfig = {
      url: import.meta.env.VITE_KEYCLOAK_URL,
      realm: import.meta.env.VITE_KEYCLOAK_REALM,
      clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID
    }

    const keycloakClient = new Keycloak(keycloakConfig)

    keycloakClient.init({
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
      checkLoginIframe: false,
      enableLogging: true,
      pkceMethod: 'S256'
    }).then(auth => {
      setKeycloak(keycloakClient)
      setAuthenticated(auth)
      setIsInitialized(true)
    }).catch(error => {
      console.error('Keycloak init error:', error)
      setIsInitialized(true)
    })
  }, [])

  const handleLogin = () => {
    if (keycloak) {
      keycloak.login()
    }
  }

  const handleLogout = () => {
    if (keycloak) {
      keycloak.logout()
    }
  }

  const fetchProtectedData = async () => {
    if (keycloak && authenticated) {
      try {
        const response = await axios.get('http://localhost:8000/api/test/', {
          headers: {
            Authorization: `Bearer ${keycloak.token}`
          }
        })
        setMessage(response.data.message)
      } catch (error) {
        console.error('API call error:', error)
        setMessage('Error fetching data')
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
                <p className="text-success mb-4">Sesión iniciada correctamente</p>
                <div className="d-grid gap-3" style={{ maxWidth: '400px' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={fetchProtectedData}
                  >
                    Probar API
                  </button>
                  {message && (
                    <div className="alert alert-info">
                      {message}
                    </div>
                  )}
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App 