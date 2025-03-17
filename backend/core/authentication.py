from rest_framework import authentication, exceptions
from django.conf import settings
from .keycloak import KeycloakService
import logging
import jwt
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

class KeycloakAuthentication(authentication.BaseAuthentication):
    def __init__(self, expected_client=None):
        # Si no se especifica un cliente, usar el del backend
        self.expected_client = expected_client

    def _normalize_issuer(self, issuer):
        """Normaliza el issuer para comparación, ignorando el hostname"""
        parsed = urlparse(issuer)
        # Retorna solo el path, que debería ser /realms/test
        return parsed.path

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            logger.debug("No Authorization header found")
            return None

        try:
            auth_type, token = auth_header.split(' ')
            if auth_type.lower() != 'bearer':
                logger.error("Invalid authorization type")
                return None

            logger.debug("Validating token...")
            token_info = jwt.decode(
                token,
                options={"verify_signature": False}
            )

            # Validar el cliente (azp)
            token_client = token_info.get('azp')
            if self.expected_client and token_client != self.expected_client:
                logger.error(f"Token not issued for expected client. Expected {self.expected_client}, got {token_client}")
                raise exceptions.AuthenticationFailed('Invalid token client')

            # Obtener información del usuario sin validar el issuer
            keycloak_service = KeycloakService()
            try:
                user_info = keycloak_service.get_userinfo(token)
            except Exception as e:
                # Si falla userinfo, intentar obtener la información del token
                logger.warning(f"Failed to get userinfo, using token info: {str(e)}")
                user_info = {
                    'sub': token_info.get('sub'),
                    'preferred_username': token_info.get('preferred_username'),
                    'email': token_info.get('email'),
                    'name': token_info.get('name')
                }

            # Crear un usuario anónimo con la información del token
            user = type('AnonymousUser', (), {
                'is_authenticated': True,
                'token_info': token_info,
                'user_info': user_info
            })

            return (user, None)

        except jwt.InvalidTokenError as e:
            logger.error(f"Invalid token: {str(e)}")
            raise exceptions.AuthenticationFailed('Invalid token format')
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            raise exceptions.AuthenticationFailed(str(e)) 