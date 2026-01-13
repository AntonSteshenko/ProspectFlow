import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { clearTokens } from '../../utils/storage';
import { Button } from '../ui/Button';
import { authApi } from '../../api/auth';

export const Header = () => {
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['profile'],
    queryFn: authApi.getProfile,
  });

  const handleLogout = () => {
    clearTokens();
    navigate('/login');
  };

  const displayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.first_name || user?.last_name || user?.username || user?.email || '';

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">ProspectFlow</h1>
          </div>

          <div className="flex items-center gap-3">
            {displayName && (
              <span className="text-sm font-medium text-gray-700">
                {displayName}
              </span>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut size={16} />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
