import { useState } from 'react';
import { Calendar, Phone, Mail, CheckCircle, UserX, Search } from 'lucide-react';
import { Button } from './Button';
import type { Activity, ActivityType, ActivityResult } from '@/types';

interface ActivityEditorProps {
  currentActivity?: Activity;
  onSave: (type: ActivityType, result: ActivityResult, date: string | null, content: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ActivityEditor({
  currentActivity,
  onSave,
  onCancel,
  isLoading = false
}: ActivityEditorProps) {
  const [activityType, setActivityType] = useState<ActivityType>(
    currentActivity?.type || 'call'
  );
  const [result, setResult] = useState<ActivityResult>(
    currentActivity?.result || 'followup'
  );
  const [date, setDate] = useState<string>(currentActivity?.date || '');
  const [content, setContent] = useState<string>(currentActivity?.content || '');

  const handleSave = () => {
    onSave(activityType, result, date || null, content);
  };

  const activityTypes: { value: ActivityType; label: string; icon: any }[] = [
    { value: 'call', label: 'Call', icon: Phone },
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'visit', label: 'Visit', icon: Calendar },
    { value: 'research', label: 'Research', icon: Search },
  ];

  const results: { value: ActivityResult; label: string; icon: any; color: string }[] = [
    { value: 'lead', label: 'Lead', icon: CheckCircle, color: 'green' },
    { value: 'followup', label: 'Follow-up', icon: Calendar, color: 'blue' },
    { value: 'no', label: 'No', icon: UserX, color: 'red' },
  ];

  return (
    <div className="space-y-4">
      {/* Activity Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Type
        </label>
        <div className="space-y-2">
          {activityTypes.map(({ value, label, icon: Icon }) => (
            <label
              key={value}
              className={`
                flex items-center gap-3 px-4 py-3 rounded border-2 cursor-pointer transition-colors
                ${activityType === value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input
                type="radio"
                name="activity-type"
                value={value}
                checked={activityType === value}
                onChange={() => setActivityType(value)}
                disabled={isLoading}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <Icon className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Result Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Result
        </label>
        <div className="space-y-2">
          {results.map(({ value, label, icon: Icon, color }) => (
            <label
              key={value}
              className={`
                flex items-center gap-3 px-4 py-3 rounded border-2 cursor-pointer transition-colors
                ${result === value
                  ? color === 'green'
                    ? 'border-green-500 bg-green-50'
                    : color === 'blue'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-red-500 bg-red-50'
                  : 'border-gray-300 hover:border-gray-400'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input
                type="radio"
                name="activity-result"
                value={value}
                checked={result === value}
                onChange={() => setResult(value)}
                disabled={isLoading}
                className={`
                  w-4 h-4 border-gray-300 focus:ring-2
                  ${color === 'green' ? 'text-green-600 focus:ring-green-500' : ''}
                  ${color === 'blue' ? 'text-blue-600 focus:ring-blue-500' : ''}
                  ${color === 'red' ? 'text-red-600 focus:ring-red-500' : ''}
                `}
              />
              <Icon className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Date Picker */}
      {result === 'followup' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date follow-up (Optional)
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
      )}
      {/* Content/Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes (Optional)
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isLoading}
          rows={3}
          placeholder="Add notes about this activity..."
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={isLoading}
          size="sm"
        >
          {isLoading ? 'Saving...' : currentActivity ? 'Update Activity' : 'Add Activity'}
        </Button>

        {onCancel && (
          <Button
            onClick={onCancel}
            variant="secondary"
            size="sm"
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
