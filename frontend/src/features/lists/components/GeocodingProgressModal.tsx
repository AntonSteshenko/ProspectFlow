import { useEffect, useState } from 'react';
import { listsApi } from '@/api/lists';
import type { GeocodingStatusResponse } from '@/types';
import { Button } from '@/components/ui/Button';

interface GeocodingProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
}

export function GeocodingProgressModal({
  isOpen,
  onClose,
  listId,
}: GeocodingProgressModalProps) {
  const [status, setStatus] = useState<GeocodingStatusResponse | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // Poll geocode-status every 2 seconds
  useEffect(() => {
    if (!isOpen) return;

    const fetchStatus = async () => {
      try {
        const data = await listsApi.getGeocodingStatus(listId);
        setStatus(data);

        if (data.geocoding_status === 'completed' || data.geocoding_status === 'failed') {
          setIsCompleted(true);
        }
      } catch (error) {
        console.error('Failed to fetch geocoding status:', error);
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll every 2 seconds if not completed
    const interval = setInterval(() => {
      if (!isCompleted) {
        fetchStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, listId, isCompleted]);

  if (!isOpen) return null;

  const progress = status?.geocoding_progress || { current: 0, total: 0, percentage: 0 };
  const results = status?.geocoding_results || { success: 0, failed: 0, total: 0 };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">
          {status?.geocoding_status === 'processing' && 'Geocoding in Progress'}
          {status?.geocoding_status === 'completed' && 'Geocoding Completed'}
          {status?.geocoding_status === 'failed' && 'Geocoding Failed'}
          {!status?.geocoding_status && 'Loading...'}
        </h2>

        {/* Progress Bar */}
        {status?.geocoding_status === 'processing' && (
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-center mb-4">
          <div>
            <p className="text-2xl font-bold text-green-600">{results.success}</p>
            <p className="text-sm text-gray-600">Success</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{results.failed}</p>
            <p className="text-sm text-gray-600">Failed</p>
          </div>
        </div>

        {/* Current Status */}
        {status?.geocoding_status === 'processing' && (
          <div className="text-center mb-4">
            <p className="text-gray-600">
              {progress.current} / {progress.total} contacts processed
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {progress.percentage.toFixed(1)}% complete
            </p>
          </div>
        )}

        {/* Error Message */}
        {status?.geocoding_status === 'failed' && status.geocoding_error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-700">{status.geocoding_error}</p>
          </div>
        )}

        {/* Completion Summary */}
        {status?.geocoding_status === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-700 font-medium">
              Geocoding completed successfully!
            </p>
            <p className="text-xs text-green-600 mt-1">
              {results.success} contacts geocoded, {results.failed} failed
            </p>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end mt-4">
          <Button
            onClick={onClose}
            variant={isCompleted ? 'primary' : 'secondary'}
            className="w-full"
          >
            {isCompleted ? 'Done' : 'Close'}
          </Button>
        </div>
      </div>
    </div>
  );
}
