/**
 * Card List Component
 * 
 * Displays a list of flashcards with management options.
 */

import { useState } from 'react';
import { ApiService } from '../../services';
import { Button, MathRenderer, ConfirmModal } from '../ui';
import EditCardModal from './EditCardModal';
import { formatDate } from '../../utils/dateUtils';
import type { Card } from '../../types';

interface CardListProps {
  cards: Card[];
  selectedCards?: Set<string>;
  onCardDeleted: () => void;
  onCardUpdated: () => void;
  onCardSelect?: (cardId: string) => void;
}

const CardList: React.FC<CardListProps> = ({ 
  cards, 
  selectedCards, 
  onCardDeleted, 
  onCardUpdated, 
  onCardSelect 
}) => {
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Smart content truncation that preserves LaTeX expressions
  const truncateContent = (text: string, maxLength: number): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    // Find LaTeX expressions in the text
    const latexPatterns = [
      /\\\[(.*?)\\\]/gs,  // Display math \[...\]
      /\\\((.*?)\\\)/gs,  // Inline math \(...\)
      /\$\$(.*?)\$\$/gs,  // Display math $$...$$
      /\$(.*?)\$/gs       // Inline math $...$
    ];
    
    let hasLatex = false;
    for (const pattern of latexPatterns) {
      if (pattern.test(text)) {
        hasLatex = true;
        break;
      }
    }
    
    // If it has LaTeX and is not too long, show full content
    if (hasLatex && text.length <= maxLength * 1.5) {
      return text;
    }
    
    // Otherwise, smart truncate at word boundary
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    const lastPunctuation = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf(','),
      truncated.lastIndexOf(';'),
      truncated.lastIndexOf('!')
    );
    
    const cutPoint = Math.max(lastSpace, lastPunctuation);
    const result = cutPoint > maxLength * 0.7 ? truncated.substring(0, cutPoint) : truncated;
    
    return result + '...';
  };

  const handleDeleteCard = async (cardId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Card',
      message: 'Are you sure you want to delete this card? This action cannot be undone.',
      onConfirm: () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        executeDeleteCard(cardId);
      }
    });
  };

  const executeDeleteCard = async (cardId: string) => {
    try {
      setDeletingCardId(cardId);
      await ApiService.deleteCard(cardId);
      onCardDeleted();
    } catch (error: any) {
      alert(error.message || 'Failed to delete card');
    } finally {
      setDeletingCardId(null);
    }
  };


  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 0.3) return 'bg-success-light text-koda-primary';
    if (difficulty <= 0.7) return 'bg-warning-light text-warning';
    return 'bg-danger-100 text-danger-500';
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'new': return 'bg-gray-100 text-gray-600';
      case 'learning': return 'bg-warning-light text-warning';
      case 'review': return 'bg-koda-primary/10 text-koda-primary';
      case 'mastered': return 'bg-success-light text-success';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {cards.map((card) => (
        <div 
          key={card.id} 
          className={`card group transition-all duration-200 overflow-hidden ${
            selectedCards?.has(card.id) ? 'ring-2 ring-koda-primary bg-koda-primary/5' : ''
          }`}
        >
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Selection Checkbox */}
            {onCardSelect && (
              <div className="mt-1 flex-shrink-0">
                <label className="block cursor-pointer p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={selectedCards?.has(card.id) || false}
                    onChange={() => onCardSelect(card.id)}
                    className="w-5 h-5 text-koda-primary border-border rounded focus:ring-koda-primary accent-koda-primary"
                  />
                </label>
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6 mb-4">
                {/* Front Content */}
                <div className="min-w-0">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide">Question</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 whitespace-nowrap hidden sm:inline-block ${getStageColor(card.stage)}`}>
                          {card.stage.charAt(0).toUpperCase() + card.stage.slice(1)}
                        </span>
                      </div>
                      <div className="relative">
                        <MathRenderer 
                          content={truncateContent(card.front, 150)}
                          className="font-semibold text-text-primary group-hover:text-koda-primary transition-colors leading-relaxed max-w-full text-sm block"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Back Content */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide">Answer</h4>
                  </div>
                  <div className="relative">
                    <MathRenderer 
                      content={truncateContent(card.back, 150)}
                      className="text-text-secondary leading-relaxed max-w-full text-sm block"
                    />
                  </div>
                </div>
              </div>

              {card.hint && (
                <div className="mb-3 p-2 bg-info-light rounded text-xs text-info">
                  💡 <span>{truncateContent(card.hint, 100)}</span>
                </div>
              )}

            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingCard(card)}
                className="min-h-[44px] w-full sm:w-auto"
              >
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                isLoading={deletingCardId === card.id}
                onClick={() => handleDeleteCard(card.id)}
                disabled={deletingCardId === card.id}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 min-h-[44px] w-full sm:w-auto"
              >
                {deletingCardId === card.id ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      ))}

      {/* Edit Card Modal */}
      {editingCard && (
        <EditCardModal
          card={editingCard}
          onClose={() => setEditingCard(null)}
          onCardUpdated={() => {
            setEditingCard(null);
            onCardUpdated();
          }}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} })}
      />
    </div>
  );
};

export default CardList;