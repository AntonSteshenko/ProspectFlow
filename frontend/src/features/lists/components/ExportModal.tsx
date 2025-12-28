import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface ExportModalProps {
  availableFields: string[];
  onExport: (
    selectedFields: string[],
    includeStatus: boolean,
    includeActivities: boolean,
    includePipeline: boolean
  ) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function ExportModal({
  availableFields,
  onExport,
  onClose,
  isLoading = false
}: ExportModalProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>([...availableFields]);
  const [includeStatus, setIncludeStatus] = useState(true);
  const [includeActivities, setIncludeActivities] = useState(true);
  const [includePipeline, setIncludePipeline] = useState(true);

  const handleToggleField = (field: string) => {
    setSelectedFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const handleSelectAll = () => {
    setSelectedFields([...availableFields]);
  };

  const handleDeselectAll = () => {
    setSelectedFields([]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Export Contacts to CSV</h2>

        {/* Field Selection */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Select Fields</h3>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border p-4 rounded">
            {availableFields.map(field => (
              <label key={field} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  checked={selectedFields.includes(field)}
                  onChange={() => handleToggleField(field)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm">{field}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Additional Options */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Additional Fields</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
              <input
                type="checkbox"
                checked={includeStatus}
                onChange={(e) => setIncludeStatus(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm">Include Contact Status</span>
              <span className="text-xs text-gray-500">(not_contacted, in_working, dropped, converted)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
              <input
                type="checkbox"
                checked={includeActivities}
                onChange={(e) => setIncludeActivities(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm">Include Activities Count</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
              <input
                type="checkbox"
                checked={includePipeline}
                onChange={(e) => setIncludePipeline(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm">Include Pipeline Status</span>
            </label>
          </div>
        </div>

        {/* Info */}
        <p className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded p-3 mb-4">
          Export will include only the contacts matching your current filters.
        </p>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={() => onExport(selectedFields, includeStatus, includeActivities, includePipeline)}
            disabled={selectedFields.length === 0 || isLoading}
          >
            {isLoading ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>
    </div>
  );
}
