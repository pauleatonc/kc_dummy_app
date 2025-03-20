from django.db import models

# Create your models here.

class Pesticide(models.Model):
    STATUS_CHOICES = [
        ('Activo', 'Activo'),
        ('Suspendido', 'Suspendido'),
        ('Cancelado', 'Cancelado'),
    ]

    CATEGORY_CHOICES = [
        ('Herbicida', 'Herbicida'),
        ('Fungicida', 'Fungicida'),
        ('Insecticida', 'Insecticida'),
        ('Acaricida', 'Acaricida'),
        ('Otro', 'Otro'),
    ]

    name = models.CharField(max_length=200)
    registration_number = models.CharField(max_length=20, unique=True)
    active_ingredient = models.CharField(max_length=200)
    manufacturer = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    last_review_date = models.DateField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.registration_number})"
