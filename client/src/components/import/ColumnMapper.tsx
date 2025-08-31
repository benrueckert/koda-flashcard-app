/**
 * Column Mapper Component
 * 
 * Interactive interface for mapping file columns to flashcard fields.
 */

import { useState, useEffect } from 'react';
import { Button } from '../ui';
import { ArrowLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface ColumnMapperProps {
  format: any;
  content: string | null;
  onMappingComplete: (mappings: any) => void;
  onBack: () => void;
}

interface FieldMapping {
  source: string;
  transform?: string;
  delimiter?: string;
  optional?: boolean;
  defaultValue?: string;
}

interface MappingState {
  front: FieldMapping | null;
  back: FieldMapping | null;
  hint: FieldMapping | null;
  tags: FieldMapping | null;
}

const ColumnMapper: React.FC<ColumnMapperProps> = ({ 
  format, 
  content, 
  onMappingComplete, 
  onBack 
}) => {
  const [mappings, setMappings] = useState<MappingState>({
    front: null,
    back: null,
    hint: null,
    tags: null
  });
  const [columns, setColumns] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<string[][]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    parseColumns();
    applySuggestedMappings();
  }, [format, content]);

  const parseColumns = () => {
    if (!content) return;

    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return;

    if (format.detectedFormat === 'json') {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const firstItem = parsed[0];
          setColumns(Object.keys(firstItem));
          setSampleRows(parsed.slice(0, 3).map(item => Object.values(item).map(String)));
        }
      } catch (e) {
        console.error('Failed to parse JSON:', e);
      }
    } else {
      // CSV/TSV format
      const delimiter = format.delimiter || ',';
      const hasHeader = format.hasHeader;
      
      if (hasHeader && lines.length > 0) {
        const headerColumns = parseCSVLine(lines[0], delimiter);
        setColumns(headerColumns);
        
        const dataLines = lines.slice(1, 4); // Get 3 sample rows
        const sampleData = dataLines.map(line => parseCSVLine(line, delimiter));
        setSampleRows(sampleData);
      } else {
        // No header, generate column names
        const firstLine = parseCSVLine(lines[0], delimiter);
        const generatedColumns = firstLine.map((_, index) => `Column ${index + 1}`);
        setColumns(generatedColumns);
        
        const sampleData = lines.slice(0, 3).map(line => parseCSVLine(line, delimiter));
        setSampleRows(sampleData);
      }
    }
  };

  const parseCSVLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const applySuggestedMappings = () => {
    if (format.suggestions && format.suggestions.columnMappings) {
      const suggested = format.suggestions.columnMappings;
      setMappings({
        front: suggested.front || null,
        back: suggested.back || null,
        hint: suggested.hint || null,
        tags: suggested.tags || null
      });
    }
  };

  const updateMapping = (field: keyof MappingState, mapping: FieldMapping | null) => {
    setMappings(prev => ({
      ...prev,
      [field]: mapping
    }));
    
    // Clear errors when mapping is updated
    setErrors(prev => prev.filter(error => !error.includes(field)));
  };

  const validateMappings = (): string[] => {
    const newErrors: string[] = [];

    if (!mappings.front) {
      newErrors.push('Front field mapping is required');
    }
    if (!mappings.back) {
      newErrors.push('Back field mapping is required');
    }

    // Check for duplicate mappings
    const usedSources = Object.values(mappings)
      .filter(mapping => mapping !== null)
      .map(mapping => mapping!.source);
    
    const duplicates = usedSources.filter((source, index) => usedSources.indexOf(source) !== index);
    if (duplicates.length > 0) {
      newErrors.push(`Duplicate column mapping detected: ${duplicates.join(', ')}`);
    }

    return newErrors;
  };

  const handleContinue = () => {
    const validationErrors = validateMappings();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Filter out null mappings and format for backend
    const finalMappings = Object.entries(mappings)
      .filter(([_, mapping]) => mapping !== null)
      .reduce((acc, [field, mapping]) => {
        acc[field] = mapping;
        return acc;
      }, {} as any);

    onMappingComplete(finalMappings);
  };

  const getColumnSource = (columnIndex: number): string => {
    if (format.detectedFormat === 'json') {
      return columns[columnIndex];
    } else {
      return `column_${columnIndex}`;
    }
  };

  const renderFieldMapper = (
    fieldName: keyof MappingState,
    displayName: string,
    required: boolean = false,
    description?: string
  ) => {
    const currentMapping = mappings[fieldName];
    
    return (
      <div className="border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-medium text-text-primary">
              {displayName}
              {required && <span className="text-red-500 ml-1">*</span>}
            </h4>
            {description && (
              <p className="text-sm text-text-secondary mt-1">{description}</p>
            )}
          </div>
          {currentMapping && (
            <button
              onClick={() => updateMapping(fieldName, null)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Clear
            </button>
          )}
        </div>

        <select
          value={currentMapping?.source || ''}
          onChange={(e) => {
            if (e.target.value) {
              updateMapping(fieldName, {
                source: e.target.value,
                transform: 'trim'
              });
            } else {
              updateMapping(fieldName, null);
            }
          }}
          className="w-full p-2 border border-border rounded-lg bg-white"
        >
          <option value="">Select column...</option>
          {columns.map((column, index) => (
            <option key={index} value={getColumnSource(index)}>
              {column}
            </option>
          ))}
        </select>

        {currentMapping && (
          <div className="mt-3 space-y-2">
            <label className="block text-sm text-text-secondary">
              Transform:
              <select
                value={currentMapping.transform || 'trim'}
                onChange={(e) => {
                  updateMapping(fieldName, {
                    ...currentMapping,
                    transform: e.target.value
                  });
                }}
                className="ml-2 p-1 border border-border rounded text-xs"
              >
                <option value="trim">Trim whitespace</option>
                <option value="lowercase">Lowercase</option>
                <option value="uppercase">Uppercase</option>
                <option value="html_decode">Decode HTML</option>
                {fieldName === 'tags' && <option value="split">Split by delimiter</option>}
              </select>
            </label>

            {fieldName === 'tags' && currentMapping.transform === 'split' && (
              <label className="block text-sm text-text-secondary">
                Delimiter:
                <input
                  type="text"
                  value={currentMapping.delimiter || ';'}
                  onChange={(e) => {
                    updateMapping(fieldName, {
                      ...currentMapping,
                      delimiter: e.target.value
                    });
                  }}
                  className="ml-2 p-1 border border-border rounded text-xs w-16"
                  placeholder=";"
                />
              </label>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-info-light rounded-lg p-4">
        <h3 className="font-medium text-info mb-2">Column Mapping</h3>
        <p className="text-sm text-info">
          Map your file columns to flashcard fields. Front and Back are required fields. 
          Hint and Tags are optional but can enhance your study experience.
        </p>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-red-800 mb-2">Mapping Errors</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Column Preview */}
        <div>
          <h3 className="font-medium text-text-primary mb-4">File Columns Preview</h3>
          <div className="bg-surface-elevated rounded-lg p-4 max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {columns.map((column, index) => (
                    <th key={index} className="text-left p-2 font-medium text-text-primary">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-border-light">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="p-2 text-text-secondary max-w-[100px] truncate">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Field Mappings */}
        <div>
          <h3 className="font-medium text-text-primary mb-4">Field Mappings</h3>
          <div className="space-y-4">
            {renderFieldMapper(
              'front',
              'Front (Question)',
              true,
              'The front side of your flashcard - typically the question or prompt'
            )}
            
            {renderFieldMapper(
              'back',
              'Back (Answer)',
              true,
              'The back side of your flashcard - typically the answer or explanation'
            )}
            
            {renderFieldMapper(
              'hint',
              'Hint',
              false,
              'Optional hint to help remember the answer'
            )}
            
            {renderFieldMapper(
              'tags',
              'Tags',
              false,
              'Optional tags for organizing and categorizing cards'
            )}
          </div>
        </div>
      </div>

      {/* Mapping Summary */}
      {(mappings.front || mappings.back) && (
        <div className="bg-surface-elevated rounded-lg p-4">
          <h4 className="font-medium text-text-primary mb-3">Mapping Summary</h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            {Object.entries(mappings).map(([field, mapping]) => {
              if (!mapping) return null;
              
              const columnIndex = format.detectedFormat === 'json' 
                ? columns.indexOf(mapping.source)
                : parseInt(mapping.source.replace('column_', ''));
              
              const columnName = columns[columnIndex] || mapping.source;
              
              return (
                <div key={field} className="flex justify-between">
                  <span className="text-text-secondary capitalize">{field}:</span>
                  <span className="font-medium text-text-primary">{columnName}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleContinue} disabled={!mappings.front || !mappings.back}>
          Continue to Preview
        </Button>
      </div>
    </div>
  );
};

export default ColumnMapper;