/**
 * Import Progress Component
 * 
 * Shows real-time progress during card import process.
 */

import { useState, useEffect } from 'react';
import { Button } from '../ui';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  PauseIcon, 
  PlayIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import { ApiService } from '../../services';
import type { Deck } from '../../types';

interface ImportProgressProps {
  deck: Deck;
  previewData: any;
  onComplete: () => void;
}

interface ProgressState {
  status: 'starting' | 'processing' | 'paused' | 'complete' | 'error';
  progress: number;
  processed: number;
  total: number;
  errors: any[];
  warnings: any[];
  currentCard?: string;
  speed: number; // cards per second
  eta: number; // estimated time remaining in seconds
}

const ImportProgress: React.FC<ImportProgressProps> = ({ 
  deck, 
  previewData, 
  onComplete 
}) => {
  const [state, setState] = useState<ProgressState>({
    status: 'starting',
    progress: 0,
    processed: 0,
    total: previewData.cards.length,
    errors: [],
    warnings: [],
    speed: 0,
    eta: 0
  });

  const [startTime, setStartTime] = useState<number>(Date.now());
  const [canCancel, setCanCancel] = useState(true);

  useEffect(() => {
    startImport();
  }, []);

  const startImport = async () => {
    setStartTime(Date.now());
    setState(prev => ({ ...prev, status: 'processing' }));

    try {
      // Process cards in batches for better performance
      const batchSize = 50;
      const batches = [];
      
      for (let i = 0; i < previewData.cards.length; i += batchSize) {
        batches.push(previewData.cards.slice(i, i + batchSize));
      }

      let processed = 0;
      const allErrors: any[] = [];
      const allWarnings: any[] = [];

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        // Update current card
        setState(prev => ({
          ...prev,
          currentCard: batch[0].front.substring(0, 50) + (batch[0].front.length > 50 ? '...' : '')
        }));

        try {
          // Prepare batch data for API
          const batchCards = batch
            .filter(card => !card.hasErrors) // Only import valid cards
            .map(card => ({
              front: card.front,
              back: card.back,
              hint: card.hint || undefined,
              tags: card.tags ? card.tags.join(';') : undefined
            }));

          if (batchCards.length > 0) {
            // Call the existing batch API
            await ApiService.createBatchCards(deck.id, batchCards);
          }

          // Simulate processing time for UI feedback
          await new Promise(resolve => setTimeout(resolve, 200));

          processed += batch.length;
          const progress = Math.round((processed / previewData.cards.length) * 100);
          const elapsed = (Date.now() - startTime) / 1000;
          const speed = processed / elapsed;
          const remaining = previewData.cards.length - processed;
          const eta = remaining / speed;

          setState(prev => ({
            ...prev,
            progress,
            processed,
            speed: Math.round(speed * 10) / 10,
            eta: Math.round(eta)
          }));

          // Add any batch warnings
          batch.forEach(card => {
            if (card.hasWarnings) {
              allWarnings.push(...card.warnings.map(w => ({
                ...w,
                rowNumber: card.rowNumber
              })));
            }
            if (card.hasErrors) {
              allErrors.push(...card.errors.map(e => ({
                ...e,
                rowNumber: card.rowNumber
              })));
            }
          });

        } catch (error: any) {
          console.error('Batch import error:', error);
          allErrors.push({
            message: `Batch ${batchIndex + 1} failed: ${error.message}`,
            severity: 'error'
          });
        }
      }

      // Import completed
      setState(prev => ({
        ...prev,
        status: 'complete',
        progress: 100,
        processed: previewData.cards.length,
        errors: allErrors,
        warnings: allWarnings,
        currentCard: undefined
      }));

      setCanCancel(false);
      
      // Auto-complete after a short delay
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (error: any) {
      console.error('Import failed:', error);
      setState(prev => ({
        ...prev,
        status: 'error',
        errors: [{ message: error.message || 'Import failed', severity: 'error' }]
      }));
      setCanCancel(false);
    }
  };

  const handlePause = () => {
    setState(prev => ({ ...prev, status: 'paused' }));
  };

  const handleResume = () => {
    setState(prev => ({ ...prev, status: 'processing' }));
  };

  const handleCancel = () => {
    setState(prev => ({ ...prev, status: 'error' }));
    setCanCancel(false);
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatSpeed = (speed: number): string => {
    return `${speed} cards/sec`;
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="text-center">
        <h3 className="text-2xl font-semibold text-text-primary mb-2">
          {state.status === 'starting' && 'Starting Import...'}
          {state.status === 'processing' && 'Importing Cards'}
          {state.status === 'paused' && 'Import Paused'}
          {state.status === 'complete' && 'Import Complete!'}
          {state.status === 'error' && 'Import Failed'}
        </h3>
        <p className="text-text-secondary">
          {state.status === 'processing' && `Processing ${state.processed} of ${state.total} cards`}
          {state.status === 'complete' && `Successfully imported ${state.processed} cards to "${deck.name}"`}
          {state.status === 'error' && 'An error occurred during import'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm text-text-secondary">
          <span>{state.processed} / {state.total} cards</span>
          <span>{state.progress}%</span>
        </div>
        <div className="w-full bg-surface-elevated rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${
              state.status === 'error' 
                ? 'bg-red-500' 
                : state.status === 'complete' 
                ? 'bg-green-500' 
                : 'bg-koda-primary'
            }`}
            style={{ width: `${state.progress}%` }}
          />
        </div>
      </div>

      {/* Status Details */}
      {state.status === 'processing' && (
        <div className="bg-surface-elevated rounded-lg p-4">
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-text-primary">{formatSpeed(state.speed)}</div>
              <div className="text-sm text-text-secondary">Processing Speed</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-text-primary">{formatTime(state.eta)}</div>
              <div className="text-sm text-text-secondary">Time Remaining</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-text-primary">{state.total - state.processed}</div>
              <div className="text-sm text-text-secondary">Cards Left</div>
            </div>
          </div>
          
          {state.currentCard && (
            <div className="mt-4 p-3 bg-background rounded border-l-4 border-koda-primary">
              <div className="text-sm text-text-secondary mb-1">Currently processing:</div>
              <div className="text-text-primary font-medium">{state.currentCard}</div>
            </div>
          )}
        </div>
      )}

      {/* Success Summary */}
      {state.status === 'complete' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-center mb-4">
            <CheckCircleIcon className="w-12 h-12 text-green-600" />
          </div>
          <div className="text-center">
            <h4 className="text-lg font-semibold text-green-800 mb-2">Import Successful!</h4>
            <p className="text-green-700 mb-4">
              {state.processed} cards have been successfully imported to your deck.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-green-800">{state.processed}</div>
                <div className="text-green-600">Imported</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-green-800">{state.warnings.length}</div>
                <div className="text-green-600">Warnings</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-green-800">{formatSpeed(state.speed)}</div>
                <div className="text-green-600">Avg Speed</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-green-800">{formatTime((Date.now() - startTime) / 1000)}</div>
                <div className="text-green-600">Total Time</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {state.status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-center mb-4">
            <XMarkIcon className="w-12 h-12 text-red-600" />
          </div>
          <div className="text-center">
            <h4 className="text-lg font-semibold text-red-800 mb-2">Import Failed</h4>
            <p className="text-red-700 mb-4">
              The import process encountered errors and could not be completed.
            </p>
            {state.errors.length > 0 && (
              <div className="text-left bg-white rounded border p-3 max-h-40 overflow-y-auto">
                {state.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-600 mb-1">
                    {error.rowNumber && `Row ${error.rowNumber}: `}{error.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warnings */}
      {state.warnings.length > 0 && state.status === 'complete' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
            <h4 className="font-medium text-yellow-800">Warnings ({state.warnings.length})</h4>
          </div>
          <div className="bg-white rounded border p-3 max-h-32 overflow-y-auto">
            {state.warnings.slice(0, 5).map((warning, index) => (
              <div key={index} className="text-sm text-yellow-700 mb-1">
                {warning.rowNumber && `Row ${warning.rowNumber}: `}{warning.message}
              </div>
            ))}
            {state.warnings.length > 5 && (
              <div className="text-sm text-yellow-600 italic">
                ...and {state.warnings.length - 5} more warnings
              </div>
            )}
          </div>
        </div>
      )}

      {/* Control Buttons */}
      {canCancel && state.status !== 'complete' && (
        <div className="flex justify-center gap-4">
          {state.status === 'processing' && (
            <Button onClick={handlePause} variant="outline">
              <PauseIcon className="w-4 h-4 mr-2" />
              Pause
            </Button>
          )}
          {state.status === 'paused' && (
            <Button onClick={handleResume}>
              <PlayIcon className="w-4 h-4 mr-2" />
              Resume
            </Button>
          )}
          <Button onClick={handleCancel} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
            <XMarkIcon className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default ImportProgress;