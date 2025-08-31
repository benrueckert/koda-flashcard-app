/**
 * Format Detector Component
 * 
 * Automatically detects file format and shows preview with confidence.
 */

import { useState, useEffect } from 'react';
import { Button } from '../ui';
import { CheckCircleIcon, ExclamationTriangleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface FormatDetectorProps {
  file: File;
  content: string;
  onFormatDetected: (format: any) => void;
  onBack: () => void;
}

interface DetectionResult {
  detectedFormat: string;
  confidence: number;
  suggestions: any;
  preview: string[];
  delimiter?: string;
  hasHeader?: boolean;
  encoding?: string;
}

const FormatDetector: React.FC<FormatDetectorProps> = ({ 
  file, 
  content, 
  onFormatDetected, 
  onBack 
}) => {
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(true);
  const [manualFormat, setManualFormat] = useState<string>('');

  useEffect(() => {
    detectFormat();
  }, [file, content]);

  const detectFormat = () => {
    setIsDetecting(true);
    
    // Simulate the backend format detection logic
    setTimeout(() => {
      const result = performFormatDetection(file, content);
      setDetection(result);
      setIsDetecting(false);
    }, 1000);
  };

  const performFormatDetection = (file: File, content: string): DetectionResult => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const sample = content.substring(0, 10240); // 10KB sample
    const lines = sample.split('\n').filter(line => line.trim());

    // JSON Detection
    if (extension === 'json' || content.trim().startsWith('[') || content.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(sample);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const firstItem = parsed[0];
          const hasFlashcardFields = Object.keys(firstItem).some(key => 
            ['front', 'back', 'question', 'answer', 'term', 'definition'].includes(key.toLowerCase())
          );
          
          return {
            detectedFormat: 'json',
            confidence: hasFlashcardFields ? 0.95 : 0.7,
            suggestions: {
              columnMappings: suggestJSONMappings(firstItem)
            },
            preview: parsed.slice(0, 3).map(item => JSON.stringify(item, null, 2))
          };
        }
      } catch {
        // Not valid JSON, try other formats
      }
    }

    // CSV/TSV Detection
    const delimiters = [',', ';', '\t', '|'];
    let bestDelimiter = ',';
    let bestScore = 0;
    let isTabSeparated = false;

    for (const delimiter of delimiters) {
      const score = scoreDelimiter(lines, delimiter);
      if (score > bestScore) {
        bestScore = score;
        bestDelimiter = delimiter;
        isTabSeparated = delimiter === '\t';
      }
    }

    // Check for header
    const hasHeader = detectCSVHeader(lines, bestDelimiter);
    
    // Determine format confidence
    let confidence = Math.min(0.9, bestScore);
    let detectedFormat = 'csv';
    
    if (isTabSeparated) {
      detectedFormat = 'tsv';
      // Check for Quizlet patterns
      if (file.name.toLowerCase().includes('quizlet') || 
          sample.includes('# Quizlet') || 
          sample.includes('Created by')) {
        detectedFormat = 'quizlet';
        confidence = Math.min(0.95, confidence + 0.2);
      }
    }

    // Plain text detection
    if (confidence < 0.5) {
      const textPatterns = [
        /^Q:\s*(.+)$/gm,
        /^(\d+)\.\s*(.+)$/gm,
        /^(.+)\?\s*$/gm,
        /^(.+)\s*-\s*(.+)$/gm
      ];

      for (const pattern of textPatterns) {
        const matches = sample.match(pattern);
        if (matches && matches.length > lines.length * 0.3) {
          detectedFormat = 'txt';
          confidence = 0.8;
          break;
        }
      }
    }

    return {
      detectedFormat,
      confidence,
      delimiter: bestDelimiter,
      hasHeader,
      encoding: 'utf8',
      suggestions: {
        columnMappings: suggestCSVMappings(lines[hasHeader ? 0 : 1], bestDelimiter, hasHeader)
      },
      preview: lines.slice(0, 5)
    };
  };

  const scoreDelimiter = (lines: string[], delimiter: string): number => {
    let score = 0;
    let consistentColumnCount = true;
    let columnCount = -1;

    for (const line of lines.slice(0, Math.min(10, lines.length))) {
      const columns = line.split(delimiter);
      
      if (columnCount === -1) {
        columnCount = columns.length;
      } else if (columns.length !== columnCount) {
        consistentColumnCount = false;
      }
      
      score += columns.length > 1 ? 0.1 : 0;
    }

    if (consistentColumnCount && columnCount > 1) {
      score += 0.5;
    }

    return Math.min(1.0, score);
  };

  const detectCSVHeader = (lines: string[], delimiter: string): boolean => {
    if (lines.length < 2) return false;

    const firstLine = lines[0].split(delimiter);
    const secondLine = lines[1].split(delimiter);

    const firstLineNumeric = firstLine.every(col => !isNaN(Number(col.trim())));
    const secondLineNumeric = secondLine.every(col => !isNaN(Number(col.trim())));

    return !firstLineNumeric && (secondLineNumeric || firstLine.length === secondLine.length);
  };

  const suggestCSVMappings = (headerLine: string, delimiter: string, hasHeaders: boolean) => {
    if (!headerLine) return {};
    
    const columns = headerLine.split(delimiter);
    const mappings: any = {};

    for (let i = 0; i < columns.length; i++) {
      const column = columns[i].toLowerCase().trim();
      
      if (column.includes('front') || column.includes('question') || column.includes('term') || column.includes('prompt')) {
        mappings.front = { source: `column_${i}`, transform: 'trim' };
      }
      else if (column.includes('back') || column.includes('answer') || column.includes('definition') || column.includes('response')) {
        mappings.back = { source: `column_${i}`, transform: 'trim' };
      }
      else if (column.includes('hint') || column.includes('clue') || column.includes('note')) {
        mappings.hint = { source: `column_${i}`, transform: 'trim', optional: true };
      }
      else if (column.includes('tag') || column.includes('category') || column.includes('topic')) {
        mappings.tags = { source: `column_${i}`, transform: 'split', delimiter: ';', optional: true };
      }
    }

    // Default mappings if no headers detected
    if (!hasHeaders && columns.length >= 2) {
      mappings.front = { source: 'column_0', transform: 'trim' };
      mappings.back = { source: 'column_1', transform: 'trim' };
      if (columns.length >= 3) {
        mappings.hint = { source: 'column_2', transform: 'trim', optional: true };
      }
    }

    return mappings;
  };

  const suggestJSONMappings = (item: any) => {
    const mappings: any = {};
    const keys = Object.keys(item);

    for (const key of keys) {
      const lowerKey = key.toLowerCase();
      
      if (lowerKey.includes('front') || lowerKey.includes('question') || lowerKey.includes('term')) {
        mappings.front = { source: key, transform: 'trim' };
      }
      else if (lowerKey.includes('back') || lowerKey.includes('answer') || lowerKey.includes('definition')) {
        mappings.back = { source: key, transform: 'trim' };
      }
      else if (lowerKey.includes('hint') || lowerKey.includes('clue')) {
        mappings.hint = { source: key, transform: 'trim', optional: true };
      }
      else if (lowerKey.includes('tag') || lowerKey.includes('category')) {
        mappings.tags = { source: key, transform: 'split', delimiter: ';', optional: true };
      }
    }

    return mappings;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
    return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />;
  };

  const handleContinue = () => {
    if (detection) {
      const format = manualFormat || detection.detectedFormat;
      onFormatDetected({
        ...detection,
        detectedFormat: format
      });
    }
  };

  if (isDetecting) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 border-4 border-koda-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h3 className="text-xl font-semibold text-text-primary mb-2">
          Analyzing File Format
        </h3>
        <p className="text-text-secondary">
          Detecting format and structure of your file...
        </p>
      </div>
    );
  }

  if (!detection) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-text-primary mb-4">
          Format Detection Failed
        </h3>
        <p className="text-text-secondary mb-6">
          Unable to automatically detect the file format.
        </p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Try Another File
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Detection Results */}
      <div className="bg-surface-elevated rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Format Detection Results</h3>
          <div className="flex items-center gap-2">
            {getConfidenceIcon(detection.confidence)}
            <span className={`font-semibold ${getConfidenceColor(detection.confidence)}`}>
              {Math.round(detection.confidence * 100)}% confidence
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-text-primary mb-3">Detected Format</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-text-secondary">Format:</span>
                <span className="font-medium text-text-primary uppercase">{detection.detectedFormat}</span>
              </div>
              {detection.delimiter && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Delimiter:</span>
                  <span className="font-mono bg-background px-2 py-1 rounded text-sm">
                    {detection.delimiter === '\t' ? 'TAB' : detection.delimiter}
                  </span>
                </div>
              )}
              {detection.hasHeader !== undefined && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Has Header:</span>
                  <span className="font-medium">{detection.hasHeader ? 'Yes' : 'No'}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-secondary">Encoding:</span>
                <span className="font-medium">{detection.encoding}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-text-primary mb-3">File Information</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-text-secondary">Name:</span>
                <span className="font-medium text-text-primary truncate max-w-[200px]">{file.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Size:</span>
                <span className="font-medium">{(file.size / 1024).toFixed(1)} KB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Lines:</span>
                <span className="font-medium">{content.split('\n').filter(l => l.trim()).length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Format Override */}
      {detection.confidence < 0.8 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 mb-2">Low Confidence Detection</h4>
          <p className="text-yellow-700 text-sm mb-3">
            The automatic detection has low confidence. You can manually select the format:
          </p>
          <select
            value={manualFormat}
            onChange={(e) => setManualFormat(e.target.value)}
            className="w-full p-2 border border-yellow-300 rounded-lg bg-white"
          >
            <option value="">Use detected format ({detection.detectedFormat.toUpperCase()})</option>
            <option value="csv">CSV (Comma Separated)</option>
            <option value="tsv">TSV (Tab Separated)</option>
            <option value="json">JSON</option>
            <option value="txt">Plain Text</option>
          </select>
        </div>
      )}

      {/* Preview */}
      <div className="bg-surface-elevated rounded-lg p-6">
        <h4 className="font-medium text-text-primary mb-3">File Preview</h4>
        <div className="bg-background rounded border p-4 max-h-48 overflow-auto">
          <pre className="text-sm text-text-secondary font-mono whitespace-pre-wrap">
            {detection.preview.join('\n')}
          </pre>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleContinue}>
          Continue to Mapping
        </Button>
      </div>
    </div>
  );
};

export default FormatDetector;