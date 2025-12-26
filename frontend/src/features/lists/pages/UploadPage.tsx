import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { listsApi } from '@/api/lists';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

export function UploadPage() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<{
    headers: string[];
    preview?: Record<string, string>[];
    rows?: Record<string, string>[];
    total_rows?: number;
  } | null>(null);

  // Get list details
  const { data: list, isLoading: isLoadingList } = useQuery({
    queryKey: ['list', listId],
    queryFn: () => listsApi.getList(listId!),
    enabled: !!listId,
  });

  // Upload and parse file mutation
  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => listsApi.uploadFile(listId!, formData),
    onSuccess: (data) => {
      setPreviewData(data);
    },
  });

  const onDrop = (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      const formData = new FormData();
      formData.append('file', selectedFile);
      uploadMutation.mutate(formData);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  const handleImportContacts = async () => {
    if (listId && previewData) {
      try {
        await listsApi.processImport(listId);
        navigate(`/lists/${listId}/contacts`);
      } catch (error) {
        console.error('Import failed:', error);
      }
    }
  };

  if (isLoadingList) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Upload Contacts</h1>
        <p className="text-gray-600 mt-2">
          Upload a CSV or Excel file for list: <span className="font-semibold">{list?.name}</span>
        </p>
      </div>

      <Card>
        <div className="p-6">
          {/* Dropzone */}
          {!previewData && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              {isDragActive ? (
                <p className="text-lg text-blue-600">Drop the file here...</p>
              ) : (
                <>
                  <p className="text-lg text-gray-700 mb-2">
                    Drag and drop a file here, or click to select
                  </p>
                  <p className="text-sm text-gray-500">
                    Supported formats: CSV, XLSX, XLS
                  </p>
                </>
              )}
            </div>
          )}

          {/* Upload progress */}
          {uploadMutation.isPending && (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
              <span className="ml-3 text-gray-600">Processing file...</span>
            </div>
          )}

          {/* Error message */}
          {uploadMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-red-800 font-semibold">Upload failed</h3>
                <p className="text-red-700 text-sm mt-1">
                  {uploadMutation.error instanceof Error
                    ? uploadMutation.error.message
                    : 'An error occurred while uploading the file'}
                </p>
              </div>
            </div>
          )}

          {/* Preview */}
          {previewData && (
            <div>
              <div className="flex items-center mb-4">
                <FileSpreadsheet className="w-6 h-6 text-green-600 mr-2" />
                <div>
                  <h3 className="font-semibold text-gray-900">File uploaded successfully</h3>
                  <p className="text-sm text-gray-600">
                    {file?.name} - {previewData.headers.length} columns detected
                  </p>
                </div>
              </div>

              {/* Headers preview */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Detected columns ({previewData.headers?.length || 0}):
                </h4>
                <div className="flex flex-wrap gap-2">
                  {previewData.headers?.map((header, index) => (
                    <span
                      key={index}
                      className="bg-white px-3 py-1 rounded border border-gray-200 text-sm text-gray-700"
                    >
                      {header}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sample data preview */}
              <div className="overflow-x-auto mb-6">
                {(() => {
                  const dataRows = previewData.preview || previewData.rows || [];
                  return (
                    <>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        Preview (first {Math.min(3, dataRows.length)} rows):
                      </h4>
                      <table className="min-w-full border border-gray-200 rounded">
                        <thead className="bg-gray-50">
                          <tr>
                            {previewData.headers?.map((header, index) => (
                              <th
                                key={index}
                                className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-b"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dataRows.slice(0, 3).map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b last:border-b-0">
                              {previewData.headers?.map((header, colIndex) => (
                                <td
                                  key={colIndex}
                                  className="px-4 py-2 text-sm text-gray-600"
                                >
                                  {row[header] || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  );
                })()}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={handleImportContacts}
                  className="flex-1"
                >
                  Import Contacts
                </Button>
                <Button
                  onClick={() => {
                    setFile(null);
                    setPreviewData(null);
                    uploadMutation.reset();
                  }}
                  variant="secondary"
                >
                  Upload Different File
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
