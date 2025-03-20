from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from functools import wraps
import logging
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from core.authentication import KeycloakAuthentication
from core.keycloak import KeycloakService
from rest_framework import status
from django.conf import settings
import requests
import jwt
import json
from .models import Pesticide
from .serializers import PesticideSerializer

logger = logging.getLogger(__name__)

# Create your views here.

def require_authentication(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not hasattr(request, 'user_info'):
            logger.error("No user_info found in request")
            return JsonResponse({'error': 'Authentication required'}, status=401)
        return view_func(request, *args, **kwargs)
    return wrapper

def keycloak_auth_class(client_id=None):
    return type(
        'KeycloakAuthenticationWithClient',
        (KeycloakAuthentication,),
        {'expected_client': client_id}
    )

@api_view(['POST'])
@authentication_classes([keycloak_auth_class('frontintegration')])
@permission_classes([IsAuthenticated])
def token_exchange(request):
    """
    Endpoint para intercambiar el token del frontend por un token del backend
    """
    try:
        # Obtener el token del header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            logger.error("No se encontró el token en el header de Authorization")
            return Response(
                {'error': 'No se encontró el token'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        subject_token = auth_header.split(' ')[1]
        
        # Decodificar el token para obtener la información del usuario
        token_info = jwt.decode(subject_token, options={"verify_signature": False})
        username = token_info.get('preferred_username')
        
        logger.info(f"Iniciando intercambio de token para usuario: {username}")

        # Preparar la petición de intercambio de token
        token_url = f"{settings.KEYCLOAK_URL}/realms/{settings.KEYCLOAK_REALM}/protocol/openid-connect/token"
        
        exchange_data = {
            'grant_type': 'client_credentials',
            'client_id': settings.KEYCLOAK_CLIENT_ID,
            'client_secret': settings.KEYCLOAK_CLIENT_SECRET,
            'scope': 'openid'
        }

        logger.debug("Realizando intercambio de token...")
        logger.debug(f"Token URL: {token_url}")
        logger.debug(f"Exchange data: {json.dumps({k:v for k,v in exchange_data.items() if k != 'client_secret'}, indent=2)}")

        response = requests.post(
            token_url,
            data=exchange_data,
            verify=False
        )

        if response.status_code == 200:
            token_data = response.json()
            logger.info("Intercambio de token exitoso")
            logger.debug(f"Token response: {json.dumps({k:v for k,v in token_data.items() if k != 'access_token'}, indent=2)}")
            return Response({
                'token': token_data.get('access_token'),
                'expires_in': token_data.get('expires_in'),
                'token_type': token_data.get('token_type', 'Bearer')
            })
        else:
            logger.error(f"Error en intercambio de token: {response.status_code}")
            logger.error(f"Respuesta: {response.text}")
            return Response(
                {'error': 'Error en el intercambio de token'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    except Exception as e:
        logger.error(f"Error en el intercambio de token: {str(e)}")
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@authentication_classes([keycloak_auth_class('backintegration')])
@permission_classes([IsAuthenticated])
def test_view(request):
    """Vista protegida que requiere autenticación."""
    try:
        logger.debug("Accediendo a test_view")
        logger.debug(f"Usuario autenticado: {request.user.user_info.get('preferred_username')}")
        
        return Response({
            'message': 'API funcionando correctamente',
            'user_info': {
                'name': request.user.user_info.get('name', request.user.user_info.get('preferred_username')),
                'email': request.user.user_info.get('email'),
                'rut': request.user.user_info.get('rut', 'No disponible'),
                'roles': request.user.token_info.get('realm_access', {}).get('roles', [])
            }
        })
    except Exception as e:
        logger.error(f"Error en test_view: {str(e)}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@authentication_classes([keycloak_auth_class('backintegration')])
@permission_classes([IsAuthenticated])
def pesticides_list(request):
    """Vista para listar todos los productos fitosanitarios."""
    try:
        pesticides = Pesticide.objects.all()
        serializer = PesticideSerializer(pesticides, many=True)
        return Response(serializer.data)
    except Exception as e:
        logger.error(f"Error en pesticides_list: {str(e)}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@authentication_classes([keycloak_auth_class('backintegration')])
@permission_classes([IsAuthenticated])
def pesticide_detail(request, pk):
    """Vista para obtener el detalle de un producto fitosanitario."""
    try:
        pesticide = Pesticide.objects.get(pk=pk)
        serializer = PesticideSerializer(pesticide)
        return Response(serializer.data)
    except Pesticide.DoesNotExist:
        return Response({'error': 'Producto no encontrado'}, status=404)
    except Exception as e:
        logger.error(f"Error en pesticide_detail: {str(e)}")
        return Response({'error': str(e)}, status=500)
