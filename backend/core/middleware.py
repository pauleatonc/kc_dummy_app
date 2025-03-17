from django.conf import settings
from django.http import JsonResponse
from jose import jwt
from jose.exceptions import JWTError, ExpiredSignatureError
import requests
from functools import lru_cache
import json
from .keycloak import KeycloakService
import logging

logger = logging.getLogger(__name__)

class KeycloakMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.keycloak_service = KeycloakService()

    @lru_cache(maxsize=1)
    def _load_public_key(self):
        try:
            well_known_url = f"{settings.KEYCLOAK_URL}/realms/{settings.KEYCLOAK_REALM}/.well-known/openid-configuration"
            logger.debug(f"Fetching well-known config from: {well_known_url}")
            response = requests.get(well_known_url, verify=False)
            well_known = response.json()
            jwks_uri = well_known['jwks_uri']
            jwks_response = requests.get(jwks_uri, verify=False)
            self.jwks = jwks_response.json()
            return self.jwks['keys'][0]
        except Exception as e:
            logger.error(f"Error loading public key: {e}")
            return None

    def _get_token_from_header(self, request):
        auth_header = request.headers.get('Authorization', '')
        logger.debug(f"Authorization header: {auth_header}")
        if not auth_header.startswith('Bearer '):
            return None
        return auth_header.split(' ')[1]

    def _validate_token(self, token):
        """
        Valida el token usando tanto la verificación local como la introspección
        """
        try:
            # Primero validamos la firma y claims básicos
            public_key = self._load_public_key()
            if not public_key:
                raise Exception("No public key available")

            logger.debug("Validating token signature and claims")
            options = {
                'verify_signature': True,
                'verify_aud': False,  # Temporalmente deshabilitamos la verificación de audience
                'verify_exp': True
            }

            decoded_token = jwt.decode(
                token,
                public_key,
                algorithms=['RS256'],
                options=options
            )

            logger.debug(f"Token decoded successfully: {json.dumps(decoded_token, indent=2)}")

            # Luego hacemos la introspección para validación adicional
            token_info = self.keycloak_service.introspect_token(token)
            if not token_info.get('active', False):
                raise Exception("Token is not active")

            return decoded_token

        except ExpiredSignatureError:
            logger.error("Token has expired")
            raise
        except JWTError as e:
            logger.error(f"Invalid token: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error validating token: {str(e)}")
            raise

    def __call__(self, request):
        # Lista de rutas públicas que no requieren autenticación
        public_paths = ['/api/public/', '/admin/', '/api/auth/token/']
        
        logger.debug(f"Processing request to: {request.path}")
        logger.debug(f"Request headers: {dict(request.headers)}")
        
        # Si es una ruta pública, permitimos el acceso sin validación
        if any(request.path.startswith(path) for path in public_paths):
            logger.debug(f"Path {request.path} is public, skipping authentication")
            return self.get_response(request)

        # Para rutas protegidas, validamos el token
        token = self._get_token_from_header(request)
        if not token:
            logger.warning("No token provided in request")
            return JsonResponse(
                {'error': 'Authentication credentials were not provided'}, 
                status=401
            )

        try:
            decoded_token = self._validate_token(token)

            # Obtener información detallada del usuario
            user_info = self.keycloak_service.get_user_info(token)
            logger.debug(f"User info retrieved: {json.dumps(user_info, indent=2)}")

            # Agregar información del usuario al request
            request.user_info = user_info
            request.user_roles = decoded_token.get('realm_access', {}).get('roles', [])
            
            logger.debug(f"User roles: {request.user_roles}")
            
            response = self.get_response(request)
            return response

        except ExpiredSignatureError:
            logger.error("Token expired")
            return JsonResponse({'error': 'Token has expired'}, status=401)
        except JWTError as e:
            logger.error(f"JWT validation error: {str(e)}")
            return JsonResponse({'error': 'Invalid token'}, status=401)
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}", exc_info=True)
            return JsonResponse({'error': str(e)}, status=401) 