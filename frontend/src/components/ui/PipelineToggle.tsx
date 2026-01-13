import { useMutation, useQueryClient } from '@tanstack/react-query';
import { listsApi } from '@/api/lists';
import type { ContactStatus } from '@/types';

interface PipelineToggleProps {
  contactId: string;
  inPipeline: boolean;
  // Context for ContactsPage with complex filters
  listContext?: {
    listId: string;
    search?: string;
    page?: number;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    searchField?: string;
    showPipelineOnly?: boolean;
    selectedStatuses?: ContactStatus[];
  };
  // Optional callback
  onToggle?: (newState: boolean) => void;
}

export function PipelineToggle({ contactId, inPipeline, listContext, onToggle }: PipelineToggleProps) {
  const queryClient = useQueryClient();

  const togglePipelineMutation = useMutation({
    mutationFn: (contactId: string) => listsApi.togglePipeline(contactId),

    // Optimistic update - runs immediately before API call
    onMutate: async (contactId: string) => {
      // Build query keys based on context
      if (listContext) {
        // ContactsPage context with filters
        const queryKey = [
          'contacts',
          listContext.listId,
          listContext.search || '',
          listContext.page || 1,
          listContext.sortField || '',
          listContext.sortDirection || 'asc',
          listContext.searchField || '',
          listContext.showPipelineOnly || false,
          listContext.selectedStatuses || [],
        ];

        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey });

        // Snapshot current state for rollback
        const previousData = queryClient.getQueryData(queryKey);

        // Optimistically update cache
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old?.results) return old;

          return {
            ...old,
            results: old.results.map((contact: any) =>
              contact.id === contactId
                ? { ...contact, in_pipeline: !contact.in_pipeline }
                : contact
            ),
          };
        });

        return { previousData, queryKey };
      } else {
        // ContactDetailPage context - single contact
        const queryKey = ['contact', contactId];

        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey });

        // Snapshot current state for rollback
        const previousData = queryClient.getQueryData(queryKey);

        // Optimistically update cache
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return old;
          return { ...old, in_pipeline: !old.in_pipeline };
        });

        return { previousData, queryKey };
      }
    },

    // Error handling - rollback on failure
    onError: (err, contactId, context: any) => {
      // Restore previous state
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }

      // Show error to user
      console.error('Failed to update pipeline status:', err);
      alert('Failed to update pipeline status. Please try again.');
    },

    // Always refetch after success or error to ensure consistency
    onSettled: () => {
      if (listContext) {
        // Invalidate contacts list for ContactsPage
        queryClient.invalidateQueries({ queryKey: ['contacts', listContext.listId] });
      } else {
        // Invalidate single contact and list for ContactDetailPage
        queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
      }
    },

    onSuccess: () => {
      // Call optional callback
      if (onToggle) {
        onToggle(!inPipeline);
      }
    },
  });

  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // Prevent parent click events (like card navigation)
        togglePipelineMutation.mutate(contactId);
      }}
      disabled={togglePipelineMutation.isPending}
      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
        inPipeline
          ? 'bg-blue-500 border-blue-500'
          : 'bg-white border-gray-300 hover:border-blue-400'
      } ${togglePipelineMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={inPipeline ? 'Remove from pipeline' : 'Add to pipeline'}
    >
      {inPipeline && (
        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
        </svg>
      )}
    </button>
  );
}
