import { useState } from 'react';

interface AddressTemplateBuilderProps {
  availableFields: string[];
  selectedFields: string[];
  separator: string;
  onChange: (fields: string[], separator: string) => void;
}

export function AddressTemplateBuilder({
  availableFields,
  selectedFields,
  separator,
  onChange,
}: AddressTemplateBuilderProps) {
  const [tempSeparator, setTempSeparator] = useState(separator);

  const handleFieldToggle = (field: string) => {
    let newFields: string[];
    if (selectedFields.includes(field)) {
      // Remove field
      newFields = selectedFields.filter((f) => f !== field);
    } else {
      // Add field
      newFields = [...selectedFields, field];
    }
    onChange(newFields, tempSeparator);
  };

  const handleSeparatorChange = (newSeparator: string) => {
    setTempSeparator(newSeparator);
    onChange(selectedFields, newSeparator);
  };

  const handleClearAll = () => {
    onChange([], tempSeparator);
  };

  return (
    <div className="space-y-4">
      {/* Field Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Address Fields
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {availableFields.map((field) => (
            <label
              key={field}
              className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
            >
              <input
                type="checkbox"
                checked={selectedFields.includes(field)}
                onChange={() => handleFieldToggle(field)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 font-mono">{field}</span>
            </label>
          ))}
        </div>
        {selectedFields.length > 0 && (
          <button
            onClick={handleClearAll}
            className="mt-2 text-sm text-red-600 hover:text-red-700"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Separator Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Field Separator
        </label>
        <input
          type="text"
          value={tempSeparator}
          onChange={(e) => handleSeparatorChange(e.target.value)}
          placeholder=", "
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">
          String to separate address fields (e.g., ", " or " - ")
        </p>
      </div>

      {/* Preview */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-xs font-medium text-gray-500 mb-1">
          Address Preview
        </p>
        {selectedFields.length > 0 ? (
          <p className="text-sm font-mono text-gray-900">
            {selectedFields.join(tempSeparator || ', ')}
          </p>
        ) : (
          <p className="text-sm text-gray-400 italic">No fields selected</p>
        )}
      </div>

      {/* Selected Fields Order */}
      {selectedFields.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-700 mb-2">
            Selected Fields ({selectedFields.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedFields.map((field, index) => (
              <span
                key={field}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
              >
                {index + 1}. {field}
                <button
                  onClick={() => handleFieldToggle(field)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                  title="Remove field"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
