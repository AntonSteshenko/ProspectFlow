import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, Eye } from 'lucide-react';
import { listsApi } from '../../../api/lists';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { CreateListModal } from '../components/CreateListModal';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  // Extract results from paginated response
  const lists = response?.results || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Contact Lists</h1>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus size={20} />
          New List
        </Button>
      </div>

      {lists.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500 mb-4">No contact lists yet</p>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={20} className="inline mr-2" />
            Create your first list
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lists.map((list) => (
            <Card key={list.id} className="hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{list.name}</h3>
              <div className="text-sm text-gray-600 space-y-1 mb-4">
                <p>Contacts: {list.contact_count || 0}</p>
                <p>Status: <span className="capitalize">{list.status}</span></p>
                <p className="text-xs text-gray-400">
                  Created: {new Date(list.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => navigate(`/lists/${list.id}/upload`)}
                  size="sm"
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  <span>Upload</span>
                </Button>
                <Button
                  onClick={() => navigate(`/lists/${list.id}/contacts`)}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  <span>View</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateListModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
