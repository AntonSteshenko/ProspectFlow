import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ArrowLeft, Settings, MessageSquare } from 'lucide-react';
import { listsApi } from '@/api/lists';
import type { ContactStatus } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { ExportModal } from '@/features/lists/components/ExportModal';

export function ContactsPage() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Helper to parse array from URL params (e.g., "a,b,c" -> ["a","b","c"])
  const getArrayParam = (key: string): string[] => {
    const value = searchParams.get(key);
    return value ? value.split(',').filter(Boolean) : [];
  };

  // Helper function to get status badge styling
  const getStatusBadge = (status: ContactStatus) => {
    const config = {
      not_contacted: { label: 'Not Contacted', color: 'bg-gray-100 text-gray-700' },
      in_working: { label: 'In Working', color: 'bg-blue-100 text-blue-700' },
      dropped: { label: 'Dropped', color: 'bg-red-100 text-red-700' },
      converted: { label: 'Converted', color: 'bg-green-100 text-green-700' },
    };
    return config[status] || config.not_contacted;
  };
  // Initialize filters from URL params (with validation)
  const initialSearch = searchParams.get('search') || '';
  const initialSearchField = searchParams.get('searchField') || '';
  const initialSortField = searchParams.get('sortField') || '';
  const sortDir = searchParams.get('sortDirection');
  const initialSortDirection = sortDir === 'desc' ? 'desc' : 'asc';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const initialPage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const initialPipelineOnly = searchParams.get('inPipeline') === 'true';
  const statusParams = getArrayParam('status');
  const validStatuses: ContactStatus[] = ['not_contacted', 'in_working', 'dropped', 'converted'];
  const initialStatuses = statusParams.filter(s => validStatuses.includes(s as ContactStatus)) as ContactStatus[];

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [sortField, setSortField] = useState<string>(initialSortField);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSortDirection);
  const [searchField, setSearchField] = useState<string>(initialSearchField);
  const [showPipelineOnly, setShowPipelineOnly] = useState(initialPipelineOnly);
  const [selectedStatuses, setSelectedStatuses] = useState<ContactStatus[]>(initialStatuses);
  const [showExportModal, setShowExportModal] = useState(false);

  // Sync state changes to URL params
  useEffect(() => {
    const params = new URLSearchParams();

    // Add only non-default parameters to keep URL clean
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (searchField) params.set('searchField', searchField);
    if (sortField) params.set('sortField', sortField);
    if (sortField && sortDirection !== 'asc') params.set('sortDirection', sortDirection);
    if (currentPage > 1) params.set('page', currentPage.toString());
    if (showPipelineOnly) params.set('inPipeline', 'true');
    if (selectedStatuses.length > 0) params.set('status', selectedStatuses.join(','));

    // Update URL without creating new history entry
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, searchField, sortField, sortDirection, currentPage, showPipelineOnly, selectedStatuses, setSearchParams]);

  // Get list details
  const { data: list } = useQuery({
    queryKey: ['list', listId],
    queryFn: () => listsApi.getList(listId!),
    enabled: !!listId,
  });

  // Toggle pipeline mutation
  const togglePipelineMutation = useMutation({
    mutationFn: (contactId: string) => listsApi.togglePipeline(contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  // Bulk pipeline mutation
  const bulkPipelineMutation = useMutation({
    mutationFn: ({ action, search, searchField }: { action: 'add_filtered' | 'clear_all'; search?: string; searchField?: string }) =>
      listsApi.bulkPipeline(listId!, action, search, searchField),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async (params: {
      fields: string[];
      includeStatus: boolean;
      includeActivities: boolean;
      includePipeline: boolean;
    }) => {
      const blob = await listsApi.exportContacts(
        listId!,
        params.fields,
        params.includeStatus,
        params.includeActivities,
        params.includePipeline,
        {
          search: debouncedSearch || undefined,
          searchField: searchField || undefined,
          inPipeline: showPipelineOnly || undefined,
          status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
          ordering: sortField ? (sortDirection === 'desc' ? `-${sortField}` : sortField) : undefined,
        }
      );

      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts_${listId}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });

  // Get contacts with search, pagination, and ordering
  const { data: contactsResponse, isLoading } = useQuery({
    queryKey: ['contacts', listId, debouncedSearch, currentPage, sortField, sortDirection, searchField, showPipelineOnly, selectedStatuses],
    queryFn: () => {
      const ordering = sortField
        ? (sortDirection === 'desc' ? `-${sortField}` : sortField)
        : undefined;
      return listsApi.getContacts(
        listId!,
        debouncedSearch || undefined,
        currentPage,
        ordering,
        searchField || undefined,
        showPipelineOnly || undefined,
        selectedStatuses.length > 0 ? selectedStatuses : undefined
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

      {/* Row 1: Search, Sort, Pipeline Filter */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        {/* Search Field Selector */}
        {availableFields.length > 0 && (
          <select
            value={searchField}
            onChange={(e) => handleSearchFieldChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[180px]"
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
        <div className="relative flex-1 min-w-[250px]">
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

        {/* Sort Controls */}
        {availableFields.length > 0 && (
          <>
            <span className="text-sm font-medium text-gray-700">Sort:</span>
            <select
              value={sortField}
              onChange={(e) => {
                setSortField(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[180px]"
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
          </>
        )}

        {/* Pipeline Filter */}
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="checkbox"
            id="pipeline-filter"
            checked={showPipelineOnly}
            onChange={(e) => {
              setShowPipelineOnly(e.target.checked);
              setCurrentPage(1);
            }}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="pipeline-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Pipeline Only
          </label>
        </div>
      </div>

      {/* Row 2: Status Filter, Bulk Actions, Count */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {/* Status Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Status:</span>

          {/* Not Contacted */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedStatuses.includes('not_contacted')}
              onChange={(e) => {
                setSelectedStatuses(prev =>
                  e.target.checked
                    ? [...prev, 'not_contacted']
                    : prev.filter(s => s !== 'not_contacted')
                );
                setCurrentPage(1);
              }}
              className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
            />
            <span className="text-sm px-2 py-1 rounded bg-gray-100 text-gray-700">
              Not Contacted
            </span>
          </label>

          {/* In Working */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedStatuses.includes('in_working')}
              onChange={(e) => {
                setSelectedStatuses(prev =>
                  e.target.checked
                    ? [...prev, 'in_working']
                    : prev.filter(s => s !== 'in_working')
                );
                setCurrentPage(1);
              }}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm px-2 py-1 rounded bg-blue-100 text-blue-700">
              In Working
            </span>
          </label>

          {/* Dropped */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedStatuses.includes('dropped')}
              onChange={(e) => {
                setSelectedStatuses(prev =>
                  e.target.checked
                    ? [...prev, 'dropped']
                    : prev.filter(s => s !== 'dropped')
                );
                setCurrentPage(1);
              }}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <span className="text-sm px-2 py-1 rounded bg-red-100 text-red-700">
              Dropped
            </span>
          </label>

          {/* Converted */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedStatuses.includes('converted')}
              onChange={(e) => {
                setSelectedStatuses(prev =>
                  e.target.checked
                    ? [...prev, 'converted']
                    : prev.filter(s => s !== 'converted')
                );
                setCurrentPage(1);
              }}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <span className="text-sm px-2 py-1 rounded bg-green-100 text-green-700">
              Converted
            </span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              bulkPipelineMutation.mutate({
                action: 'add_filtered',
                search: debouncedSearch || undefined,
                searchField: searchField || undefined
              });
            }}
            disabled={bulkPipelineMutation.isPending}
          >
            {debouncedSearch ? 'Add Filtered to Pipeline' : 'Add All to Pipeline'}
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (window.confirm('Remove all contacts from pipeline?')) {
                bulkPipelineMutation.mutate({ action: 'clear_all' });
              }
            }}
            disabled={bulkPipelineMutation.isPending}
          >
            Clear Pipeline
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowExportModal(true)}
            disabled={!availableFields.length}
          >
            Export CSV
          </Button>
        </div>

        {/* Contact count */}
        {contactsResponse?.count !== undefined && (
          <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded ml-auto">
            {debouncedSearch || showPipelineOnly || selectedStatuses.length > 0 ? (
              <>
                <span className="font-semibold">{contactsResponse.count}</span> contacts found
              </>
            ) : (
              <>
                <span className="font-semibold">{contactsResponse.count}</span> total contacts
              </>
            )}
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          availableFields={availableFields}
          onExport={(fields, status, activities, pipeline) => {
            exportMutation.mutate({
              fields,
              includeStatus: status,
              includeActivities: activities,
              includePipeline: pipeline,
            });
            setShowExportModal(false);
          }}
          onClose={() => setShowExportModal(false)}
          isLoading={exportMutation.isPending}
        />
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
                <Card
                  key={contact.id}
                  className="hover:shadow-md transition-shadow relative"
                >
                  {/* Pipeline Toggle Button - top left */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click
                      togglePipelineMutation.mutate(contact.id);
                    }}
                    className={`absolute top-3 left-3 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                      contact.in_pipeline
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-white border-gray-300 hover:border-blue-400'
                    }`}
                    title={contact.in_pipeline ? 'Remove from pipeline' : 'Add to pipeline'}
                  >
                    {contact.in_pipeline && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                      </svg>
                    )}
                  </button>

                  {/* Clickable area to navigate to detail (excluding toggle button) */}
                  <div
                    onClick={() => navigate(`/contacts/${contact.id}`, {
                      state: { from: location }
                    })}
                    className="cursor-pointer pl-10"
                  >
                    {/* Title at the top */}
                    <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {String(contact.data?.[titleFieldKey] || 'Contact')}
                    </h3>
                    <div className="flex items-center gap-2">
                      {/* Status Badge */}
                      {(() => {
                        const statusInfo = getStatusBadge(contact.status);
                        return (
                          <div className={`px-2 py-1 rounded text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </div>
                        );
                      })()}

                      {/* Activity Count */}
                      {contact.activities_count > 0 && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          <MessageSquare className="w-4 h-4" />
                          <span>{contact.activities_count}</span>
                        </div>
                      )}
                    </div>
                  </div>

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
