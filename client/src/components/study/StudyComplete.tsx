/**
 * Study Complete Component
 * 
 * Minimalistic celebration screen shown when study session is completed.
 */

import { Button, KodaBear } from '../ui';
import type { Deck } from '../../types';

interface StudyCompleteProps {
  deck: Deck;
  sessionStats: {
    studied: number;
    correct: number;
    totalReviews: number;
    startTime: Date;
    completedCards: Set<string>;
  };
  onContinue: () => void;
  onStudyMore: () => void;
}

const StudyComplete: React.FC<StudyCompleteProps> = ({ 
  deck, 
  sessionStats, 
  onContinue, 
  onStudyMore 
}) => {
  const accuracy = sessionStats.totalReviews > 0 ? Math.round((sessionStats.correct / sessionStats.totalReviews) * 100) : 0;
  const sessionDuration = Math.floor((Date.now() - sessionStats.startTime.getTime()) / 1000);
  const minutes = Math.floor(sessionDuration / 60);
  const seconds = sessionDuration % 60;

  return (
    <div className="min-h-screen bg-gradient-to-br from-koda-primary/5 via-background to-koda-primary-light/5 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Celebration Animation */}
        <div className="text-center mb-12 relative">
          {/* Floating particles */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="animate-ping absolute top-8 left-8 w-2 h-2 bg-koda-primary/40 rounded-full" style={{animationDelay: '0s'}}></div>
            <div className="animate-ping absolute top-4 right-12 w-1.5 h-1.5 bg-koda-primary/30 rounded-full" style={{animationDelay: '0.8s'}}></div>
            <div className="animate-ping absolute bottom-8 left-12 w-2.5 h-2.5 bg-koda-primary/35 rounded-full" style={{animationDelay: '1.6s'}}></div>
            <div className="animate-ping absolute bottom-4 right-8 w-1 h-1 bg-koda-primary/25 rounded-full" style={{animationDelay: '2.4s'}}></div>
          </div>
          
          <div className="relative animate-fade-in">
            <KodaBear 
              size="xl"
              expression="celebrating"
              animation="bounce"
              className="mx-auto mb-8" 
            />
          </div>
          
          <h1 className="text-4xl font-display font-bold text-text-primary mb-4 animate-bounce-gentle">
            Well Done!
          </h1>
          
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-2xl animate-bounce">🐻</span>
            <p className="text-text-secondary text-lg">
              You completed <span className="text-koda-primary font-semibold">{deck.name}</span>
            </p>
          </div>
          
          <p className="text-sm text-text-muted italic">
            "Great job on completing your study session!" - Koda
          </p>
        </div>

        {/* Clean Stats */}
        <div className="bg-surface rounded-2xl border border-border p-8 shadow-card mb-8 animate-fade-in">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-koda-primary mb-1">
                {sessionStats.studied}
              </div>
              <div className="text-sm text-text-secondary">Cards</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-koda-primary mb-1">
                {accuracy}%
              </div>
              <div className="text-sm text-text-secondary">Accuracy</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-koda-primary mb-1 font-mono">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </div>
              <div className="text-sm text-text-secondary">Time</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 animate-fade-in">
          <Button 
            size="lg" 
            className="w-full"
            onClick={onContinue}
          >
            Back to Deck
          </Button>
          
          {deck.dueCount > sessionStats.studied && (
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full"
              onClick={onStudyMore}
            >
              Study More Cards
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyComplete;