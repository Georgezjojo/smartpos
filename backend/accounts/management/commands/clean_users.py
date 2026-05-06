from django.core.management.base import BaseCommand
from accounts.models import User
from businesses.models import Business

class Command(BaseCommand):
    help = 'Deletes all non-superuser accounts and their businesses (keeps admin)'

    def handle(self, *args, **options):
        superusers = User.objects.filter(is_superuser=True)
        User.objects.exclude(is_superuser=True).delete()
        Business.objects.exclude(owner__in=superusers).delete()
        self.stdout.write(self.style.SUCCESS('Cleaned non-superuser data'))