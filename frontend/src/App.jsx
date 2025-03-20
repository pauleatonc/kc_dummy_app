import { useState, useEffect } from 'react'
import Keycloak from 'keycloak-js'
import axios from 'axios'
import logoSag from './assets/LOGOSAG.png'
import logoAndes from './assets/AndesLogo.svg'
import ClaveUnicaButton from './components/ClaveUnicaButton'

function App() {
  const [keycloak, setKeycloak] = useState(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [message, setMessage] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [userInfo, setUserInfo] = useState(null)
  const [pesticides, setPesticides] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [activeView, setActiveView] = useState(null) // 'userInfo' o 'pesticides'

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
        setActiveView('userInfo')
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
        setUserInfo(response.data.user_info);
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

  const fetchPesticides = async () => {
    if (keycloak && authenticated) {
      setLoading(true)
      setActiveView('pesticides')
      try {
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

        // Luego hacemos la petición de pesticidas
        const response = await axios.get('http://localhost:8000/api/pesticides/', {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${backendToken}`
          },
          withCredentials: true
        });

        setPesticides(response.data);
        setMessage('Datos cargados correctamente');
      } catch (error) {
        console.error('Error al cargar pesticidas:', error);
        setMessage('Error al cargar los datos: ' + (error.response?.data?.error || error.message));
      } finally {
        setLoading(false);
      }
    }
  }

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Activo':
        return 'text-success';
      case 'Suspendido':
        return 'text-warning';
      case 'Cancelado':
        return 'text-danger';
      default:
        return '';
    }
  }

  const filteredPesticides = pesticides
    .filter(pesticide => 
      pesticide.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pesticide.registration_number.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      if (sortConfig.direction === 'asc') {
        return a[sortConfig.key] > b[sortConfig.key] ? 1 : -1;
      }
      return a[sortConfig.key] < b[sortConfig.key] ? 1 : -1;
    });

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
    <div className="d-flex flex-column">
      <div className="container-fluid bg-white py-4 flex-grow-1">
        <div className="row">
          <div className="col-12">
            <div className="d-flex align-items-center gap-3 mb-5 justify-content-center">
              <img 
                src={logoSag} 
                alt="Andes Digital Logo" 
                style={{ height: '200px' }} 
              />            
            </div>
            
            <h2 className="h4 text-muted mb-5">Test de integración con Keycloak</h2>

            {authenticated ? (
              <div className="mt-4">
                <div className="row justify-content-center">
                  <div className="col-12 col-md-8">
                    <p className="text-success mb-4">{message || 'Sesión iniciada correctamente'}</p>
                    <div className="d-flex justify-content-center">
                      <div className="d-grid gap-3" style={{ width: '300px' }}>
                        <button 
                          className={`btn ${activeView === 'userInfo' ? 'btn-success' : 'btn-primary'}`}
                          onClick={fetchProtectedData}
                        >
                          Información JWT Keycloak
                        </button>
                        <button 
                          className={`btn ${activeView === 'pesticides' ? 'btn-success' : 'btn-primary'}`}
                          onClick={fetchPesticides}
                          disabled={loading}
                        >
                          {loading ? 'Cargando...' : 'Ejemplo de llamada a API'}
                        </button>
                        <button 
                          className="btn btn-outline-primary" 
                          onClick={handleLogout}
                        >
                          Cerrar Sesión
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row justify-content-center mt-4">
                  <div className="col-12">
                    {activeView === 'userInfo' && userInfo && (
                      <div className="p-4 border rounded">
                        <div className="mb-4">
                          <h3 className="h5 mb-3">Información del usuario entregada por keycloak</h3>
                          <div className="d-flex flex-column gap-2">
                            <div>
                              <strong>Nombre:</strong> {userInfo.name}
                            </div>
                            <div>
                              <strong>Email:</strong> {userInfo.email}
                            </div>
                            <div>
                              <strong>RUT:</strong> {userInfo.rut}
                            </div>
                            <div>
                              <strong>Roles:</strong>
                              <ul className="mb-0">
                                {userInfo.roles.map((role, index) => (
                                  <li key={index}>{role}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                        <div className="border-top pt-4">
                          <h3 className="h5 mb-3 text-center">Flujo de Autenticación</h3>
                          <div className="d-flex flex-column gap-2">
                            <div className="d-flex align-items-center gap-2 justify-content-center">
                              <span className="badge bg-primary">1</span>
                              <span>Usuario inicia sesión con ClaveÚnica a través de Keycloak</span>
                            </div>
                            <div className="d-flex align-items-center gap-2 justify-content-center">
                              <span className="badge bg-primary">2</span>
                              <span>Keycloak valida las credenciales y genera un token JWT</span>
                            </div>
                            <div className="d-flex align-items-center gap-2 justify-content-center">
                              <span className="badge bg-primary">3</span>
                              <span>Frontend (cliente público) recibe el token y lo envía al backend</span>
                            </div>
                            <div className="d-flex align-items-center gap-2 justify-content-center">
                              <span className="badge bg-primary">4</span>
                              <span>Backend (cliente privado) valida el token con Keycloak</span>
                            </div>
                            <div className="d-flex align-items-center gap-2 justify-content-center">
                              <span className="badge bg-primary">5</span>
                              <span>Backend extrae la información del usuario del token</span>
                            </div>
                            <div className="d-flex align-items-center gap-2 justify-content-center">
                              <span className="badge bg-primary">6</span>
                              <span>Backend responde con los datos del usuario validados</span>
                            </div>
                          </div>
                          <div className="mt-4 p-3 bg-light rounded text-center">
                            <h4 className="h6 mb-2">¿Por qué tener clientes públicos y privados?</h4>
                            <ul className="mb-0">
                              <li><strong>Cliente Frontend (Público):</strong> Permite la autenticación desde cualquier navegador sin exponer credenciales sensibles</li>
                              <li><strong>Cliente Backend (Privado):</strong> Mantiene las credenciales seguras y valida los tokens de forma segura</li>
                              <li><strong>Seguridad:</strong> Separa las responsabilidades y reduce la superficie de ataque</li>
                              <li><strong>Escalabilidad:</strong> Permite múltiples frontends mientras mantiene un único punto de validación</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                    {activeView === 'pesticides' && pesticides.length > 0 && (
                      <div className="p-4 border rounded">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h3 className="h5 mb-0">Registro de Productos Fitosanitarios</h3>
                          <input
                            type="text"
                            className="form-control"
                            style={{ width: '600px' }}
                            placeholder="Buscar por nombre o número de registro..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                        <div className="table-responsive">
                          <table className="table table-hover">
                            <thead>
                              <tr>
                                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                                  Nombre {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('registration_number')} style={{ cursor: 'pointer' }}>
                                  N° Registro {sortConfig.key === 'registration_number' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>
                                  Categoría {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                                  Estado {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('last_review_date')} style={{ cursor: 'pointer' }}>
                                  Última Revisión {sortConfig.key === 'last_review_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredPesticides.map((pesticide) => (
                                <tr key={pesticide.id}>
                                  <td>{pesticide.name}</td>
                                  <td>{pesticide.registration_number}</td>
                                  <td>{pesticide.category}</td>
                                  <td className={getStatusColor(pesticide.status)}>{pesticide.status}</td>
                                  <td>{new Date(pesticide.last_review_date).toLocaleDateString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <ClaveUnicaButton onClick={handleLogin} />
                {message && (
                  <p className="text-danger mt-3">{message}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <footer className="bg-light py-3 mt-5">
        <div className="container text-center">
          <div className="d-flex justify-content-center align-items-center gap-2">
            <span className="text-muted">Desarrollado por</span>
            <img 
              src={logoAndes} 
              alt="Andes Digital Logo" 
              style={{ height: '30px', filter: 'brightness(0)' }} 
            />
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App 