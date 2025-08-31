/**
 * Study Card Component
 * 
 * Interactive flashcard with flip animation and review buttons.
 */

import { useState, useEffect } from 'react';
import { Button, KodaBear, MathRenderer } from '../ui';
import { 
  EyeIcon, 
  HandThumbDownIcon, 
  ExclamationTriangleIcon, 
  ArrowTrendingUpIcon, 
  HandThumbUpIcon 
} from '@heroicons/react/24/outline';
import type { Card } from '../../types';

interface StudyCardProps {
  card: Card;
  cardNumber: number;
  totalCards: number;
  remainingCards?: number;
  reviewCount?: number;
  onReview: (quality: number, responseTime: number, wasCorrect: boolean) => void;
}

const StudyCard: React.FC<StudyCardProps> = ({ card, cardNumber, totalCards, remainingCards, reviewCount, onReview }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [showHint, setShowHint] = useState(false);

  // Smart truncation that respects LaTeX expressions
  const smartTruncate = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    
    // Find the last complete LaTeX expression before maxLength
    let truncateAt = maxLength;
    let inLatex = false;
    let latexStart = -1;
    
    for (let i = 0; i < maxLength; i++) {
      if (text.slice(i, i + 2) === '\\(' || text.slice(i, i + 2) === '\\[') {
        inLatex = true;
        latexStart = i;
      } else if (text.slice(i, i + 2) === '\\)' || text.slice(i, i + 2) === '\\]') {
        inLatex = false;
        latexStart = -1;
      }
    }
    
    // If we're in the middle of a LaTeX expression, truncate before it
    if (inLatex && latexStart > 0) {
      truncateAt = latexStart;
    }
    
    return text.substring(0, truncateAt) + '...';
  };

  // Reset card state when card changes or immediately after review
  useEffect(() => {
    setIsFlipped(false);
    setShowHint(false);
    setStartTime(new Date());
  }, [card.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case ' ':
          event.preventDefault();
          if (!isFlipped) {
            handleFlip();
          } else {
            setIsFlipped(false);
          }
          break;
        case 'Enter':
          event.preventDefault();
          if (!isFlipped) {
            handleFlip();
          }
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          if (!isFlipped) {
            handleFlip();
          }
          break;
        case '1':
          if (isFlipped) {
            event.preventDefault();
            handleReview(1, false);
          }
          break;
        case '2':
          if (isFlipped) {
            event.preventDefault();
            handleReview(2, false);
          }
          break;
        case '3':
          if (isFlipped) {
            event.preventDefault();
            handleReview(3, true);
          }
          break;
        case '4':
          if (isFlipped) {
            event.preventDefault();
            handleReview(4, true);
          }
          break;
        case 'h':
        case 'H':
          if (isFlipped && card.hint && !showHint) {
            event.preventDefault();
            setShowHint(true);
          }
          break;
        case 'Escape':
          event.preventDefault();
          if (isFlipped) {
            setIsFlipped(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFlipped, card.hint, showHint]);

  const handleFlip = () => {
    setIsFlipped(true);
  };

  const handleReview = (quality: number, wasCorrect: boolean) => {
    const responseTime = Date.now() - startTime.getTime();
    
    // Call onReview immediately
    onReview(quality, responseTime, wasCorrect);
    
    // Reset to front for next card (important for single-card decks)
    setIsFlipped(false);
  };

  const getDifficultyEmoji = (difficulty: number) => {
    if (difficulty <= 0.3) return '😊';
    if (difficulty <= 0.7) return '🤔';
    return '😅';
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'new': return 'text-info';
      case 'learning': return 'text-warning';
      case 'review': return 'text-primary';
      case 'mastered': return 'text-text-dark';
      default: return 'text-neutral-600';
    }
  };

  const getFeedbackMessage = (quality: number) => {
    switch (quality) {
      case 1: return { 
        expression: 'supportive' as const, 
        message: "That's okay! Every mistake is a step forward!", 
        color: "text-error",
        animation: 'pulse' as const
      };
      case 2: return { 
        expression: 'encouraging' as const, 
        message: "You're getting there! Keep going!", 
        color: "text-warning",
        animation: 'bounce' as const
      };
      case 3: return { 
        expression: 'proud' as const, 
        message: "Nice work! You're doing great!", 
        color: "text-koda-primary",
        animation: 'wiggle' as const
      };
      case 4: return { 
        expression: 'excited' as const, 
        message: "Fantastic! You nailed it!", 
        color: "text-info",
        animation: 'bounce' as const
      };
      default: return { 
        expression: 'proud' as const, 
        message: "Good job!", 
        color: "text-koda-primary",
        animation: 'none' as const
      };
    }
  };

  return (
    <div className="max-w-2xl mx-auto relative px-2 sm:px-4 lg:px-0">
      {/* Flashcard */}
      <div className="relative mb-4 sm:mb-6 lg:mb-8 perspective-1000">
        <div 
          className={`card-flashcard transform group ${isFlipped ? 'rotate-y-180' : ''} ${!isFlipped ? 'cursor-pointer hover:scale-105 hover:shadow-strong active:scale-95' : ''} w-full`}
          onClick={!isFlipped ? handleFlip : undefined}
          style={{
            transformStyle: 'preserve-3d',
            minHeight: window.innerWidth < 640 ? '240px' : window.innerWidth < 768 ? '280px' : '320px',
            maxHeight: window.innerWidth < 640 ? '300px' : window.innerWidth < 768 ? '340px' : '400px',
            transition: 'transform 700ms ease-in-out, box-shadow 200ms ease-out, scale 200ms ease-out',
          }}
        >
          {/* Front Side */}
          <div 
            className={`absolute inset-0 flex items-center justify-center text-center p-4 sm:p-6 lg:p-10 bg-gradient-to-br from-surface via-surface to-surface-elevated rounded-2xl border border-border shadow-card group-hover:shadow-card-hover transition-all duration-500 overflow-hidden ${
              isFlipped ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
            }`}
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="transform transition-all duration-300 max-w-full w-full flex flex-col justify-center min-h-0">
              <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
                <div className="w-full max-w-full overflow-hidden">
                  <MathRenderer 
                    content={smartTruncate(card.front, window.innerWidth < 640 ? 100 : 150)}
                    className={`font-display font-semibold text-text-primary leading-relaxed group-hover:text-koda-primary transition-colors duration-300 break-words hyphens-auto overflow-wrap-anywhere max-w-full ${
                      card.front.length > 80 
                        ? 'text-base sm:text-lg md:text-xl lg:text-2xl' 
                        : 'text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl'
                    }`}
                  />
                </div>
              </div>
              {!isFlipped && (
                <div className="mt-4 sm:mt-6 lg:mt-8 flex flex-col items-center flex-shrink-0">
                  <KodaBear 
                    size="sm" 
                    expression="focused" 
                    animation="float"
                    className="mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="text-xs sm:text-sm lg:text-base text-text-secondary bg-surface-elevated px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-full border border-border animate-pulse shadow-subtle group-hover:shadow-card group-hover:bg-koda-primary/5 group-hover:border-koda-primary/20 transition-all duration-300 max-w-full overflow-hidden">
                    <span className="hidden sm:inline whitespace-nowrap overflow-hidden text-ellipsis">I'm curious about your answer! Click or press space to reveal ✨</span>
                    <span className="sm:hidden">Tap to reveal answer ✨</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Back Side */}
          <div 
            className={`absolute inset-0 flex items-center justify-center text-center p-4 sm:p-6 lg:p-10 bg-gradient-to-br from-koda-primary/5 via-koda-primary/8 to-koda-primary/10 rounded-2xl border border-koda-primary/20 shadow-card transition-all duration-500 overflow-hidden ${
              isFlipped ? 'opacity-100 transform scale-100' : 'opacity-0 transform scale-95'
            }`}
            style={{ 
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <div className="transform transition-all duration-300 max-w-full w-full flex flex-col justify-center min-h-0">
              <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
                <div className="w-full max-w-full overflow-hidden">
                  <MathRenderer 
                    content={smartTruncate(card.back, window.innerWidth < 640 ? 100 : 150)}
                    className={`font-display font-semibold text-text-primary leading-relaxed break-words hyphens-auto overflow-wrap-anywhere max-w-full ${
                      card.back.length > 80 
                        ? 'text-base sm:text-lg md:text-xl lg:text-2xl' 
                        : 'text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl'
                    }`}
                  />
                </div>
              </div>
              
              {card.hint && showHint && (
                <div className="text-xs sm:text-sm lg:text-base text-text-primary bg-info-light p-3 sm:p-4 lg:p-6 rounded-2xl mt-4 sm:mt-6 animate-bounce-gentle border border-info/20 shadow-subtle max-w-full overflow-hidden flex-shrink-0">
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-lg sm:text-xl lg:text-2xl mr-2">💡</span>
                    <span className="font-semibold text-info">Hint</span>
                  </div>
                  <div className="break-words overflow-wrap-anywhere">{card.hint}</div>
                </div>
              )}
              
              {card.hint && !showHint && (
                <div className="mt-4 sm:mt-6 flex-shrink-0">
                  <button
                    onClick={() => setShowHint(true)}
                    className="text-xs sm:text-sm lg:text-base text-koda-primary hover:text-koda-primary-dark underline hover:no-underline transition-all duration-200 bg-koda-primary/10 hover:bg-koda-primary/20 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-full shadow-subtle hover:shadow-card font-medium min-h-[44px] flex items-center justify-center w-full sm:w-auto"
                  >
                    Show hint 💡
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {!isFlipped ? (
        // Before flip - show flip button
        <div className="flex justify-center px-2 sm:px-4 lg:px-0">
          <Button 
            size="lg" 
            onClick={handleFlip}
            className="w-full sm:w-auto px-6 sm:px-8 lg:px-16 py-3 sm:py-4 lg:py-5 text-base sm:text-lg lg:text-xl font-bold shadow-card hover:shadow-strong transform hover:scale-105 active:scale-95 transition-all duration-300 bg-gradient-to-r from-koda-primary to-koda-primary-dark hover:from-koda-primary-dark hover:to-koda-primary min-h-[48px] sm:min-h-[56px]"
          >
            <EyeIcon className="w-5 h-5 mr-2" />
            Show Answer
          </Button>
        </div>
      ) : (
        // After flip - show review buttons
        <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-2 sm:px-4 lg:px-0">
          <div className="text-center">
            <p className="text-sm sm:text-base lg:text-lg text-text-primary font-semibold px-2">
              How well did you know this?
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 max-w-3xl mx-auto">
            {/* Again */}
            <button
              onClick={() => handleReview(1, false)}
              className="group relative flex flex-col items-center justify-center min-h-[60px] sm:min-h-[72px] rounded-lg bg-surface border border-border hover:border-koda-primary/40 hover:bg-koda-primary/5 transition-all duration-200 hover:shadow-card active:scale-95 focus:outline-none focus:ring-2 focus:ring-koda-primary/20 p-2 sm:p-3"
              aria-label="Rate as 'Again'"
            >
              <HandThumbDownIcon className="w-4 h-4 sm:w-5 sm:h-5 text-text-secondary group-hover:text-koda-primary transition-colors duration-200 mb-1" />
              <span className="text-xs font-medium text-text-secondary group-hover:text-koda-primary transition-colors duration-200 text-center">
                Again
              </span>
              <span className="absolute top-1 right-1 text-xs font-medium text-text-muted group-hover:text-koda-primary/60 transition-colors duration-200 bg-surface-elevated rounded-full w-4 h-4 flex items-center justify-center">
                1
              </span>
            </button>
            
            {/* Hard */}
            <button
              onClick={() => handleReview(2, false)}
              className="group relative flex flex-col items-center justify-center min-h-[60px] sm:min-h-[72px] rounded-lg bg-surface border border-border hover:border-koda-primary/40 hover:bg-koda-primary/5 transition-all duration-200 hover:shadow-card active:scale-95 focus:outline-none focus:ring-2 focus:ring-koda-primary/20 p-2 sm:p-3"
              aria-label="Rate as 'Hard'"
            >
              <ExclamationTriangleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-text-secondary group-hover:text-koda-primary transition-colors duration-200 mb-1" />
              <span className="text-xs font-medium text-text-secondary group-hover:text-koda-primary transition-colors duration-200 text-center">
                Hard
              </span>
              <span className="absolute top-1 right-1 text-xs font-medium text-text-muted group-hover:text-koda-primary/60 transition-colors duration-200 bg-surface-elevated rounded-full w-4 h-4 flex items-center justify-center">
                2
              </span>
            </button>
            
            {/* Good */}
            <button
              onClick={() => handleReview(3, true)}
              className="group relative flex flex-col items-center justify-center min-h-[60px] sm:min-h-[72px] rounded-lg bg-surface border border-border hover:border-koda-primary/40 hover:bg-koda-primary/5 transition-all duration-200 hover:shadow-card active:scale-95 focus:outline-none focus:ring-2 focus:ring-koda-primary/20 p-2 sm:p-3"
              aria-label="Rate as 'Good'"
            >
              <ArrowTrendingUpIcon className="w-4 h-4 sm:w-5 sm:h-5 text-text-secondary group-hover:text-koda-primary transition-colors duration-200 mb-1" />
              <span className="text-xs font-medium text-text-secondary group-hover:text-koda-primary transition-colors duration-200 text-center">
                Good
              </span>
              <span className="absolute top-1 right-1 text-xs font-medium text-text-muted group-hover:text-koda-primary/60 transition-colors duration-200 bg-surface-elevated rounded-full w-4 h-4 flex items-center justify-center">
                3
              </span>
            </button>
            
            {/* Easy */}
            <button
              onClick={() => handleReview(4, true)}
              className="group relative flex flex-col items-center justify-center min-h-[60px] sm:min-h-[72px] rounded-lg bg-surface border border-border hover:border-koda-primary/40 hover:bg-koda-primary/5 transition-all duration-200 hover:shadow-card active:scale-95 focus:outline-none focus:ring-2 focus:ring-koda-primary/20 p-2 sm:p-3"
              aria-label="Rate as 'Easy'"
            >
              <HandThumbUpIcon className="w-4 h-4 sm:w-5 sm:h-5 text-text-secondary group-hover:text-koda-primary transition-colors duration-200 mb-1" />
              <span className="text-xs font-medium text-text-secondary group-hover:text-koda-primary transition-colors duration-200 text-center">
                Easy
              </span>
              <span className="absolute top-1 right-1 text-xs font-medium text-text-muted group-hover:text-koda-primary/60 transition-colors duration-200 bg-surface-elevated rounded-full w-4 h-4 flex items-center justify-center">
                4
              </span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudyCard;