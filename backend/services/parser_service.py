"""
Parser service for processing CSV and XLSX files.

Handles full file parsing with column mapping application.
"""
import csv
import io
from typing import List, Dict
import openpyxl


class ParserService:
    """
    Service for parsing and processing uploaded files.

    Methods:
        parse_file: Parse full CSV or XLSX file
        apply_mappings: Apply column mappings to parsed data
        validate_data: Validate contact data fields
    """

    @classmethod
    def parse_file(cls, file) -> List[Dict]:
        """
        Parse entire CSV or XLSX file.

        Args:
            file: Uploaded file object

        Returns:
            list: List of dictionaries, each representing a row

        Raises:
            ValueError: If file format is unsupported or corrupted
        """
        ext = file.name.lower().split('.')[-1]

        try:
            if ext == 'csv':
                return cls._parse_csv(file)
            elif ext in ['xlsx', 'xls']:
                return cls._parse_xlsx(file)
            else:
                raise ValueError(f"Unsupported file extension: {ext}")
        except Exception as e:
            raise ValueError(f"Error parsing file: {str(e)}")

    @classmethod
    def apply_mappings(cls, data: List[Dict], mappings: Dict[str, str]) -> List[Dict]:
        """
        Apply column mappings to parsed data.

        Args:
            data: List of row dictionaries with original column names
            mappings: Dict mapping original_column -> mapped_field

        Returns:
            list: Data with renamed columns according to mappings

        Example:
            data = [{'Nome': 'John', 'Email': 'john@example.com'}]
            mappings = {'Nome': 'first_name', 'Email': 'email'}
            result = [{'first_name': 'John', 'email': 'john@example.com'}]
        """
        mapped_data = []

        for row in data:
            mapped_row = {}
            for original_col, value in row.items():
                # Use mapped field name if exists, otherwise keep original
                field_name = mappings.get(original_col, original_col)
                mapped_row[field_name] = value
            mapped_data.append(mapped_row)

        return mapped_data

    @classmethod
    def validate_data(cls, data: List[Dict]) -> tuple[List[Dict], List[Dict]]:
        """
        Validate contact data and separate valid/invalid rows.

        Args:
            data: List of contact dictionaries

        Returns:
            tuple: (valid_rows, invalid_rows)
                Each invalid row includes an 'error' field explaining the issue
        """
        valid_rows = []
        invalid_rows = []

        for i, row in enumerate(data):
            # Skip empty rows
            if not any(row.values()):
                continue

            # Basic validation (can be extended)
            is_valid = True
            errors = []

            # Validate email format if email field exists
            if 'email' in row and row['email']:
                email = row['email']
                if '@' not in str(email):
                    is_valid = False
                    errors.append(f"Invalid email format: {email}")

            if is_valid:
                valid_rows.append(row)
            else:
                invalid_row = row.copy()
                invalid_row['_row_number'] = i + 2  # +2 for header and 0-index
                invalid_row['_errors'] = errors
                invalid_rows.append(invalid_row)

        return valid_rows, invalid_rows

    @classmethod
    def _parse_csv(cls, file) -> List[Dict]:
        """Parse full CSV file."""
        file.seek(0)
        content = file.read().decode('utf-8-sig')  # Handle BOM
        file.seek(0)

        reader = csv.DictReader(io.StringIO(content))
        return list(reader)

    @classmethod
    def _parse_xlsx(cls, file) -> List[Dict]:
        """Parse full XLSX file."""
        file.seek(0)
        workbook = openpyxl.load_workbook(file, read_only=True)
        sheet = workbook.active

        # Get headers (first row)
        headers = []
        for cell in sheet[1]:
            headers.append(str(cell.value) if cell.value is not None else '')

        # Parse all data rows
        data = []
        for row in sheet.iter_rows(min_row=2, values_only=True):
            row_dict = {header: value for header, value in zip(headers, row)}
            data.append(row_dict)

        workbook.close()
        file.seek(0)

        return data
