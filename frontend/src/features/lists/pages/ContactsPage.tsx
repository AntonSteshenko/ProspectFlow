import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowLeft, Settings } from 'lucide-react';
import { listsApi } from '@/api/lists';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';

export function ContactsPage() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchField, setSearchField] = useState<string>('');

  // Get list details
  const { data: list } = useQuery({
    queryKey: ['list', listId],
    queryFn: () => listsApi.getList(listId!),
    enabled: !!listId,
  });

  // Get contacts with search, pagination, and ordering
  const { data: contactsResponse, isLoading } = useQuery({
    queryKey: ['contacts', listId, debouncedSearch, currentPage, sortField, sortDirection, searchField],
    queryFn: () => {
      const ordering = sortField
        ? (sortDirection === 'desc' ? `-${sortField}` : sortField)
        : undefined;
      return listsApi.getContacts(
        listId!,
        debouncedSearch || undefined,
        currentPage,
        ordering,
        searchField || undefined
      );
    },
    enabled: !!listId,
  });

  // Extract contacts array from paginated response
  const contacts = Array.isArray(contactsResponse) ? contactsResponse : (contactsResponse?.results || []);

  // Get available fields for sorting dropdown - only "Always show" fields
  const availableFields = useMemo(() => {
    if (list?.metadata?.display_settings) {
      return Object.keys(list.metadata.display_settings).filter(
        (key) => list.metadata.display_settings[key] === 'show'
      );
    }
    if (contacts.length > 0) {
      return Object.keys(contacts[0].data || {}).filter(key => !/^\d{4}$/.test(key));
    }
    return [];
  }, [list, contacts]);

  // Debounce search and reset page
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page on search
    const timeout = setTimeout(() => {
      setDebouncedSearch(value);
    }, 500);
    return () => clearTimeout(timeout);
  };

  const handleSearchFieldChange = (field: string) => {
    setSearchField(field);
    setCurrentPage(1); // Reset to first page
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <Button
              onClick={() => navigate('/dashboard')}
              variant="secondary"
              size="sm"
              className="mb-4 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span>Back to Dashboard</span>
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
            <p className="text-gray-600 mt-2">
              List: <span className="font-semibold">{list?.name}</span>
            </p>
          </div>
          <Button
            onClick={() => navigate(`/lists/${listId}/settings`)}
            variant="secondary"
          >
            <Settings className="w-4 h-4 mr-2" />
          </Button>
        </div>
      </div>

      {/* Search Controls */}
      <div className="mb-6">
        <div className="flex gap-3 items-center">
          {/* Search Field Selector */}
          {availableFields.length > 0 && (
            <select
              value={searchField}
              onChange={(e) => handleSearchFieldChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[200px]"
            >
              <option value="">Select field to search...</option>
              {availableFields.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>
          )}

          {/* Search Input - disabled if no field selected */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              disabled={!searchField}
              placeholder={
                searchField
                  ? `Search in ${searchField}...`
                  : "Select a field first..."
              }
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Sort Controls */}
      {availableFields.length > 0 && (
        <div className="mb-6 flex gap-3 items-center">
          <span className="text-sm font-medium text-gray-700">Sort by:</span>

          {/* Field Selector */}
          <select
            value={sortField}
            onChange={(e) => {
              setSortField(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">Default (newest first)</option>
            {availableFields.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>

          {/* Order Selector - only show when field selected */}
          {sortField && (
            <select
              value={sortDirection}
              onChange={(e) => {
                setSortDirection(e.target.value as 'asc' | 'desc');
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="asc">A → Z</option>
              <option value="desc">Z → A</option>
            </select>
          )}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Spinner />
        </div>
      )}

      {/* No contacts */}
      {!isLoading && contacts && contacts.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-gray-500 mb-4">
            {searchQuery ? 'No contacts found matching your search' : 'No contacts in this list yet'}
          </p>
          {!searchQuery && (
            <Button onClick={() => navigate(`/lists/${listId}/upload`)}>
              Upload Contacts
            </Button>
          )}
        </Card>
      )}

      {/* Contacts grid */}
      {!isLoading && contacts && contacts.length > 0 && (
        <>
          {/* Pagination controls */}
          {contactsResponse && (
            <div className="flex justify-center items-center gap-4 m-8">
              <Button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={!contactsResponse.previous}
                variant="secondary"
                size="sm"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage}
                {contactsResponse.count && (
                  <> of {Math.ceil(contactsResponse.count / 50)}</>
                )}
              </span>
              <Button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={!contactsResponse.next}
                variant="secondary"
                size="sm"
              >
                Next
              </Button>
            </div>
          )}

          <div className="space-y-4">
            {contacts.map((contact: any) => {
              const displaySettings = list?.metadata?.display_settings || {};
              const titleFieldKey = list?.metadata?.title_field || Object.keys(contact.data || {})[0];

              // Get all fields in the order they appear in settings (or data)
              const orderedKeys = Object.keys(displaySettings).length > 0
                ? Object.keys(displaySettings)
                : Object.keys(contact.data || {});

              // Filter fields to display (excluding title field)
              const fieldsToDisplay = orderedKeys
                .filter((key) => key !== titleFieldKey) // Exclude title field from body
                .map((key) => [key, contact.data?.[key]] as [string, any])
                .filter(([key, value]) => {
                  // Skip numeric year fields (2010, 2011, etc.)
                  if (/^\d{4}$/.test(key)) return false;

                  // Check display settings
                  const setting = displaySettings[key];

                  if (setting === 'hide') return false;

                  if (setting === 'show') return true;

                  // Default or 'show_if_not_null': skip empty values
                  if (value === 0 || value === '0' || !value || value === '') return false;

                  return true;
                });

              // Split fields into two columns
              const midPoint = Math.ceil(fieldsToDisplay.length / 2);
              const leftFields = fieldsToDisplay.slice(0, midPoint);
              const rightFields = fieldsToDisplay.slice(midPoint);

              return (
                <Card key={contact.id} className="hover:shadow-md transition-shadow">
                  {/* Title at the top */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {String(contact.data?.[titleFieldKey] || 'Contact')}
                  </h3>

                  {/* Two columns for other fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left column */}
                    <div className="space-y-2 text-sm">
                      {leftFields.map(([key, value]) => (
                        <div key={key} className="flex items-center">
                          <span className="text-gray-500 min-w-[140px]">{key}:</span>
                          <span className="text-gray-700 font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Right column */}
                    <div className="space-y-2 text-sm">
                      {rightFields.map(([key, value]) => (
                        <div key={key} className="flex items-center">
                          <span className="text-gray-500 min-w-[140px]">{key}:</span>
                          <span className="text-gray-700">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination controls */}
          {contactsResponse && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <Button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={!contactsResponse.previous}
                variant="secondary"
                size="sm"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage}
                {contactsResponse.count && (
                  <> of {Math.ceil(contactsResponse.count / 50)}</>
                )}
              </span>
              <Button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={!contactsResponse.next}
                variant="secondary"
                size="sm"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
