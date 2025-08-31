/**
 * File Uploader Component
 * 
 * Drag & drop file upload interface with format validation.
 */

import { useState, useCallback, useRef } from 'react';
import { Button } from '../ui';
import { CloudArrowUpIcon, DocumentTextIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface FileUploaderProps {
  onFileUpload: (file: File, content: string) => void;
  supportedFormats: string[];
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileUpload, supportedFormats }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return 'File size must be less than 50MB';
    }

    // Check file type
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeTypes = {
      csv: ['text/csv', 'application/csv'],
      tsv: ['text/tab-separated-values', 'text/tsv'],
      json: ['application/json', 'text/json'],
      txt: ['text/plain'],
      xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      xls: ['application/vnd.ms-excel']
    };

    const supportedExtensions = Object.keys(mimeTypes);
    const supportedMimeTypes = Object.values(mimeTypes).flat();

    if (!extension || !supportedExtensions.includes(extension)) {
      return `Unsupported file type. Please upload: ${supportedExtensions.join(', ')}`;
    }

    if (!supportedMimeTypes.includes(file.type) && file.type !== '') {
      // Some browsers don't set MIME type correctly, so we'll be lenient
    }

    return null;
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      // For Excel files, we'd need different handling, but for now read as text
      reader.readAsText(file);
    });
  };

  const handleFile = useCallback(async (file: File) => {
    setError('');
    setIsLoading(true);

    try {
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      // Read file content
      const content = await readFileContent(file);
      
      // Call parent handler
      onFileUpload(file, content);
    } catch (err: any) {
      setError(err.message || 'Failed to process file');
    } finally {
      setIsLoading(false);
    }
  }, [onFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
          isDragging
            ? 'border-koda-primary bg-koda-primary/5 scale-105'
            : error
            ? 'border-red-300 bg-red-50'
            : 'border-border hover:border-koda-primary/50 hover:bg-koda-primary/5'
        } ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.json,.txt,.xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />

        {isLoading ? (
          <div className="space-y-4">
            <div className="w-16 h-16 border-4 border-koda-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-text-secondary">Processing file...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
              error ? 'bg-red-100' : 'bg-koda-primary/10'
            }`}>
              {error ? (
                <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
              ) : (
                <CloudArrowUpIcon className="w-8 h-8 text-koda-primary" />
              )}
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                {error ? 'Upload Error' : 'Upload Your Flashcard File'}
              </h3>
              
              {error ? (
                <p className="text-red-600 mb-4">{error}</p>
              ) : (
                <p className="text-text-secondary mb-4">
                  Drag and drop your file here, or click to browse
                </p>
              )}
            </div>

            <Button
              onClick={handleButtonClick}
              className="mx-auto"
              variant={error ? 'outline' : 'primary'}
            >
              <DocumentTextIcon className="w-5 h-5 mr-2" />
              {error ? 'Try Again' : 'Choose File'}
            </Button>
          </div>
        )}
      </div>

      {/* Supported Formats */}
      <div className="bg-surface-elevated rounded-lg p-6">
        <h4 className="font-semibold text-text-primary mb-4">Supported Formats</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <DocumentTextIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-sm font-medium text-text-primary">CSV</div>
            <div className="text-xs text-text-secondary">Comma separated</div>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <DocumentTextIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-sm font-medium text-text-primary">TSV</div>
            <div className="text-xs text-text-secondary">Tab separated</div>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <DocumentTextIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-sm font-medium text-text-primary">JSON</div>
            <div className="text-xs text-text-secondary">Structured data</div>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <DocumentTextIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-sm font-medium text-text-primary">TXT</div>
            <div className="text-xs text-text-secondary">Plain text</div>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-info-light rounded-lg">
          <p className="text-sm text-info">
            <strong>Tip:</strong> For best results, format your file with "Front" and "Back" columns. 
            You can also include optional "Hint" and "Tags" columns.
          </p>
        </div>
      </div>

      {/* Examples */}
      <div className="bg-surface-elevated rounded-lg p-6">
        <h4 className="font-semibold text-text-primary mb-4">Example Formats</h4>
        
        <div className="space-y-4">
          <div>
            <h5 className="text-sm font-medium text-text-primary mb-2">CSV Example:</h5>
            <div className="bg-background rounded border p-3 font-mono text-sm text-text-secondary">
              Front,Back,Hint<br/>
              "What is 2+2?","4","Basic math"<br/>
              "Capital of France","Paris","European city"
            </div>
          </div>
          
          <div>
            <h5 className="text-sm font-medium text-text-primary mb-2">JSON Example:</h5>
            <div className="bg-background rounded border p-3 font-mono text-sm text-text-secondary">
              [<br/>
              &nbsp;&nbsp;{"{"}"front": "What is 2+2?", "back": "4", "hint": "Basic math"{"}"}<br/>
              &nbsp;&nbsp;{"{"}"front": "Capital of France", "back": "Paris"{"}"}<br/>
              ]
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;