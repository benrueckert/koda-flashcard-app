/**
 * Simplified Import Modal Component
 * 
 * Beautiful single-screen import with intelligent auto-detection.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button, KodaBear, MathRenderer } from '../ui';
import { 
  CloudArrowUpIcon, 
  XMarkIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  DocumentTextIcon,
  SparklesIcon,
  ArrowPathIcon,
  PencilIcon,
  PencilSquareIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  CpuChipIcon,
  LinkIcon,
  AcademicCapIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { ApiService } from '../../services';
import type { Deck } from '../../types';

interface ImportModalProps {
  deck: Deck;
  onClose: () => void;
  onImportComplete: () => void;
}

type ImportState = 'idle' | 'processing' | 'preview' | 'importing' | 'success' | 'error';

interface ParsedCard {
  front: string;
  back: string;
  hint?: string;
  tags?: string[];
  confidence: number;
  issues?: string[];
}

interface ImportData {
  cards: ParsedCard[];
  stats: {
    total: number;
    valid: number;
    withIssues: number;
    duplicates: number;
  };
  format: string;
}

const ImportModal: React.FC<ImportModalProps> = ({ deck, onClose, onImportComplete }) => {
  const [state, setState] = useState<ImportState>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [currentCard, setCurrentCard] = useState<string>('');
  const [currentIcon, setCurrentIcon] = useState<any>(null);
  const [editingCard, setEditingCard] = useState<number | null>(null);
  const [showAllCards, setShowAllCards] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setState('processing');
    setError('');
    setProgress(0);
    
    try {
      // Read file content
      const content = await readFileContent(file);
      
      // Smart parsing with auto-detection
      const parsed = await parseFileIntelligently(file, content);
      
      setImportData(parsed);
      setState('preview');
    } catch (err: any) {
      setError(err.message || 'Failed to process file');
      setState('error');
    }
  }, []);

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Validate file first
      if (file.size > 50 * 1024 * 1024) {
        reject(new Error('File too large. Please use files under 50MB.'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const parseFileIntelligently = async (file: File, content: string): Promise<ImportData> => {
    // Beautiful animated processing with realistic steps
    const steps = [
      { progress: 10, message: 'Reading your file...', icon: DocumentTextIcon, delay: 200 },
      { progress: 30, message: 'Detecting format...', icon: MagnifyingGlassIcon, delay: 300 },
      { progress: 50, message: 'Mapping columns intelligently...', icon: LinkIcon, delay: 400 },
      { progress: 75, message: 'Processing flashcards...', icon: CpuChipIcon, delay: 300 },
      { progress: 95, message: 'Checking for duplicates...', icon: CheckCircleIcon, delay: 200 }
    ];

    for (const step of steps) {
      setProgress(step.progress);
      setCurrentCard(step.message);
      setCurrentIcon(step.icon);
      await new Promise(resolve => setTimeout(resolve, step.delay));
    }
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    const lines = content.split('\n').filter(line => line.trim());
    
    let cards: ParsedCard[] = [];
    let format = 'unknown';
    
    // JSON detection and parsing
    if (extension === 'json' || content.trim().startsWith('[') || content.trim().startsWith('{')) {
      try {
        const data = JSON.parse(content);
        const items = Array.isArray(data) ? data : [data];
        format = 'JSON';
        
        cards = items.map((item, index) => {
          const card = smartMapObject(item);
          return {
            ...card,
            confidence: calculateConfidence(card),
            issues: validateCard(card)
          };
        });
      } catch {
        throw new Error('Invalid JSON format');
      }
    }
    // CSV/TSV detection and parsing
    else {
      const delimiter = detectDelimiter(lines);
      format = delimiter === '\t' ? 'TSV' : 'CSV';
      
      const hasHeader = detectHeader(lines, delimiter);
      const dataLines = hasHeader ? lines.slice(1) : lines;
      
      cards = dataLines.map((line, index) => {
        const columns = parseCSVLine(line, delimiter);
        const card = smartMapColumns(columns, hasHeader ? parseCSVLine(lines[0], delimiter) : null);
        return {
          ...card,
          confidence: calculateConfidence(card),
          issues: validateCard(card)
        };
      }).filter(card => card.front && card.back); // Only keep cards with both front and back
    }
    
    // Remove duplicates and calculate stats
    const seen = new Set<string>();
    const uniqueCards: ParsedCard[] = [];
    let duplicates = 0;
    
    for (const card of cards) {
      const key = `${card.front.toLowerCase().trim()}|||${card.back.toLowerCase().trim()}`;
      if (seen.has(key)) {
        duplicates++;
      } else {
        seen.add(key);
        uniqueCards.push(card);
      }
    }
    
    const stats = {
      total: uniqueCards.length,
      valid: uniqueCards.filter(c => c.issues?.length === 0).length,
      withIssues: uniqueCards.filter(c => c.issues && c.issues.length > 0).length,
      duplicates
    };
    
    return { cards: uniqueCards, stats, format };
  };

  const detectDelimiter = (lines: string[]): string => {
    const delimiters = [',', '\t', ';', '|'];
    const sampleLines = lines.slice(0, Math.min(10, lines.length));
    
    let bestDelimiter = ',';
    let bestScore = 0;
    
    for (const delimiter of delimiters) {
      let score = 0;
      let consistentColumnCount = true;
      let expectedColumns = -1;
      
      for (const line of sampleLines) {
        const columns = parseCSVLine(line, delimiter);
        
        // Skip empty lines
        if (line.trim().length === 0) continue;
        
        const columnCount = columns.length;
        
        if (expectedColumns === -1) {
          expectedColumns = columnCount;
        } else if (expectedColumns !== columnCount) {
          // Check if it's just a minor variation (±1)
          if (Math.abs(expectedColumns - columnCount) > 1) {
            consistentColumnCount = false;
            break;
          }
        }
        
        // Award points for reasonable column count (2-10 is ideal for flashcards)
        if (columnCount >= 2 && columnCount <= 10) {
          score += columnCount * 2;
        }
        
        // Award points for non-empty columns
        const nonEmptyColumns = columns.filter(col => col.trim().length > 0).length;
        score += nonEmptyColumns;
      }
      
      // Penalize inconsistent column counts
      if (!consistentColumnCount) {
        score = Math.floor(score * 0.3);
      }
      
      // Special handling for tabs (TSV files are common for flashcards)
      if (delimiter === '\t' && score > 0) {
        score = Math.floor(score * 1.2);
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestDelimiter = delimiter;
      }
    }
    
    return bestDelimiter;
  };

  const detectHeader = (lines: string[], delimiter: string): boolean => {
    if (lines.length < 2) return false;
    
    const firstLine = parseCSVLine(lines[0], delimiter);
    const secondLine = parseCSVLine(lines[1], delimiter);
    
    // Check if first line looks like headers (common flashcard terms)
    const commonHeaders = [
      'front', 'back', 'question', 'answer', 'term', 'definition', 
      'hint', 'note', 'tag', 'category', 'prompt', 'response',
      'word', 'meaning', 'concept', 'explanation', 'english', 
      'translation', 'q', 'a', 'card', 'side1', 'side2'
    ];
    
    const firstLineHasHeaders = firstLine.some(col => {
      const cleanCol = col.trim().toLowerCase();
      return commonHeaders.some(header => cleanCol.includes(header));
    });
    
    // Check if first line has mostly text vs numbers (headers are usually text)
    const firstLineNonNumeric = firstLine.filter(col => {
      const cleaned = col.trim();
      return cleaned.length > 0 && isNaN(Number(cleaned));
    }).length;
    
    const firstLineNumeric = firstLine.filter(col => {
      const cleaned = col.trim();
      return cleaned.length > 0 && !isNaN(Number(cleaned));
    }).length;
    
    // If first line is mostly non-numeric and has reasonable text, likely headers
    const likelyHeaders = firstLineNonNumeric > firstLineNumeric && 
                         firstLine.some(col => col.trim().length > 2);
    
    // Additional check: if first line has much shorter content than second line, likely headers
    const firstLineAvgLength = firstLine.reduce((sum, col) => sum + col.length, 0) / firstLine.length;
    const secondLineAvgLength = secondLine.reduce((sum, col) => sum + col.length, 0) / secondLine.length;
    
    const shortHeaders = firstLineAvgLength < secondLineAvgLength * 0.6 && 
                        firstLineAvgLength < 50;
    
    return firstLineHasHeaders || (likelyHeaders && !shortHeaders);
  };

  const parseCSVLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteCount = 0;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        quoteCount++;
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote inside quoted field
          current += '"';
          i++; // Skip next quote
          quoteCount++; // Count the skipped quote too
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        // Only split on delimiter when not inside quotes
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last field
    result.push(current.trim());
    
    // Clean up fields - remove surrounding quotes if they exist
    return result.map(field => {
      field = field.trim();
      // Remove surrounding quotes if the field starts and ends with quotes
      if (field.length >= 2 && field.startsWith('"') && field.endsWith('"')) {
        field = field.slice(1, -1);
        // Replace escaped quotes with single quotes
        field = field.replace(/""/g, '"');
      }
      return field;
    });
  };

  const smartMapObject = (obj: any): ParsedCard => {
    const keys = Object.keys(obj);
    let front = '', back = '', hint = '', tags: string[] = [];
    
    // Smart mapping based on key names
    for (const key of keys) {
      const lowerKey = key.toLowerCase();
      const value = String(obj[key] || '').trim();
      
      if (!front && (lowerKey.includes('front') || lowerKey.includes('question') || lowerKey.includes('term') || lowerKey.includes('prompt'))) {
        front = value;
      } else if (!back && (lowerKey.includes('back') || lowerKey.includes('answer') || lowerKey.includes('definition') || lowerKey.includes('response'))) {
        back = value;
      } else if (!hint && (lowerKey.includes('hint') || lowerKey.includes('clue') || lowerKey.includes('note'))) {
        hint = value;
      } else if (lowerKey.includes('tag') || lowerKey.includes('category')) {
        tags = value.split(/[;,|]/).map(t => t.trim()).filter(Boolean);
      }
    }
    
    // Fallback: use first two non-empty values
    if (!front || !back) {
      const values = Object.values(obj).map(v => String(v || '').trim()).filter(Boolean);
      if (!front && values[0]) front = values[0];
      if (!back && values[1]) back = values[1];
    }
    
    return { front, back, hint: hint || undefined, tags: tags.length > 0 ? tags : undefined };
  };

  const smartMapColumns = (columns: string[], headers?: string[] | null): ParsedCard => {
    let front = '', back = '', hint = '', tags: string[] = [];
    
    // Clean up columns - remove empty strings and trim
    const cleanColumns = columns.map(col => col.trim()).filter(col => col.length > 0);
    
    if (headers) {
      // Use header-based mapping
      for (let i = 0; i < Math.min(cleanColumns.length, headers.length); i++) {
        const header = headers[i].toLowerCase();
        const value = cleanColumns[i];
        
        if (!front && (header.includes('front') || header.includes('question') || header.includes('term'))) {
          front = value;
        } else if (!back && (header.includes('back') || header.includes('answer') || header.includes('definition'))) {
          back = value;
        } else if (!hint && (header.includes('hint') || header.includes('note'))) {
          hint = value;
        } else if (header.includes('tag') || header.includes('category')) {
          tags = value.split(/[;,|]/).map(t => t.trim()).filter(Boolean);
        }
      }
    }
    
    // Fallback: assume first two non-empty columns are front/back
    if (!front && cleanColumns[0]) front = cleanColumns[0];
    if (!back && cleanColumns[1]) back = cleanColumns[1];
    if (!hint && cleanColumns[2]) hint = cleanColumns[2];
    
    // Special handling for numbered lists and multi-part content
    if (back) {
      // If back looks like a numbered list start, check for more content in other columns
      if (/^\d+\./.test(back) && cleanColumns.length > 2) {
        // Look for more numbered items in subsequent columns
        const numberedItems = cleanColumns.slice(2).filter(col => /^\d+\./.test(col));
        if (numberedItems.length > 0) {
          back = [back, ...numberedItems].join(' ');
        }
      }
      
      // If back seems too short compared to front and there are more columns, combine them
      else if (back.length < 20 && cleanColumns.length > 2) {
        const remainingContent = cleanColumns.slice(2).filter(col => col.length > 5);
        if (remainingContent.length > 0) {
          back = [back, ...remainingContent].join(' ');
        }
      }
    }
    
    // If back is still empty but we have content in column 2+, use it
    if (!back && cleanColumns.length >= 2) {
      // Try to reconstruct back from multiple columns
      const backContent = cleanColumns.slice(1).join(' ').trim();
      if (backContent.length > 0) {
        back = backContent;
      }
    }
    
    return { front, back, hint: hint || undefined, tags: tags.length > 0 ? tags : undefined };
  };

  const calculateConfidence = (card: ParsedCard): number => {
    let confidence = 1.0;
    
    if (!card.front || card.front.length < 3) confidence -= 0.3;
    if (!card.back || card.back.length < 2) confidence -= 0.3;
    if (card.front === card.back) confidence -= 0.5;
    
    return Math.max(0, confidence);
  };

  const validateCard = (card: ParsedCard): string[] => {
    const issues: string[] = [];
    
    if (!card.front || card.front.trim().length === 0) {
      issues.push('Missing front content');
    }
    if (!card.back || card.back.trim().length === 0) {
      issues.push('Missing back content');
    }
    if (card.front === card.back) {
      issues.push('Front and back are identical');
    }
    if (card.front && card.front.length > 1000) {
      issues.push('Front content is very long');
    }
    if (card.back && card.back.length > 1000) {
      issues.push('Back content is very long');
    }
    
    return issues;
  };

  const handleImport = async () => {
    if (!importData) return;
    
    setState('importing');
    setProgress(0);
    
    try {
      const validCards = importData.cards.filter(card => card.issues?.length === 0);
      const batches = [];
      const batchSize = 50;
      
      for (let i = 0; i < validCards.length; i += batchSize) {
        batches.push(validCards.slice(i, i + batchSize));
      }
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        // Clean the card content for display - strip LaTeX for loading display
        const displayText = batch[0].front
          .replace(/\\[\[\(].*?\\[\]\)]/gs, '[Math]') // Replace display/inline math with [Math]
          .replace(/\$\$.*?\$\$/gs, '[Math]') // Replace $$ math with [Math]
          .replace(/\$.*?\$/gs, '[Math]') // Replace $ math with [Math]
          .substring(0, 40);
        setCurrentCard(displayText + (batch[0].front.length > 40 ? '...' : ''));
        
        const batchCards = batch.map(card => ({
          front: card.front,
          back: card.back,
          hint: card.hint,
          tags: card.tags ? card.tags.join(';') : undefined
        }));
        
        await ApiService.createBatchCards(deck.id, batchCards);
        
        const newProgress = Math.round(((i + 1) / batches.length) * 100);
        setProgress(newProgress);
        
        // Small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      setState('success');
      
    } catch (err: any) {
      setError(err.message || 'Import failed');
      setState('error');
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const updateCard = (index: number, field: string, value: string) => {
    if (!importData) return;
    
    const updatedCards = [...importData.cards];
    updatedCards[index] = { ...updatedCards[index], [field]: value };
    
    setImportData({
      ...importData,
      cards: updatedCards
    });
  };

  const deleteCard = (index: number) => {
    if (!importData) return;
    
    const updatedCards = [...importData.cards];
    updatedCards.splice(index, 1);
    
    // Recalculate stats
    const stats = {
      total: updatedCards.length,
      valid: updatedCards.filter(c => c.issues?.length === 0).length,
      withIssues: updatedCards.filter(c => c.issues && c.issues.length > 0).length,
      duplicates: importData.stats.duplicates
    };
    
    setImportData({
      ...importData,
      cards: updatedCards,
      stats
    });
  };

  const reset = () => {
    setState('idle');
    setImportData(null);
    setError('');
    setProgress(0);
    setCurrentCard('');
    setEditingCard(null);
    setShowAllCards(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-3 sm:p-4 lg:p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div className="flex items-center flex-1 min-w-0 mr-3">
              <KodaBear size="sm" expression="default" className="mr-2 sm:mr-3 flex-shrink-0" />
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-display font-bold text-text-primary">
                  Import Flashcards
                </h2>
                <p className="text-sm text-text-secondary mt-1 truncate">
                  Add to "{deck.name}"
                </p>
                <p className="text-xs text-text-muted">
                  CSV, JSON, TSV
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-error transition-colors rounded-lg hover:bg-surface-elevated min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Main Content */}
          {state === 'idle' && (
            <div className="space-y-6">
              {/* Drag & Drop Area */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all duration-300 ${
                  isDragging
                    ? 'border-koda-primary bg-koda-primary/5 scale-105'
                    : 'border-border hover:border-koda-primary/50 hover:bg-koda-primary/5'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.json,.txt"
                  onChange={handleFileInput}
                  className="hidden"
                />
                
                <div className="space-y-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-koda-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <CloudArrowUpIcon className="w-8 h-8 sm:w-10 sm:h-10 text-koda-primary" />
                  </div>
                  
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-text-primary mb-2">
                      Drop file or click to browse
                    </h3>
                    <p className="text-text-secondary text-sm sm:text-base mb-4">
                      Auto-detects format and imports cards
                    </p>
                    
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      size="lg"
                      className="px-6 py-3 text-base font-semibold min-h-[48px]"
                    >
                      <DocumentTextIcon className="w-5 h-5 mr-2" />
                      Choose File
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Supported Formats - Compact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-surface-elevated rounded-lg p-3 sm:p-4 text-center">
                  <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center mx-auto mb-2">
                    <DocumentTextIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-text-primary mb-1 text-sm">CSV Files</h4>
                  <p className="text-xs text-text-secondary">Auto column detection</p>
                </div>
                
                <div className="bg-surface-elevated rounded-lg p-3 sm:p-4 text-center">
                  <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center mx-auto mb-2">
                    <DocumentTextIcon className="w-4 h-4 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-text-primary mb-1 text-sm">JSON Files</h4>
                  <p className="text-xs text-text-secondary">Smart field mapping</p>
                </div>
                
                <div className="bg-surface-elevated rounded-lg p-3 sm:p-4 text-center">
                  <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center mx-auto mb-2">
                    <DocumentTextIcon className="w-4 h-4 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-text-primary mb-1 text-sm">TSV Files</h4>
                  <p className="text-xs text-text-secondary">Anki, Quizlet exports</p>
                </div>
              </div>
            </div>
          )}

          {state === 'processing' && (
            <div className="text-center py-20 space-y-8">
              {/* Dynamic Icon */}
              <div className="relative">
                {currentIcon && (
                  <div className="w-16 h-16 mx-auto flex items-center justify-center">
                    {React.createElement(currentIcon, { className: "w-12 h-12 text-koda-primary animate-pulse" })}
                  </div>
                )}
              </div>
              
              {/* Progress Bar */}
              <div className="max-w-sm mx-auto space-y-4">
                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-koda-primary rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                
                {/* Current Step */}
                <h3 className="text-lg font-medium text-text-primary">
                  {currentCard}
                </h3>
              </div>
            </div>
          )}


          {state === 'preview' && importData && (
            <div className="space-y-8">
              {/* Stats Summary */}
              <div className="bg-surface-elevated rounded-xl p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-text-primary mb-4">
                  Import Preview • {importData.format} Format Detected
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary">{importData.stats.total}</div>
                    <div className="text-xs sm:text-sm text-text-secondary">Total Cards</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600">{importData.stats.valid}</div>
                    <div className="text-xs sm:text-sm text-text-secondary">Ready to Import</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-600">{importData.stats.withIssues}</div>
                    <div className="text-xs sm:text-sm text-text-secondary">Need Review</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600">{importData.stats.duplicates}</div>
                    <div className="text-xs sm:text-sm text-text-secondary">Duplicates Removed</div>
                  </div>
                </div>
              </div>
              
              {/* Cards Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-text-primary">Cards Preview</h4>
                  {importData.cards.length > 5 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAllCards(!showAllCards)}
                      className="text-sm"
                    >
                      {showAllCards ? (
                        <>
                          <ChevronUpIcon className="w-4 h-4 mr-1" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDownIcon className="w-4 h-4 mr-1" />
                          Show All ({importData.cards.length})
                        </>
                      )}
                    </Button>
                  )}
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(showAllCards ? importData.cards : importData.cards.slice(0, 5)).map((card, index) => (
                    <div 
                      key={index} 
                      className={`border rounded-lg p-3 sm:p-4 transition-all overflow-hidden ${
                        card.issues && card.issues.length > 0 
                          ? 'border-yellow-300 bg-yellow-50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <span className="text-xs text-gray-500 font-medium flex-shrink-0">Card {index + 1}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {card.issues && card.issues.length > 0 && (
                            <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full whitespace-nowrap">
                              Needs Review
                            </span>
                          )}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingCard(editingCard === index ? null : index)}
                              className="text-gray-500 hover:text-gray-700 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
                            >
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteCard(index)}
                              className="text-red-500 hover:text-red-700 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center rounded hover:bg-red-100 transition-colors"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {editingCard === index ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Front</label>
                            <textarea
                              value={card.front}
                              onChange={(e) => updateCard(index, 'front', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none"
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Back</label>
                            <textarea
                              value={card.back}
                              onChange={(e) => updateCard(index, 'back', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none"
                              rows={2}
                            />
                          </div>
                          {card.hint && (
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1 block">Hint</label>
                              <input
                                value={card.hint}
                                onChange={(e) => updateCard(index, 'hint', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-gray-500 mb-1">Front</div>
                            <div className="overflow-hidden max-w-full">
                              {card.front ? (
                                <div className="break-words overflow-wrap-anywhere hyphens-auto max-w-full">
                                  <MathRenderer 
                                    content={card.front.length > 100 ? `${card.front.substring(0, 100)}...` : card.front} 
                                    className="text-sm text-gray-900 leading-relaxed max-w-full overflow-hidden" 
                                  />
                                </div>
                              ) : (
                                <span className="text-gray-400 italic text-sm">Empty</span>
                              )}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-gray-500 mb-1">Back</div>
                            <div className="overflow-hidden max-w-full">
                              {card.back ? (
                                <div className="break-words overflow-wrap-anywhere hyphens-auto max-w-full">
                                  <MathRenderer 
                                    content={card.back.length > 100 ? `${card.back.substring(0, 100)}...` : card.back} 
                                    className="text-sm text-gray-900 leading-relaxed max-w-full overflow-hidden" 
                                  />
                                </div>
                              ) : (
                                <span className="text-gray-400 italic text-sm">Empty</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {card.issues && card.issues.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-yellow-200">
                          <div className="flex items-start gap-2 text-yellow-700">
                            <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div className="text-xs">
                              <span className="font-medium">Issues: </span>
                              {card.issues.join(', ')}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4">
                <Button variant="outline" onClick={reset} className="min-h-[48px]">
                  <ArrowPathIcon className="w-5 h-5 mr-2" />
                  Choose Different File
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={importData.stats.valid === 0}
                  size="lg"
                  className="px-6 sm:px-8 min-h-[48px]"
                >
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                  Import {importData.stats.valid} Cards
                </Button>
              </div>
            </div>
          )}

          {state === 'importing' && (
            <div className="text-center py-16">
              <div className="space-y-6">
                <div className="w-20 h-20 border-4 border-koda-primary border-t-transparent rounded-full animate-spin mx-auto" />
                
                <div>
                  <h3 className="text-2xl font-semibold text-text-primary mb-2">
                    Importing Cards...
                  </h3>
                  <p className="text-text-secondary text-lg mb-4">
                    {currentCard && `Currently processing: ${currentCard}`}
                  </p>
                </div>
                
                {/* Progress Bar */}
                <div className="max-w-md mx-auto">
                  <div className="flex justify-between text-sm text-text-secondary mb-2">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-surface-elevated rounded-full h-3">
                    <div 
                      className="h-3 bg-koda-primary rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {state === 'success' && (
            <div className="text-center py-20 space-y-8">
              {/* Clean Success Icon */}
              <div className="w-20 h-20 bg-koda-primary rounded-full flex items-center justify-center mx-auto">
                <CheckCircleIcon className="w-12 h-12 text-white" />
              </div>
              
              {/* Success Message */}
              <div className="space-y-6">
                <h3 className="text-3xl font-semibold text-text-primary">
                  Import Complete
                </h3>
                <p className="text-text-secondary text-lg max-w-md mx-auto">
                  {importData?.stats.valid} cards successfully imported to "{deck.name}"
                </p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => {
                    onImportComplete();
                    onClose();
                  }}
                  className="px-6 py-3 bg-koda-primary hover:bg-koda-primary/90"
                >
                  <AcademicCapIcon className="w-5 h-5 mr-2" />
                  Start Studying
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    onImportComplete();
                    onClose();
                  }}
                  className="px-6 py-3"
                >
                  <XCircleIcon className="w-5 h-5 mr-2" />
                  Close
                </Button>
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="text-center py-16 space-y-8">
              {/* Friendly Error Animation */}
              <div className="relative">
                <KodaBear size="xl" expression="default" className="mx-auto" />
                <div className="absolute -top-4 -right-4 bg-red-100 dark:bg-red-900/20 rounded-full p-2">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                </div>
              </div>
              
              {/* Error Message */}
              <div className="space-y-4">
                <h3 className="text-3xl font-bold text-text-primary">
                  Oops! Something went wrong
                </h3>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 max-w-lg mx-auto">
                  <p className="text-red-700 dark:text-red-300 text-lg">
                    {error}
                  </p>
                </div>
                <p className="text-text-secondary">
                  Don't worry! Let's try a different approach.
                </p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button 
                  onClick={reset}
                  className="px-6 py-3 bg-koda-primary hover:bg-koda-primary/90"
                >
                  <ArrowPathIcon className="w-5 h-5 mr-2" />
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="px-6 py-3"
                >
                  Close
                </Button>
              </div>
              
              {/* Helpful Tips */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 max-w-lg mx-auto">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">💡 Tips for successful import:</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2 text-left">
                  <li>• Ensure your file has at least two columns (front/back)</li>
                  <li>• Use common headers like "question/answer" or "front/back"</li>
                  <li>• Files should be under 50MB</li>
                  <li>• Supported formats: CSV, TSV, JSON</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;