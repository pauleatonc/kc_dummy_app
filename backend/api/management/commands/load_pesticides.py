from django.core.management.base import BaseCommand
from api.models import Pesticide
from datetime import date

class Command(BaseCommand):
    help = 'Carga datos de ejemplo de productos fitosanitarios'

    def handle(self, *args, **kwargs):
        pesticides_data = [
            {
                "name": "Herbimax Plus",
                "registration_number": "SAG-2023-001",
                "active_ingredient": "Glifosato 41%",
                "manufacturer": "AgroTech Chile",
                "status": "Activo",
                "last_review_date": date(2024, 1, 15),
                "category": "Herbicida"
            },
            {
                "name": "Fungicida Pro",
                "registration_number": "SAG-2023-002",
                "active_ingredient": "Tebuconazol 25%",
                "manufacturer": "CropProtect",
                "status": "Suspendido",
                "last_review_date": date(2023, 12, 20),
                "category": "Fungicida"
            },
            {
                "name": "InsectiGuard",
                "registration_number": "SAG-2023-003",
                "active_ingredient": "Imidacloprid 20%",
                "manufacturer": "BioProtect",
                "status": "Activo",
                "last_review_date": date(2024, 2, 1),
                "category": "Insecticida"
            },
            {
                "name": "AcariKill",
                "registration_number": "SAG-2023-004",
                "active_ingredient": "Abamectina 1.8%",
                "manufacturer": "PestControl",
                "status": "Cancelado",
                "last_review_date": date(2023, 11, 30),
                "category": "Acaricida"
            },
            {
                "name": "WeedMaster",
                "registration_number": "SAG-2023-005",
                "active_ingredient": "2,4-D 48%",
                "manufacturer": "AgroTech Chile",
                "status": "Activo",
                "last_review_date": date(2024, 1, 10),
                "category": "Herbicida"
            }
        ]

        for pesticide_data in pesticides_data:
            Pesticide.objects.get_or_create(
                registration_number=pesticide_data['registration_number'],
                defaults=pesticide_data
            )

        self.stdout.write(self.style.SUCCESS('Datos de ejemplo cargados exitosamente')) 