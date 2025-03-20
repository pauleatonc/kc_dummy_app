from rest_framework import serializers
from .models import Pesticide

class PesticideSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pesticide
        fields = '__all__' 