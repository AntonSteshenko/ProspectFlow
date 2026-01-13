import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Phone, Mail, CheckCircle, UserX, ChevronDown, ChevronUp, Search } from 'lucide-react';
import apiClient from '@/api/client';
import { listsApi } from '@/api/lists';
import type { Contact, Activity, ActivityType, ActivityResult } from '@/types';
import { getContactLinks } from '@/utils/linkTemplates';
import { sortFieldsByColumnOrder } from '@/utils/fieldOrdering';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { PipelineToggle } from '@/components/ui/PipelineToggle';
import { ActivityEditor } from '../../../components/ui/ActivityEditor';

export function ContactDetailPage() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Get previous location from navigation state
  const fromLocation = (location.state as any)?.from;

  // State for adding new activity
  const [isAdding, setIsAdding] = useState(false);

  // State for editing activity
  const [editingId, setEditingId] = useState<string | null>(null);

  // State for collapsing contact info
  const [isContactInfoExpanded, setIsContactInfoExpanded] = useState(false);

  // Fetch contact details
  const { data: contact, isLoading: contactLoading } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: async () => {
      const response = await apiClient.get<Contact>(`/contacts/${contactId}/`);
      return response.data;
    },
    enabled: !!contactId,
  });

  // Fetch activities
  const { data: activitiesData = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['activities', contactId],
    queryFn: () => listsApi.getActivities(contactId!),
    enabled: !!contactId,
  });

  // Fetch contact's list (for custom link templates)
  const { data: contactList } = useQuery({
    queryKey: ['list', contact?.list],
    queryFn: () => listsApi.getList(contact!.list),
    enabled: !!contact?.list,
  });

  // Filter only new-format activities (with result field)
  const activities = activitiesData.filter((activity: Activity) =>
    activity.result !== undefined && activity.result !== null
  );

  // Create activity mutation
  const createMutation = useMutation({
    mutationFn: (data: { type: ActivityType; result: ActivityResult; date: string | null; content: string }) =>
      listsApi.createActivity({
        contact: contactId!,
        type: data.type,
        result: data.result,
        date: data.date,
        content: data.content
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setIsAdding(false);
    },
  });

  // Update activity mutation
  const updateMutation = useMutation({
    mutationFn: ({ activityId, data }: { activityId: string; data: any }) =>
      listsApi.updateActivity(contactId!, activityId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setEditingId(null);
    },
  });

  // Delete activity mutation
  const deleteMutation = useMutation({
    mutationFn: (activityId: string) => listsApi.deleteActivity(contactId!, activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  const handleSaveNew = (type: ActivityType, result: ActivityResult, date: string | null, content: string) => {
    createMutation.mutate({ type, result, date, content });
  };

  const handleSaveEdit = (activityId: string, type: ActivityType, result: ActivityResult, date: string | null, content: string) => {
    updateMutation.mutate({
      activityId,
      data: { type, result, date, content }
    });
  };

  const handleDelete = (activityId: string) => {
    if (window.confirm('Are you sure you want to delete this activity?')) {
      deleteMutation.mutate(activityId);
    }
  };

  const handleBack = () => {
    if (fromLocation) {
      // Navigate back to ContactsPage with filters preserved
      navigate(fromLocation.pathname + fromLocation.search);
    } else {
      // Fallback: navigate to dashboard if no fromLocation
      navigate('/dashboard');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatActivityDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'call':
        return Phone;
      case 'email':
        return Mail;
      case 'visit':
        return Calendar;
      case 'research':
        return Search;
      default:
        return Phone; // fallback
    }
  };

  const getResultIcon = (result: ActivityResult) => {
    switch (result) {
      case 'lead':
        return CheckCircle;
      case 'followup':
        return Calendar;
      case 'no':
        return UserX;
      default:
        return Calendar; // fallback
    }
  };

  const getResultColor = (result: ActivityResult) => {
    switch (result) {
      case 'lead':
        return 'bg-green-100 text-green-700';
      case 'followup':
        return 'bg-blue-100 text-blue-700';
      case 'no':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700'; // fallback
    }
  };

  if (contactLoading || activitiesLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">Contact not found</h2>
        <Button onClick={handleBack}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 py-3 max-w-6xl">
      {/* Header */}
      <div className="mb-3">
        <Button variant="secondary" onClick={handleBack} className="mb-2">
          ← Back
        </Button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {contact.data?.[contactList?.metadata?.title_field] || 'Contact Details'}
          </h1>
          <div className="flex items-center gap-3">
            {/* Pipeline Toggle */}
            {contact && (
              <PipelineToggle
                contactId={contact.id}
                inPipeline={contact.in_pipeline}
              />
            )}

            {/* Custom Link Buttons */}
            {(() => {
              const customLinks = getContactLinks(
                contactList?.metadata?.custom_link_templates,
                contact.data
              );
              return customLinks.map(({ template, url }) => (
                <Button
                  key={template.id}
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                  title={`Open in ${template.name}`}
                >
                  {template.name}
                </Button>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Activities Timeline */}
      <Card className="mb-3">
        <div className="p-3">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Activity Timeline</h2>
            {!isAdding && (
              <Button size="sm" onClick={() => setIsAdding(true)}>
                Add Activity
              </Button>
            )}
          </div>

          {/* Add Activity Form */}
          {isAdding && (
            <div className="mb-3 p-3 bg-gray-50 rounded">
              <ActivityEditor
                onSave={handleSaveNew}
                onCancel={() => setIsAdding(false)}
                isLoading={createMutation.isPending}
              />
            </div>
          )}

          {/* Activities List */}
          <div className="space-y-2">
            {activities.length === 0 ? (
              <p className="text-gray-500 text-center py-3 text-sm">
                No activities yet. Add the first one!
              </p>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="rounded p-3 bg-gray-50 border border-gray-200">
                  {editingId === activity.id ? (
                    <ActivityEditor
                      currentActivity={activity}
                      onSave={(type, result, date, content) =>
                        handleSaveEdit(activity.id, type, result, date, content)
                      }
                      onCancel={() => setEditingId(null)}
                      isLoading={updateMutation.isPending}
                    />
                  ) : (
                    <>
                      {/* Activity Header */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-sm">
                            {/* Type Badge */}
                            <div className="flex items-center gap-1 px-2 py-1 rounded bg-gray-200 text-gray-700">
                              {(() => {
                                const Icon = getActivityIcon(activity.type);
                                return <Icon className="w-3 h-3" />;
                              })()}
                              <span className="capitalize">{activity.type}</span>
                            </div>

                            {/* Result Badge */}
                            <div className={`flex items-center gap-1 px-2 py-1 rounded ${getResultColor(activity.result)}`}>
                              {(() => {
                                const Icon = getResultIcon(activity.result);
                                return <Icon className="w-3 h-3" />;
                              })()}
                              <span className="capitalize">{activity.result}</span>
                            </div>

                            {/* Date Badge */}
                            {activity.date && (
                              <div className="px-2 py-1 rounded bg-purple-100 text-purple-700 text-xs">
                                {formatActivityDate(activity.date)}
                              </div>
                            )}
                          </div>
                        </div>

                        {activity.can_edit && activity.can_delete && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setEditingId(activity.id)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleDelete(activity.id)}
                              disabled={deleteMutation.isPending}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Activity Content */}
                      {activity.content && (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">
                          {activity.content}
                        </p>
                      )}

                      {/* Activity Metadata */}
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">{activity.author_name}</span>
                        <span className="mx-1">•</span>
                        <span>{formatDate(activity.created_at)}</span>
                        {activity.is_edited && (
                          <>
                            <span className="mx-1">•</span>
                            <span className="italic">edited</span>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      {/* Contact Information */}
      <Card className="mb-3">
        <div className="p-3">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Contact Information</h2>
            <button
              onClick={() => setIsContactInfoExpanded(!isContactInfoExpanded)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              {isContactInfoExpanded ? (
                <>
                  <span>Show less</span>
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Show all</span>
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            {(() => {
              // Filter entries first
              const filteredEntries = Object.entries(contact.data)
                .filter(([key, value]) => {
                  // Skip internal fields (starting with _)
                  if (key.startsWith('_')) return false;
                  // When collapsed, only show fields with values
                  if (!isContactInfoExpanded) {
                    return value !== null && value !== undefined && value !== '' && value !== 0;
                  }
                  // When expanded, show all fields
                  return true;
                });

              // Sort entries based on column_order
              const columnOrder = contactList?.metadata?.column_order;
              const sortedKeys = sortFieldsByColumnOrder(
                filteredEntries.map(([key]) => key),
                columnOrder
              );

              // Rebuild entries in correct order
              const orderedEntries = sortedKeys
                .map(key => filteredEntries.find(([k]) => k === key))
                .filter((entry): entry is [string, any] => entry !== undefined);

              return orderedEntries.map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <dt className="text-sm font-medium text-gray-500 capitalize min-w-[120px]">
                    {key.replace(/_/g, ' ')}:
                  </dt>
                  <dd className="text-sm text-gray-900">{value || '-'}</dd>
                </div>
              ));
            })()}
          </div>
        </div>
      </Card>

      <Button variant="secondary" onClick={() => navigate(-1)} className="mb-2">
        ← Back
      </Button>
    </div>
  );
}
