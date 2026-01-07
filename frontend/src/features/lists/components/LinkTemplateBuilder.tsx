import { useState, useRef } from 'react';
import { ExternalLink, Trash2, Edit2, Plus, X } from 'lucide-react';
import type { CustomLinkTemplate } from '@/types';
import { Button } from '@/components/ui/Button';

interface LinkTemplateBuilderProps {
  availableFields: string[];
  templates: CustomLinkTemplate[];
  onChange: (templates: CustomLinkTemplate[]) => void;
}

export function LinkTemplateBuilder({
  availableFields,
  templates,
  onChange,
}: LinkTemplateBuilderProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    url_template: '',
    enabled: true,
  });

  const urlInputRef = useRef<HTMLInputElement>(null);

  // Generate unique ID for new template
  const generateId = () => `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Start adding new template
  const handleStartAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({ name: '', url_template: '', enabled: true });
  };

  // Start editing existing template
  const handleStartEdit = (template: CustomLinkTemplate) => {
    setIsAdding(false);
    setEditingId(template.id);
    setFormData({
      name: template.name,
      url_template: template.url_template,
      enabled: template.enabled,
    });
  };

  // Cancel add/edit
  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', url_template: '', enabled: true });
  };

  // Save new template
  const handleSaveNew = () => {
    // Validation
    if (!formData.name.trim()) {
      alert('Please enter a template name');
      return;
    }
    if (!formData.url_template.trim()) {
      alert('Please enter a URL template');
      return;
    }
    if (!formData.url_template.match(/^https?:\/\//)) {
      alert('URL must start with http:// or https://');
      return;
    }
    if (!formData.url_template.match(/\{[^}]+\}/)) {
      alert('URL template must contain at least one {field_name} placeholder');
      return;
    }

    const newTemplate: CustomLinkTemplate = {
      id: generateId(),
      name: formData.name.trim(),
      url_template: formData.url_template.trim(),
      enabled: formData.enabled,
    };

    onChange([...templates, newTemplate]);
    handleCancel();
  };

  // Save edited template
  const handleSaveEdit = () => {
    // Validation
    if (!formData.name.trim()) {
      alert('Please enter a template name');
      return;
    }
    if (!formData.url_template.trim()) {
      alert('Please enter a URL template');
      return;
    }
    if (!formData.url_template.match(/^https?:\/\//)) {
      alert('URL must start with http:// or https://');
      return;
    }
    if (!formData.url_template.match(/\{[^}]+\}/)) {
      alert('URL template must contain at least one {field_name} placeholder');
      return;
    }

    const updatedTemplates = templates.map(t =>
      t.id === editingId
        ? {
            ...t,
            name: formData.name.trim(),
            url_template: formData.url_template.trim(),
            enabled: formData.enabled,
          }
        : t
    );

    onChange(updatedTemplates);
    handleCancel();
  };

  // Delete template
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      onChange(templates.filter(t => t.id !== id));
    }
  };

  // Toggle enabled status
  const handleToggleEnabled = (id: string) => {
    const updatedTemplates = templates.map(t =>
      t.id === id ? { ...t, enabled: !t.enabled } : t
    );
    onChange(updatedTemplates);
  };

  // Insert field placeholder at cursor position
  const handleInsertField = (fieldName: string) => {
    const input = urlInputRef.current;
    if (!input) return;

    const placeholder = `{${fieldName}}`;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const currentValue = formData.url_template;

    const newValue =
      currentValue.substring(0, start) +
      placeholder +
      currentValue.substring(end);

    setFormData({ ...formData, url_template: newValue });

    // Set cursor position after inserted placeholder
    setTimeout(() => {
      input.focus();
      const newPosition = start + placeholder.length;
      input.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  // Generate preview URL with sample data
  const getPreviewUrl = () => {
    if (!formData.url_template) return '';

    let preview = formData.url_template;
    const placeholderRegex = /\{([^}]+)\}/g;
    const matches = [...preview.matchAll(placeholderRegex)];

    for (const match of matches) {
      const fieldName = match[1];
      preview = preview.replace(match[0], `<${fieldName}_value>`);
    }

    return preview;
  };

  return (
    <div className="space-y-4">
      {/* Header with count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {templates.length} / 5 templates configured
        </p>
        {!isAdding && !editingId && (
          <Button
            size="sm"
            onClick={handleStartAdd}
            disabled={templates.length >= 5}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Link Template
          </Button>
        )}
      </div>

      {/* Existing templates list */}
      {templates.length > 0 && !isAdding && !editingId && (
        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`border rounded-lg p-4 ${
                template.enabled ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={template.enabled}
                      onChange={() => handleToggleEnabled(template.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <h4 className="font-medium text-gray-900">{template.name}</h4>
                    {template.enabled && (
                      <ExternalLink className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 font-mono break-all">
                    {template.url_template}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleStartEdit(template)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Edit template"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <div className="border-2 border-blue-300 rounded-lg p-6 bg-blue-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {isAdding ? 'Add New Template' : 'Edit Template'}
            </h3>
            <button
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700"
              title="Cancel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Enabled toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="template-enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="template-enabled" className="ml-2 text-sm font-medium text-gray-700">
                Enabled (show button on contacts)
              </label>
            </div>

            {/* Name input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Google Search, LinkedIn, Company Website"
                maxLength={50}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                This will be displayed on the button
              </p>
            </div>

            {/* URL template input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL Template <span className="text-red-500">*</span>
              </label>
              <input
                ref={urlInputRef}
                type="text"
                value={formData.url_template}
                onChange={(e) => setFormData({ ...formData, url_template: e.target.value })}
                placeholder="https://google.com/search?q={company}+{city}"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Use {'{field_name}'} placeholders. Must start with http:// or https://
              </p>
            </div>

            {/* Insert field buttons */}
            {availableFields.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insert Field Placeholder
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableFields.slice(0, 20).map((field) => (
                    <button
                      key={field}
                      type="button"
                      onClick={() => handleInsertField(field)}
                      className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 font-mono"
                    >
                      {'{' + field + '}'}
                    </button>
                  ))}
                  {availableFields.length > 20 && (
                    <span className="text-xs text-gray-500 self-center">
                      ...and {availableFields.length - 20} more
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Click to insert field at cursor position
                </p>
              </div>
            )}

            {/* Preview */}
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Preview</p>
              {getPreviewUrl() ? (
                <p className="text-sm font-mono text-gray-900 break-all">
                  {getPreviewUrl()}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">Enter URL template above</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={isAdding ? handleSaveNew : handleSaveEdit}
                size="sm"
              >
                {isAdding ? 'Add Template' : 'Save Changes'}
              </Button>
              <Button
                onClick={handleCancel}
                variant="secondary"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {templates.length === 0 && !isAdding && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <ExternalLink className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">No custom link templates configured</p>
          <p className="text-sm text-gray-500 mb-4">
            Create templates to add quick action buttons to your contacts
          </p>
          <Button size="sm" onClick={handleStartAdd} className="flex items-center gap-2 mx-auto">
            <Plus className="w-4 h-4" />
            Add Your First Template
          </Button>
        </div>
      )}
    </div>
  );
}
