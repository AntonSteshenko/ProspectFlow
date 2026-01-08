"""
Management command to clean corrupted Contact data.

Usage:
    python manage.py clean_corrupted_contacts
"""
from django.core.management.base import BaseCommand
from django.db import connection
from apps.lists.models import Contact


class Command(BaseCommand):
    help = 'Clean contacts with corrupted data (where data is array instead of object)'

    def handle(self, *args, **options):
        self.stdout.write('Checking for corrupted contacts...')

        # Use raw SQL to find contacts where data is an array
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, data
                FROM contacts
                WHERE jsonb_typeof(data) = 'array'
                LIMIT 10
            """)
            corrupted = cursor.fetchall()

            if not corrupted:
                self.stdout.write(self.style.SUCCESS('No corrupted contacts found!'))
                return

            self.stdout.write(
                self.style.WARNING(f'Found {len(corrupted)} corrupted contacts (showing first 10)')
            )

            for contact_id, data in corrupted:
                self.stdout.write(f'  - Contact {contact_id}: {data}')

            # Ask for confirmation
            confirm = input('\nDo you want to DELETE these corrupted contacts? (yes/no): ')

            if confirm.lower() == 'yes':
                cursor.execute("""
                    DELETE FROM contacts
                    WHERE jsonb_typeof(data) = 'array'
                """)
                deleted_count = cursor.rowcount
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully deleted {deleted_count} corrupted contacts')
                )
            else:
                self.stdout.write(self.style.WARNING('Operation cancelled'))
