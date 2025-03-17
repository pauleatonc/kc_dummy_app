from django.urls import path
from . import views

app_name = 'api'

urlpatterns = [
    path('auth/token/', views.token_exchange, name='token_exchange'),
    path('test/', views.test_view, name='test'),
] 