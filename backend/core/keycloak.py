from django.conf import settings
import requests
from datetime import datetime, timedelta
import json
import logging
import os
from urllib.parse import urlparse, urlunparse
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
import jwt

logger = logging.getLogger(__name__)

class KeycloakService:
    def __init__(self):
        # Debug de variables de entorno
        logger.debug("Environment variables:")
        logger.debug(f"KEYCLOAK_URL from env: {os.getenv('KEYCLOAK_URL')}")
        logger.debug(f"KEYCLOAK_URL from settings: {settings.KEYCLOAK_URL}")
        
        # Transformar la URL del servidor antes de asignarla
        self.server_url = self._transform_url(settings.KEYCLOAK_URL)
        self.realm = settings.KEYCLOAK_REALM
        self.client_id = settings.KEYCLOAK_CLIENT_ID
        self.client_secret = settings.KEYCLOAK_CLIENT_SECRET
        self.token_info = None
        self.token_expires_at = None
        self.verify = settings.KEYCLOAK_VERIFY_SSL
        
        # Parse the server URL to ensure it's valid
        parsed_url = urlparse(self.server_url)
        logger.debug(f"Parsed URL components: {parsed_url}")
        
        if not parsed_url.netloc:
            raise ValueError(f"Invalid server URL: {self.server_url}")
        
        logger.debug("KeycloakService configuration:")
        logger.debug(f"Original server_url: {settings.KEYCLOAK_URL}")
        logger.debug(f"Transformed server_url: {self.server_url}")
        logger.debug(f"realm: {self.realm}")
        logger.debug(f"client_id: {self.client_id}")
        logger.debug(f"verify: {self.verify}")

    def _get_session(self):
        """Crea una sesión HTTP con retry y timeout"""
        session = requests.Session()
        session.verify = self.verify

        retry = Retry(
            total=3,
            backoff_factor=0.1,
            status_forcelist=[500, 502, 503, 504]
        )
        adapter = HTTPAdapter(max_retries=retry)
        session.mount('http://', adapter)
        session.mount('https://', adapter)
        
        return session

    def _transform_url(self, url):
        """
        Transforma una URL de localhost a keycloak para uso interno
        """
        if not url:
            return url
            
        parsed = urlparse(url)
        logger.debug(f"Transforming URL: {url}")
        logger.debug(f"Parsed components: scheme={parsed.scheme}, netloc={parsed.netloc}, path={parsed.path}")
        
        if parsed.netloc == 'localhost:8080':
            # Construir nueva URL con el hostname correcto
            transformed = urlunparse((
                parsed.scheme,
                'keycloak:8080',
                parsed.path,
                parsed.params,
                parsed.query,
                parsed.fragment
            ))
            logger.debug(f"Transformed URL from {url} to {transformed}")
            return transformed
        return url

    def _get_well_known_config(self):
        """
        Obtiene la configuración well-known y transforma las URLs
        """
        try:
            url = f"{self.server_url}/realms/{self.realm}/.well-known/openid-configuration"
            logger.debug(f"Fetching well-known config from: {url}")
            
            session = self._get_session()
            
            try:
                response = session.get(url, timeout=5)  # Añadir timeout explícito
                response.raise_for_status()
            except requests.exceptions.RequestException as e:
                logger.error(f"Failed to fetch well-known config: {str(e)}")
                logger.error(f"URL attempted: {url}")
                logger.error(f"Full error details: {repr(e)}")
                raise
            
            config = response.json()
            logger.debug(f"Original well-known config: {json.dumps(config, indent=2)}")
            
            # Transformar todas las URLs en la configuración
            transformed_config = {}
            for key, value in config.items():
                if isinstance(value, str) and 'http' in value:
                    transformed_config[key] = self._transform_url(value)
                else:
                    transformed_config[key] = value
            
            logger.debug(f"Transformed well-known config: {json.dumps(transformed_config, indent=2)}")
            return transformed_config
        except Exception as e:
            logger.error(f"Error fetching well-known config: {str(e)}")
            logger.error(f"Current server_url: {self.server_url}")
            logger.error(f"Full error details: {repr(e)}")
            raise

    def introspect_token(self, token):
        """Introspección del token para validar su estado."""
        try:
            # Obtener la configuración y usar la URL transformada
            config = self._get_well_known_config()
            url = config['introspection_endpoint']
            
            logger.debug(f"Introspecting token at URL: {url}")
            logger.debug(f"Using server_url: {self.server_url}")
            logger.debug(f"Request data: client_id={self.client_id}")
            
            session = self._get_session()
            
            try:
                response = session.post(
                    url,
                    data={
                        'token': token,
                        'client_id': self.client_id,
                        'client_secret': self.client_secret
                    },
                    timeout=5  # Añadir timeout explícito
                )
                response.raise_for_status()
            except requests.exceptions.RequestException as e:
                logger.error(f"Failed to introspect token: {str(e)}")
                logger.error(f"URL attempted: {url}")
                logger.error(f"Full error details: {repr(e)}")
                raise
            
            return response.json()
        except Exception as e:
            logger.error(f"Error introspecting token: {str(e)}")
            logger.error(f"Full error details: {repr(e)}")
            raise

    def get_user_info(self, token):
        try:
            # Obtener la configuración y usar la URL transformada
            config = self._get_well_known_config()
            url = config['userinfo_endpoint']
            
            logger.debug(f"Getting user info from: {url}")
            
            session = self._get_session()
            
            try:
                response = session.get(
                    url,
                    headers={'Authorization': f'Bearer {token}'},
                    timeout=5  # Añadir timeout explícito
                )
                response.raise_for_status()
            except requests.exceptions.RequestException as e:
                logger.error(f"Failed to get user info: {str(e)}")
                logger.error(f"URL attempted: {url}")
                logger.error(f"Full error details: {repr(e)}")
                raise
            
            return response.json()
        except Exception as e:
            logger.error(f"Error getting user info: {str(e)}")
            raise

    def get_service_account_token(self):
        try:
            # Obtener la configuración y usar la URL transformada
            config = self._get_well_known_config()
            url = config['token_endpoint']
            
            logger.debug(f"Getting service account token from: {url}")
            
            session = self._get_session()
            
            try:
                response = session.post(
                    url,
                    data={
                        'grant_type': 'client_credentials',
                        'client_id': self.client_id,
                        'client_secret': self.client_secret,
                    },
                    timeout=5  # Añadir timeout explícito
                )
                response.raise_for_status()
            except requests.exceptions.RequestException as e:
                logger.error(f"Failed to get service account token: {str(e)}")
                logger.error(f"URL attempted: {url}")
                logger.error(f"Full error details: {repr(e)}")
                raise
            
            token_data = response.json()
            logger.debug("Service account token obtained successfully")
            return token_data['access_token']
        except Exception as e:
            logger.error(f"Error getting service account token: {str(e)}")
            raise

    def get_userinfo(self, token):
        """
        Obtiene la información del usuario usando el endpoint userinfo de Keycloak
        """
        try:
            session = self._get_session()
            userinfo_url = f"{self.server_url}/realms/{self.realm}/protocol/openid-connect/userinfo"
            
            # Decodificar el token para debug
            try:
                token_data = jwt.decode(token, options={"verify_signature": False})
                logger.debug(f"Token claims for userinfo: {json.dumps(token_data, indent=2)}")
            except Exception as e:
                logger.warning(f"Could not decode token for debug: {e}")

            logger.debug(f"Requesting userinfo from: {userinfo_url}")
            response = session.get(
                userinfo_url,
                headers={'Authorization': f'Bearer {token}'},
                timeout=5
            )
            
            if response.status_code == 200:
                user_info = response.json()
                logger.debug(f"Userinfo response: {json.dumps(user_info, indent=2)}")
                return user_info
            else:
                logger.error(f"Error getting userinfo: {response.status_code}")
                logger.error(f"Response: {response.text}")
                raise Exception(f"Failed to get userinfo: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error in get_userinfo: {str(e)}")
            raise 