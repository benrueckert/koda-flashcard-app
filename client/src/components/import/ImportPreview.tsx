/**
 * Import Preview Component
 * 
 * Shows preview of cards to be imported with validation results.
 */

import { useState, useEffect } from 'react';
import { Button } from '../ui';
import { ArrowLeftIcon, ExclamationTriangleIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ImportPreviewProps {
  mappings: any;
  format: any;
  content: string | null;
  onConfirm: (previewData: any) => void;
  onBack: () => void;
}

interface PreviewCard {
  front: string;
  back: string;
  hint?: string;
  tags?: string[];
  rowNumber: number;
  hasErrors: boolean;
  hasWarnings: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationWarning {
  field: string;
  message: string;
}

interface PreviewData {
  cards: PreviewCard[];
  summary: {
    total: number;
    valid: number;
    errors: number;
    warnings: number;
    duplicates: number;
  };
}

const ImportPreview: React.FC<ImportPreviewProps> = ({ 
  mappings, 
  format, 
  content, 
  onConfirm, 
  onBack 
}) => {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllCards, setShowAllCards] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'errors' | 'warnings' | 'valid'>('all');

  useEffect(() => {
    generatePreview();
  }, [mappings, format, content]);

  const generatePreview = async () => {
    setIsLoading(true);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const preview = await processFileContent();
      setPreviewData(preview);
    } catch (error) {
      console.error('Preview generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processFileContent = async (): Promise<PreviewData> => {
    if (!content) throw new Error('No content to process');

    const cards: PreviewCard[] = [];
    const seenContent = new Set<string>();
    let duplicateCount = 0;

    if (format.detectedFormat === 'json') {
      const parsed = JSON.parse(content);
      
      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        const card = mapObjectToCard(item, mappings, i + 1);
        const { errors, warnings } = validateCard(card);
        
        // Check for duplicates
        const contentKey = `${card.front.toLowerCase().trim()}|||${card.back.toLowerCase().trim()}`;
        if (seenContent.has(contentKey)) {
          warnings.push({
            field: 'content',
            message: 'Duplicate content detected'
          });
          duplicateCount++;
        } else {
          seenContent.add(contentKey);
        }
        
        cards.push({
          ...card,
          hasErrors: errors.length > 0,
          hasWarnings: warnings.length > 0,
          errors,
          warnings
        });
      }
    } else {
      // CSV/TSV processing
      const lines = content.split('\n').filter(line => line.trim());
      const delimiter = format.delimiter || ',';
      const hasHeader = format.hasHeader;
      const dataLines = hasHeader ? lines.slice(1) : lines;

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        const columns = parseCSVLine(line, delimiter);
        const card = mapColumnsToCard(columns, mappings, i + (hasHeader ? 2 : 1));
        const { errors, warnings } = validateCard(card);
        
        // Check for duplicates
        const contentKey = `${card.front.toLowerCase().trim()}|||${card.back.toLowerCase().trim()}`;
        if (seenContent.has(contentKey)) {
          warnings.push({
            field: 'content',
            message: 'Duplicate content detected'
          });
          duplicateCount++;
        } else {
          seenContent.add(contentKey);
        }
        
        cards.push({
          ...card,
          hasErrors: errors.length > 0,
          hasWarnings: warnings.length > 0,
          errors,
          warnings
        });
      }
    }

    const summary = {
      total: cards.length,
      valid: cards.filter(card => !card.hasErrors && !card.hasWarnings).length,
      errors: cards.filter(card => card.hasErrors).length,
      warnings: cards.filter(card => card.hasWarnings && !card.hasErrors).length,
      duplicates: duplicateCount
    };

    return { cards, summary };
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

  const mapColumnsToCard = (columns: string[], mappings: any, rowNumber: number): PreviewCard => {
    const card: PreviewCard = {
      front: '',
      back: '',
      rowNumber,
      hasErrors: false,
      hasWarnings: false,
      errors: [],
      warnings: []
    };

    if (mappings.front) {
      const columnIndex = parseInt(mappings.front.source.replace('column_', ''));
      card.front = transformValue(columns[columnIndex] || '', mappings.front);
    }

    if (mappings.back) {
      const columnIndex = parseInt(mappings.back.source.replace('column_', ''));
      card.back = transformValue(columns[columnIndex] || '', mappings.back);
    }

    if (mappings.hint) {
      const columnIndex = parseInt(mappings.hint.source.replace('column_', ''));
      const value = transformValue(columns[columnIndex] || '', mappings.hint);
      if (value) card.hint = value;
    }

    if (mappings.tags) {
      const columnIndex = parseInt(mappings.tags.source.replace('column_', ''));
      const value = transformValue(columns[columnIndex] || '', mappings.tags);
      if (value) {
        const delimiter = mappings.tags.delimiter || ';';
        card.tags = value.split(delimiter).map(tag => tag.trim()).filter(Boolean);
      }
    }

    return card;
  };

  const mapObjectToCard = (obj: any, mappings: any, rowNumber: number): PreviewCard => {
    const card: PreviewCard = {
      front: '',
      back: '',
      rowNumber,
      hasErrors: false,
      hasWarnings: false,
      errors: [],
      warnings: []
    };

    if (mappings.front) {
      card.front = transformValue(obj[mappings.front.source] || '', mappings.front);
    }

    if (mappings.back) {
      card.back = transformValue(obj[mappings.back.source] || '', mappings.back);
    }

    if (mappings.hint) {
      const value = transformValue(obj[mappings.hint.source] || '', mappings.hint);
      if (value) card.hint = value;
    }

    if (mappings.tags) {
      const value = transformValue(obj[mappings.tags.source] || '', mappings.tags);
      if (value) {
        const delimiter = mappings.tags.delimiter || ';';
        card.tags = value.split(delimiter).map(tag => tag.trim()).filter(Boolean);
      }
    }

    return card;
  };

  const transformValue = (value: any, mapping: any): string => {
    let result = String(value || '');

    switch (mapping.transform) {
      case 'trim':
        result = result.trim();
        break;
      case 'lowercase':
        result = result.toLowerCase();
        break;
      case 'uppercase':
        result = result.toUpperCase();
        break;
      case 'html_decode':
        result = decodeHTMLEntities(result);
        break;
    }

    return result;
  };

  const decodeHTMLEntities = (text: string): string => {
    const entities: { [key: string]: string } = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' '
    };
    
    return text.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
  };

  const validateCard = (card: PreviewCard): { errors: ValidationError[], warnings: ValidationWarning[] } => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required field validation
    if (!card.front || card.front.trim().length === 0) {
      errors.push({
        field: 'front',
        message: 'Front content is required',
        severity: 'error'
      });
    }

    if (!card.back || card.back.trim().length === 0) {
      errors.push({
        field: 'back',
        message: 'Back content is required',
        severity: 'error'
      });
    }

    // Length validation
    const maxLength = 5000;
    if (card.front && card.front.length > maxLength) {
      errors.push({
        field: 'front',
        message: `Front content exceeds maximum length (${maxLength} characters)`,
        severity: 'error'
      });
    }

    if (card.back && card.back.length > maxLength) {
      errors.push({
        field: 'back',
        message: `Back content exceeds maximum length (${maxLength} characters)`,
        severity: 'error'
      });
    }

    // Content quality warnings
    if (card.front && card.front.length < 3) {
      warnings.push({
        field: 'front',
        message: 'Front content is very short'
      });
    }

    if (card.back && card.back.length < 2) {
      warnings.push({
        field: 'back',
        message: 'Back content is very short'
      });
    }

    return { errors, warnings };
  };

  const getFilteredCards = () => {
    if (!previewData) return [];
    
    const cards = showAllCards ? previewData.cards : previewData.cards.slice(0, 10);
    
    switch (filterType) {
      case 'errors':
        return cards.filter(card => card.hasErrors);
      case 'warnings':
        return cards.filter(card => card.hasWarnings && !card.hasErrors);
      case 'valid':
        return cards.filter(card => !card.hasErrors && !card.hasWarnings);
      default:
        return cards;
    }
  };

  const handleConfirm = () => {
    if (previewData) {
      onConfirm({
        cards: previewData.cards,
        summary: previewData.summary,
        mappings,
        format
      });
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 border-4 border-koda-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h3 className="text-xl font-semibold text-text-primary mb-2">
          Generating Preview
        </h3>
        <p className="text-text-secondary">
          Processing your file and validating card content...
        </p>
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-text-primary mb-4">
          Preview Generation Failed
        </h3>
        <p className="text-text-secondary mb-6">
          Unable to generate preview. Please check your file format and mappings.
        </p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Mapping
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-surface-elevated rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Import Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-text-primary">{previewData.summary.total}</div>
            <div className="text-sm text-text-secondary">Total Cards</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{previewData.summary.valid}</div>
            <div className="text-sm text-text-secondary">Valid</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{previewData.summary.warnings}</div>
            <div className="text-sm text-text-secondary">Warnings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{previewData.summary.errors}</div>
            <div className="text-sm text-text-secondary">Errors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{previewData.summary.duplicates}</div>
            <div className="text-sm text-text-secondary">Duplicates</div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">Show:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="p-2 border border-border rounded-lg bg-white text-sm"
          >
            <option value="all">All Cards</option>
            <option value="valid">Valid Only</option>
            <option value="warnings">Warnings Only</option>
            <option value="errors">Errors Only</option>
          </select>
        </div>
        
        {previewData.cards.length > 10 && (
          <button
            onClick={() => setShowAllCards(!showAllCards)}
            className="text-sm text-koda-primary hover:text-koda-primary-dark"
          >
            {showAllCards ? 'Show First 10' : `Show All ${previewData.cards.length} Cards`}
          </button>
        )}
      </div>

      {/* Cards Preview */}
      <div className="space-y-4">
        {getFilteredCards().map((card) => (
          <div key={card.rowNumber} className={`border rounded-lg p-4 ${
            card.hasErrors 
              ? 'border-red-200 bg-red-50' 
              : card.hasWarnings 
              ? 'border-yellow-200 bg-yellow-50'
              : 'border-border bg-surface-elevated'
          }`}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-medium text-text-secondary">Row {card.rowNumber}</span>
              <div className="flex items-center gap-2">
                {card.hasErrors && (
                  <div className="flex items-center gap-1 text-red-600">
                    <XMarkIcon className="w-4 h-4" />
                    <span className="text-xs">Error</span>
                  </div>
                )}
                {card.hasWarnings && !card.hasErrors && (
                  <div className="flex items-center gap-1 text-yellow-600">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    <span className="text-xs">Warning</span>
                  </div>
                )}
                {!card.hasErrors && !card.hasWarnings && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span className="text-xs">Valid</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-3">
              <div>
                <div className="text-sm font-medium text-text-secondary mb-1">Front</div>
                <div className="text-text-primary bg-white rounded p-2 border border-border-light">
                  {card.front || <span className="text-text-muted italic">Empty</span>}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-text-secondary mb-1">Back</div>
                <div className="text-text-primary bg-white rounded p-2 border border-border-light">
                  {card.back || <span className="text-text-muted italic">Empty</span>}
                </div>
              </div>
            </div>

            {(card.hint || card.tags) && (
              <div className="grid md:grid-cols-2 gap-4 mb-3">
                {card.hint && (
                  <div>
                    <div className="text-sm font-medium text-text-secondary mb-1">Hint</div>
                    <div className="text-text-primary bg-white rounded p-2 border border-border-light text-sm">
                      {card.hint}
                    </div>
                  </div>
                )}
                {card.tags && card.tags.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-text-secondary mb-1">Tags</div>
                    <div className="flex flex-wrap gap-1">
                      {card.tags.map((tag, index) => (
                        <span key={index} className="bg-koda-primary/10 text-koda-primary px-2 py-1 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Errors and Warnings */}
            {(card.errors.length > 0 || card.warnings.length > 0) && (
              <div className="space-y-2">
                {card.errors.map((error, index) => (
                  <div key={`error-${index}`} className="text-sm text-red-600 flex items-center gap-2">
                    <XMarkIcon className="w-4 h-4" />
                    <span><strong>{error.field}:</strong> {error.message}</span>
                  </div>
                ))}
                {card.warnings.map((warning, index) => (
                  <div key={`warning-${index}`} className="text-sm text-yellow-600 flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    <span><strong>{warning.field}:</strong> {warning.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Mapping
        </Button>
        <Button 
          onClick={handleConfirm} 
          disabled={previewData.summary.errors > 0}
          className="flex items-center gap-2"
        >
          {previewData.summary.errors > 0 ? (
            <>
              <XMarkIcon className="w-4 h-4" />
              Fix Errors First
            </>
          ) : (
            <>
              <CheckCircleIcon className="w-4 h-4" />
              Import {previewData.summary.total} Cards
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ImportPreview;