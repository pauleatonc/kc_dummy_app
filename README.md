# Aplicación de Demostración con Keycloak

Esta aplicación demuestra la integración de Keycloak con una arquitectura frontend/backend, implementando un flujo de autenticación seguro con intercambio de tokens.

## Estructura de la Aplicación

### Frontend (React + Vite)
- **Tecnologías**: React 18, Vite, Keycloak-js
- **Ubicación**: `/frontend`
- **Componentes principales**:
  - `App.jsx`: Componente principal que maneja la autenticación y las peticiones al backend
  - `assets/`: Recursos estáticos como imágenes y estilos

### Backend (Django + DRF)
- **Tecnologías**: Django 4.2, Django Rest Framework
- **Ubicación**: `/backend`
- **Componentes principales**:
  - `core/`: Módulo con la lógica de autenticación Keycloak
    - `authentication.py`: Implementación de autenticación personalizada
    - `keycloak.py`: Servicio para interactuar con Keycloak
  - `api/`: Endpoints de la API
    - `views.py`: Vistas para intercambio de tokens y pruebas
  - `kcdummy/`: Configuración principal del proyecto Django

## Requisitos

- Docker y Docker Compose
- Node.js 18 o superior
- Python 3.11 o superior
- Keycloak 23.0.0 o superior

## Despliegue

1. **Clonar el repositorio**:
   ```bash
   git clone <repositorio>
   cd kc_dummy
   ```

2. **Variables de entorno**:
   
   Revisar env.examples

3. **Iniciar servicios**:
   ```bash
   docker compose up -d
   ```

4. **Acceder a la aplicación**:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:8000
   - Keycloak: http://localhost:8080

## Configuración de Keycloak

1. Crear un nuevo realm en Keycloak
2. Crear dos clientes en el realm:
   - Frontend (cliente público):
     - Client ID:
     - Access Type: public
     - Valid Redirect URIs: http://localhost:5173/*
     - Web Origins: http://localhost:5173
   - Backend (cliente privado):
     - Client ID:
     - Access Type: confidential
     - Service Accounts: ON
     - Client Protocol: openid-connect

### Configuración de Archivos de Entorno

El proyecto requiere dos archivos de entorno diferentes:

1. `.env` (front y back) - Para despliegue de desarrollo (docker-compose.yml). Utilizar el .ev.example

2. `.env.local` (front y back)  - Para despliegue local (docker-compose.local.yml). Utilizar el .ev.example

Asegúrate de tener ambos archivos configurados correctamente según el tipo de despliegue que estés utilizando.

## Flujo de Autenticación

1. **Inicio de Sesión**:
   - Usuario accede a la aplicación frontend (http://localhost:5173)
   - Click en "Iniciar Sesión" redirige a Keycloak
   - Usuario ingresa credenciales en Keycloak
   - Keycloak redirige de vuelta al frontend con un token

2. **Intercambio de Token**:
   - Frontend recibe token de Keycloak (`frontintegration`)
   - Frontend hace petición a `/api/auth/token/` con el token
   - Backend valida el token del frontend
   - Backend obtiene un nuevo token usando credenciales de servicio
   - Backend devuelve el nuevo token al frontend

3. **Uso de la API**:
   - Frontend almacena el token del backend
   - Frontend usa este token para todas las peticiones a la API
   - Backend valida que el token sea emitido por `backintegration`
   - Las peticiones son procesadas si el token es válido

## Consideraciones de Seguridad

1. **Tokens**:
   - Los tokens del frontend solo son válidos para autenticación inicial
   - Los tokens del backend son necesarios para acceder a la API
   - Cada cliente tiene su propio conjunto de roles y permisos

2. **SSL/TLS**:
   - En producción, habilitar SSL/TLS
   - Configurar `KEYCLOAK_VERIFY_SSL=True`
   - Usar dominios HTTPS para todas las URLs

3. **Secretos**:
   - Mantener el Client Secret seguro
   - Usar variables de entorno para configuración sensible
   - No compartir tokens entre diferentes partes de la aplicación

## Troubleshooting

1. **Errores comunes**:
   - `invalid_token`: Verificar la configuración de clientes en Keycloak
   - `unauthorized_client`: Revisar roles y permisos del Service Account
   - `invalid_grant`: Verificar el Client Secret y el flujo de autenticación

2. **Logs**:
   - Frontend: Consola del navegador
   - Backend: `docker compose logs -f backend`
   - Keycloak: `docker compose logs -f keycloak`