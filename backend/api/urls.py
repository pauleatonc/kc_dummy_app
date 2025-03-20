from django.urls import path
from . import views

app_name = 'api'

urlpatterns = [
    path('auth/token/', views.token_exchange, name='token_exchange'),
    path('test/', views.test_view, name='test_view'),
    path('pesticides/', views.pesticides_list, name='pesticides_list'),
    path('pesticides/<int:pk>/', views.pesticide_detail, name='pesticide_detail'),
] 