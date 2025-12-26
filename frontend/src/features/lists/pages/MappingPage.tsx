import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { listsApi } from '@/api/lists';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

// Standard field types that the system recognizes
const STANDARD_FIELDS = [
  { value: '', label: 'Skip this column' },
  { value: 'email', label: 'Email' },
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'full_name', label: 'Full Name' },
  { value: 'company', label: 'Company' },
  { value: 'title', label: 'Job Title' },
  { value: 'phone', label: 'Phone' },
  { value: 'website', label: 'Website' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'address', label: 'Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State/Province' },
  { value: 'country', label: 'Country' },
  { value: 'postal_code', label: 'Postal Code' },
  { value: 'custom', label: 'Custom Field' },
];

export function MappingPage() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();

  // Fetch list details and column mappings
  const { data: list } = useQuery({
    queryKey: ['list', listId],
    queryFn: () => listsApi.getList(listId!),
    enabled: !!listId,
  });

  const { data: mappings, isLoading } = useQuery({
    queryKey: ['mappings', listId],
    queryFn: () => listsApi.getMappings(listId!),
    enabled: !!listId,
  });

  // Local state for mapping selections
  const [columnMappings, setColumnMappings] = useState<
    Record<string, { type: string; customName?: string }>
  >({});

  // Extract mappings array from paginated response
  const mappingsArray = Array.isArray(mappings) ? mappings : (mappings?.results || []);

  // Save mappings mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { mappings: Record<string, { type: string; customName?: string }> }) => {
      // First save the mappings
      await listsApi.saveMappings(listId!, data);
      // Then trigger the import process
      return listsApi.processImport(listId!);
    },
    onSuccess: () => {
      navigate(`/lists/${listId}/contacts`);
    },
  });

  const handleMappingChange = (column: string, type: string) => {
    setColumnMappings((prev) => ({
      ...prev,
      [column]: { type, customName: prev[column]?.customName },
    }));
  };

  const handleCustomNameChange = (column: string, customName: string) => {
    setColumnMappings((prev) => ({
      ...prev,
      [column]: { ...prev[column], customName },
    }));
  };

  const handleSave = () => {
    saveMutation.mutate({ mappings: columnMappings });
  };

  // Initialize mappings from backend
  if (mappingsArray && mappingsArray.length > 0 && Object.keys(columnMappings).length === 0) {
    const initialMappings: Record<string, { type: string; customName?: string }> = {};
    mappingsArray.forEach((mapping: any) => {
      initialMappings[mapping.original_column] = {
        type: mapping.mapped_field || '',
        customName: mapping.custom_field_name,
      };
    });
    setColumnMappings(initialMappings);
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  const sourceColumns = mappingsArray?.map((m: any) => m.original_column) || [];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Map Columns</h1>
        <p className="text-gray-600 mt-2">
          Map your CSV columns to standard fields for list: <span className="font-semibold">{list?.name}</span>
        </p>
      </div>

      <Card>
        <div className="p-6">
          {sourceColumns.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-yellow-800 font-semibold">No columns to map</h3>
                <p className="text-yellow-700 text-sm mt-1">
                  Please upload a file first.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {sourceColumns.map((column: string) => (
                  <div key={column} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                      {/* Source column */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Source Column
                        </label>
                        <div className="bg-gray-50 px-4 py-2 rounded border border-gray-200">
                          <code className="text-sm text-gray-800">{column}</code>
                        </div>
                      </div>

                      {/* Target mapping */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Map to Field
                        </label>
                        <select
                          value={columnMappings[column]?.type || ''}
                          onChange={(e) => handleMappingChange(column, e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {STANDARD_FIELDS.map((field) => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Custom field name input */}
                    {columnMappings[column]?.type === 'custom' && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Custom Field Name
                        </label>
                        <input
                          type="text"
                          value={columnMappings[column]?.customName || ''}
                          onChange={(e) => handleCustomNameChange(column, e.target.value)}
                          placeholder="Enter custom field name"
                          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Validation info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-blue-800 font-semibold">Mapping Info</h3>
                  <p className="text-blue-700 text-sm mt-1">
                    You can skip columns you don't need. All data will be stored in a flexible JSONB format,
                    so you can always access unmapped fields later.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="flex-1"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Save & Import Contacts
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => navigate(`/lists/${listId}/upload`)}
                  variant="secondary"
                >
                  Back to Upload
                </Button>
              </div>

              {/* Error message */}
              {saveMutation.isError && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="text-red-800 font-semibold">Save failed</h3>
                    <p className="text-red-700 text-sm mt-1">
                      {saveMutation.error instanceof Error
                        ? saveMutation.error.message
                        : 'An error occurred while saving mappings'}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
