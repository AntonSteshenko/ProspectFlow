from django.apps import AppConfig


class ProcessingConfig(AppConfig):
    """Configuration for the processing app."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.processing'
    verbose_name = 'File Processing'
