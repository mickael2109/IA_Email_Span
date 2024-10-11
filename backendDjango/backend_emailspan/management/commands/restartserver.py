from django.core.management.base import BaseCommand
import os
import sys

class Command(BaseCommand):
    help = 'Restart the Django server'

    def handle(self, *args, **kwargs):
        os.execv(sys.executable, ['python'] + sys.argv)