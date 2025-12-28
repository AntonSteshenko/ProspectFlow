"""
Export Service for generating CSV/XLSX files from contacts.
"""
import csv
from io import StringIO


class ExportService:
    """Service for exporting contact data to various formats."""

    @staticmethod
    def generate_csv(queryset, fields, include_status=False, include_activities=False, include_pipeline=False):
        """
        Generate CSV from queryset with selected fields.

        Args:
            queryset: Django QuerySet of Contact objects
            fields: List of field names to include from contact.data JSONB
            include_status: Whether to include computed status field
            include_activities: Whether to include activities_count
            include_pipeline: Whether to include in_pipeline flag

        Returns:
            str: CSV content as string
        """
        output = StringIO()

        # Build header row
        header = list(fields)
        if include_status:
            header.append('status')
        if include_activities:
            header.append('activities_count')
        if include_pipeline:
            header.append('in_pipeline')

        writer = csv.DictWriter(output, fieldnames=header)
        writer.writeheader()

        # Write data rows
        for contact in queryset:
            row = {}

            # Extract selected fields from JSONB data
            for field in fields:
                row[field] = contact.data.get(field, '')

            # Add computed/extra fields
            if include_status:
                row['status'] = contact.status
            if include_activities:
                # Calculate activities count (not a model attribute, calculated from relationship)
                row['activities_count'] = contact.activities.filter(is_deleted=False).count()
            if include_pipeline:
                row['in_pipeline'] = 'Yes' if contact.in_pipeline else 'No'

            writer.writerow(row)

        return output.getvalue()
