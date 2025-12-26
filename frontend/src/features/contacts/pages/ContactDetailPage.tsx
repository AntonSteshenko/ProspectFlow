import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { listsApi } from '@/api/lists';
import type { Contact, Activity } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

export function ContactDetailPage() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State for new comment
  const [newComment, setNewComment] = useState('');

  // State for editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

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
  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['activities', contactId],
    queryFn: () => listsApi.getActivities(contactId!),
    enabled: !!contactId,
  });

  // Create comment mutation
  const createMutation = useMutation({
    mutationFn: (content: string) =>
      listsApi.createActivity({ contact: contactId!, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', contactId] });
      setNewComment('');
    },
  });

  // Update comment mutation
  const updateMutation = useMutation({
    mutationFn: ({ activityId, content }: { activityId: string; content: string }) =>
      listsApi.updateActivity(contactId!, activityId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', contactId] });
      setEditingId(null);
      setEditContent('');
    },
  });

  // Delete comment mutation
  const deleteMutation = useMutation({
    mutationFn: (activityId: string) => listsApi.deleteActivity(contactId!, activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', contactId] });
    },
  });

  const handleAddComment = () => {
    if (newComment.trim()) {
      createMutation.mutate(newComment.trim());
    }
  };

  const handleStartEdit = (activity: Activity) => {
    setEditingId(activity.id);
    setEditContent(activity.content);
  };

  const handleSaveEdit = (activityId: string) => {
    if (editContent.trim()) {
      updateMutation.mutate({ activityId, content: editContent.trim() });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleDelete = (activityId: string) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      deleteMutation.mutate(activityId);
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
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 py-3 max-w-6xl">
      {/* Header */}
      <div className="mb-3">
        <Button variant="secondary" onClick={() => navigate(-1)} className="mb-2">
          ← Back
        </Button>
        <h1 className="text-2xl font-bold">Contact Details</h1>
      </div>

      {/* Activities Timeline */}
      <Card>
        <div className="p-3">
          <h2 className="text-lg font-semibold mb-2">Activity Timeline</h2>

          {/* Add Comment Form */}
          <div className="mb-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[50px]"
            />
            <div className="mt-1">
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={!newComment.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? 'Adding...' : 'Add Comment'}
              </Button>
            </div>
          </div>

          {/* Activities List */}
          <div className="space-y-1.5">
            {activities.length === 0 ? (
              <p className="text-gray-500 text-center py-3 text-sm">No comments yet. Add the first one!</p>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="rounded p-1.5 bg-gray-100">
                  {/* Activity Header */}
                  <div className="flex justify-between items-start mb-0.5">
                    <div className="text-sm flex gap-1">
                      <span className="font-medium text-gray-900">{activity.author_name}</span>
                      {activity.type === 'user_comment' && activity.is_edited && (
                        <span className="ml-1 text-xs text-gray-500 italic">(edited)</span>
                      )}
                      <p className="text-gray-500">{formatDate(activity.created_at)}</p>
                    </div>
                    {activity.can_edit && activity.can_delete && (
                      <div className="flex gap-0.5">
                        {editingId !== activity.id && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleStartEdit(activity)}
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
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Activity Content */}
                  {editingId === activity.id ? (
                    <div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[50px]"
                      />
                      <div className="mt-1 flex gap-0.5">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(activity.id)}
                          disabled={!editContent.trim() || updateMutation.isPending}
                        >
                          {updateMutation.isPending ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{activity.content}</p>
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
          <h2 className="text-lg font-semibold mb-2">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(contact.data).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <dt className="text-sm font-medium text-gray-500 capitalize min-w-[120px]">
                  {key.replace(/_/g, ' ')}:
                </dt>
                <dd className="text-sm text-gray-900">{value || '-'}</dd>
              </div>
            ))}
          </div>
        </div>
      </Card>
      <Button variant="secondary" onClick={() => navigate(-1)} className="mb-2">
        ← Back
      </Button>

    </div>
  );
}
