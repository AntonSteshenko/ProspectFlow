import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { listsApi } from '../../../api/lists';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';

export const DashboardPage = () => {
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['lists'],
    queryFn: listsApi.getLists,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center text-red-600 py-12">
        <p className="mb-2">Error loading lists</p>
        <p className="text-sm">{error instanceof Error ? error.message : 'Please try again'}</p>
      </Card>
    );
  }

  // Handle both array and paginated response
  const lists = Array.isArray(response) ? response : (response?.results || []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Contact Lists</h1>
        <Button className="flex items-center gap-2">
          <Plus size={20} />
          New List
        </Button>
      </div>

      {lists.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500 mb-4">No contact lists yet</p>
          <Button>
            <Plus size={20} className="inline mr-2" />
            Create your first list
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lists.map((list) => (
            <Card key={list.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{list.name}</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Contacts: {list.contact_count}</p>
                <p>Status: <span className="capitalize">{list.status}</span></p>
                <p className="text-xs text-gray-400">
                  Created: {new Date(list.created_at).toLocaleDateString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
