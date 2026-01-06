import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { listsApi } from '@/api/lists';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { AddressTemplateBuilder } from '../components/AddressTemplateBuilder';

type DisplayOption = 'show' | 'hide' | 'show_if_not_null';

export function ListSettingsPage() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get list details
  const { data: list, isLoading } = useQuery({
    queryKey: ['list', listId],
    queryFn: () => listsApi.getList(listId!),
    enabled: !!listId,
  });

  // Get all contacts to extract available columns
  const { data: contactsResponse } = useQuery({
    queryKey: ['contacts', listId],
    queryFn: () => listsApi.getContacts(listId!),
    enabled: !!listId,
  });

  const contacts = Array.isArray(contactsResponse) ? contactsResponse : (contactsResponse?.results || []);

  // Get all unique column names
  const allColumns: string[] = Array.from(
    new Set<string>(
      contacts.flatMap((contact: any) => Object.keys(contact.data || {}))
    )
  ).filter((key) => !/^\d{4}$/.test(key)); // Skip year fields

  // Local state for display settings
  const [displaySettings, setDisplaySettings] = useState<Record<string, DisplayOption>>(
    list?.metadata?.display_settings || {}
  );

  // Local state for title field
  const [titleField, setTitleField] = useState<string>(
    list?.metadata?.title_field || (allColumns[0] || '')
  );

  // Local state for geocoding template
  const [geocodingTemplate, setGeocodingTemplate] = useState<{
    fields: string[];
    separator: string;
  }>({
    fields: [],
    separator: ', ',
  });

  // Initialize geocoding template when list loads
  useEffect(() => {
    if (list?.metadata?.geocoding_template) {
      setGeocodingTemplate(list.metadata.geocoding_template);
    }
  }, [list]);

  // Initialize settings when list loads
  if (list && Object.keys(displaySettings).length === 0 && allColumns.length > 0) {
    const initialSettings: Record<string, DisplayOption> = {};
    allColumns.forEach((col) => {
      initialSettings[col] = 'show_if_not_null'; // Default: show if not null
    });
    setDisplaySettings(initialSettings);
  }

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const metadata = {
        ...list?.metadata,
        display_settings: displaySettings,
        title_field: titleField,
        geocoding_template: geocodingTemplate,
      };
      return listsApi.updateList(listId!, { metadata });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', listId] });
      navigate(`/lists/${listId}/contacts`);
    },
  });

  const handleDisplayChange = (column: string, value: DisplayOption) => {
    setDisplaySettings((prev) => ({
      ...prev,
      [column]: value,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          onClick={() => navigate(`/lists/${listId}/contacts`)}
          variant="secondary"
          size="sm"
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span>Back to Contacts</span>
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">List Settings</h1>
        <p className="text-gray-600 mt-2">
          Configure which fields to display for: <span className="font-semibold">{list?.name}</span>
        </p>
      </div>

      <Card>
        <div className="p-6">
          {/* Title Field Selection */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Title Field</h2>
            <p className="text-sm text-gray-600 mb-4">Select which field to use as the card title</p>

            {allColumns.length === 0 ? (
              <p className="text-gray-500 text-sm">No columns available. Upload contacts first.</p>
            ) : (
              <select
                value={titleField}
                onChange={(e) => setTitleField(e.target.value)}
                className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {allColumns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Column Display Settings */}
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Column Display Settings</h2>

          {allColumns.length === 0 ? (
            <p className="text-gray-500 text-sm">No columns available. Upload contacts first.</p>
          ) : (
            <div className="space-y-3">
              {allColumns.map((column) => (
                <div
                  key={column}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-sm font-medium text-gray-700">{column}</span>
                    {titleField === column && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                        Title
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDisplayChange(column, 'show')}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${displaySettings[column] === 'show'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                        }`}
                    >
                      Always Show
                    </button>
                    <button
                      onClick={() => handleDisplayChange(column, 'show_if_not_null')}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${displaySettings[column] === 'show_if_not_null'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                        }`}
                    >
                      Show if not empty
                    </button>
                    <button
                      onClick={() => handleDisplayChange(column, 'hide')}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${displaySettings[column] === 'hide'
                        ? 'bg-red-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                        }`}
                    >
                      Hide
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Geocoding Configuration */}
      <Card className="mt-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Geocoding Configuration</h2>
          <p className="text-sm text-gray-600 mb-4">
            Configure how addresses are composed from contact fields for geocoding.
          </p>

          {allColumns.length === 0 ? (
            <p className="text-gray-500 text-sm">No columns available. Upload contacts first.</p>
          ) : (
            <AddressTemplateBuilder
              availableFields={allColumns}
              selectedFields={geocodingTemplate.fields}
              separator={geocodingTemplate.separator}
              onChange={(fields, separator) => {
                setGeocodingTemplate({ fields, separator });
              }}
            />
          )}
        </div>
      </Card>

      {/* Actions */}
      <Card className="mt-6">
        <div className="p-6">
          <div className="flex gap-3">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || allColumns.length === 0}
              className="flex items-center gap-2"
            >
              {saveMutation.isPending ? (
                <>
                  <Spinner />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  <span>Save Settings</span>
                </>
              )}
            </Button>
            <Button
              onClick={() => navigate(`/lists/${listId}/contacts`)}
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
