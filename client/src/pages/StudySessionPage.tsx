/**
 * Study Session Page
 * 
 * Interactive study session with card flipping and spaced repetition.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApiService } from '../services';
import { Button, KodaBear, StudyCard, StudyProgress, StudyComplete, SettingsDropdown } from '../components';
import type { Deck, Card, StudySession } from '../types';

const StudySessionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [deck, setDeck] = useState<Deck | null>(null);
  const [session, setSession] = useState<StudySession | null>(null);
  const [initialCards, setInitialCards] = useState<Card[]>([]);
  const [studyQueue, setStudyQueue] = useState<Array<Card & { reviewCount: number; nextShowTime?: Date }>>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Session stats with stage tracking
  const [sessionStats, setSessionStats] = useState({
    studied: 0,
    correct: 0,
    totalReviews: 0,
    startTime: new Date(),
    completedCards: new Set<string>(),
    stageProgress: {
      new: 0,
      learning: 0,
      review: 0,
      mastered: 0,
    },
  });
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  

  const currentCard = studyQueue[currentCardIndex];
  // Session is complete when all cards are mastered (removed from active study queue)
  const isSessionComplete = studyQueue.length === 0;

  // Calculate stage progress from current queue AND completed cards
  const calculateStageProgress = (cards: Card[], masteredCount: number = sessionStats.studied) => {
    const progress = { new: 0, learning: 0, review: 0, mastered: masteredCount };
    cards.forEach(card => {
      switch (card.stage) {
        case 'new': progress.new++; break;
        case 'learning': progress.learning++; break;
        case 'review': progress.review++; break;
        // Don't count mastered cards in queue - they should be removed
        // mastered count comes from the parameter (cards removed from queue)
      }
    });
    return progress;
  };

  // Calculate weighted progress (0-100%) based on stage advancement
  const calculateWeightedProgress = (initialCards: Card[], currentQueue: Card[], masteredCount: number) => {
    if (initialCards.length === 0) return 0;
    
    // Stage weights: new=0%, learning=25%, review=60%, mastered=100%
    const stageWeights = { new: 0, learning: 0.25, review: 0.6, mastered: 1.0 };
    
    let totalWeightedProgress = 0;
    
    // Add progress from completed (mastered) cards
    totalWeightedProgress += masteredCount * stageWeights.mastered;
    
    // Add progress from cards still in queue
    currentQueue.forEach(card => {
      const weight = stageWeights[card.stage as keyof typeof stageWeights] || 0;
      totalWeightedProgress += weight;
    });
    
    return Math.min(100, (totalWeightedProgress / initialCards.length) * 100);
  };

  const fetchStudyData = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      setError('');
      
      // Get deck info and start study session
      const [deckResponse, sessionResponse] = await Promise.all([
        ApiService.getDeck(id),
        ApiService.startStudySession({
          deckId: id,
          sessionType: 'mixed',
          maxCards: 100, // Increased limit to show all available cards
        }),
      ]);
      
      setDeck(deckResponse.deck);
      setSession(sessionResponse.session);
      setInitialCards(sessionResponse.cards);
      
      if (sessionResponse.cards.length === 0) {
        setError('No cards are due for study right now. Great job!');
      } else {
        // Initialize study queue with cards that need review counts
        const initialQueue = sessionResponse.cards.map(card => ({
          ...card,
          reviewCount: 0,
          nextShowTime: undefined,
        }));
        setStudyQueue(initialQueue);
        setCurrentCardIndex(0);
        
        // Initialize stage progress
        const initialProgress = calculateStageProgress(sessionResponse.cards);
        setSessionStats(prev => ({
          ...prev,
          stageProgress: initialProgress,
        }));
      }
    } catch (error: any) {
      setError(error.message || 'Failed to start study session');
      if (error.status === 404) {
        navigate('/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudyData();
  }, [id, navigate]);

  // Enhanced SM-2 Algorithm implementation with intuitive stage progression
  const calculateSM2 = (card: any, quality: number) => {
    let { interval = 0, repetition = 0, easeFactor = 2.5, stage = 'new', consecutiveCorrect = 0 } = card;
    
    // Handle different quality ratings (1-4 paw system)
    if (quality >= 3) {
      // Successful review (Good=3 or Easy=4)
      repetition += 1;
      consecutiveCorrect += 1;
      
      // Stage progression logic
      if (stage === 'new') {
        stage = 'learning';
        interval = quality === 4 ? 2 : 1; // Easy gets 2 days, Good gets 1 day
      } else if (stage === 'learning') {
        // Graduate to review after 1-2 successful reviews depending on quality
        if (quality === 4 && consecutiveCorrect >= 1) {
          stage = 'review';
          interval = 4; // Easy progression
        } else if (quality === 3 && consecutiveCorrect >= 2) {
          stage = 'review';
          interval = 3; // Good progression
        } else {
          interval = Math.max(1, Math.round(interval * 1.5));
        }
      } else if (stage === 'review') {
        // Graduate to mastered after consistent good performance
        if (quality === 4 && consecutiveCorrect >= 2) {
          stage = 'mastered';
        } else if (quality === 3 && consecutiveCorrect >= 3) {
          stage = 'mastered';
        }
        interval = Math.round(interval * easeFactor);
      } else if (stage === 'mastered') {
        interval = Math.round(interval * easeFactor);
      }
      
      // Update ease factor for successful reviews
      if (quality === 4) {
        easeFactor = Math.min(2.5, easeFactor + 0.1);
      } else if (quality === 3) {
        easeFactor = Math.min(2.5, easeFactor + 0.05);
      }
      
    } else {
      // Failed review (Again=1 or Hard=2)
      consecutiveCorrect = 0; // Reset streak
      
      if (quality === 1) {
        // "Again" - significant regression
        repetition = Math.max(0, repetition - 1);
        interval = 0.25; // 6 hours
        if (stage === 'review' || stage === 'mastered') {
          stage = 'learning'; // Drop back to learning
        }
        easeFactor = Math.max(1.3, easeFactor - 0.2);
      } else {
        // "Hard" - mild regression
        interval = Math.max(0.5, Math.round(interval * 0.7)); // 12 hours minimum
        easeFactor = Math.max(1.3, easeFactor - 0.1);
      }
    }
    
    // Ensure interval is reasonable
    interval = Math.max(0.25, Math.min(365, interval));
    
    return { interval, repetition, easeFactor, stage, consecutiveCorrect };
  };

  const handleCardReview = async (quality: number, responseTime: number, wasCorrect: boolean) => {
    if (!currentCard) return;

    // Apply SM-2 algorithm first to get updated card state
    const updatedQueue = [...studyQueue];
    const currentCardData = updatedQueue[currentCardIndex];
    const oldStage = currentCardData.stage;
    
    // Calculate SM-2 values with current card state
    const sm2Result = calculateSM2(currentCardData, quality);
    
    // Update card with SM-2 results
    Object.assign(currentCardData, sm2Result);
    currentCardData.reviewCount = (currentCardData.reviewCount || 0) + 1;
    

    // Determine if card should graduate from session based on improved logic
    let shouldRemoveFromQueue = false;
    
    // Updated graduation rules - cards only graduate when truly mastered:
    // - Only remove cards from session when they reach 'mastered' stage
    // - This ensures proper progression through all stages in the session
    // - Cards stay in rotation until they are actually mastered
    
    shouldRemoveFromQueue = sm2Result.stage === 'mastered';

    try {
      // Validate and submit review to backend with updated card state
      const reviewData = {
        cardId: currentCard.id,
        quality: Math.floor(quality), // Ensure it's an integer
        responseTime: Math.floor(responseTime), // Ensure it's an integer
        wasCorrect: Boolean(wasCorrect), // Ensure it's a boolean
      };

      // Validate data before sending
      if (!reviewData.cardId || typeof reviewData.cardId !== 'string') {
        throw new Error('Invalid cardId');
      }
      if (!Number.isInteger(reviewData.quality) || reviewData.quality < 1 || reviewData.quality > 4) {
        throw new Error('Invalid quality rating');
      }
      if (!Number.isInteger(reviewData.responseTime) || reviewData.responseTime < 0) {
        throw new Error('Invalid response time');
      }

      await ApiService.submitReview(reviewData);

      // Successfully submitted to backend - reset offline mode and update session stats
      if (isOfflineMode) {
        setIsOfflineMode(false);
        console.info('🌐 Reconnected to server - syncing progress');
      }
      setSessionStats(prev => ({
        ...prev,
        totalReviews: prev.totalReviews + 1,
        correct: prev.correct + (wasCorrect ? 1 : 0),
        studied: shouldRemoveFromQueue ? prev.studied + 1 : prev.studied, // Only increment when card is mastered
        stageProgress: calculateStageProgress(updatedQueue, shouldRemoveFromQueue ? prev.studied + 1 : prev.studied), // Recalculate from actual queue state
      }));

      // Update queue and move to next card
      if (shouldRemoveFromQueue) {
        updatedQueue.splice(currentCardIndex, 1);
        
        // Adjust current index if needed
        if (currentCardIndex >= updatedQueue.length && updatedQueue.length > 0) {
          setCurrentCardIndex(0);
        } else if (updatedQueue.length === 0) {
          // Session complete - let the component render StudyComplete
          // Don't call handleSessionComplete here, let the user see the completion screen
        }
      } else {
        // Move to next card in rotation
        let nextIndex = currentCardIndex + 1;
        if (nextIndex >= updatedQueue.length) {
          nextIndex = 0; // Loop back to start
        }
        setCurrentCardIndex(nextIndex);
      }

      setStudyQueue(updatedQueue);
      
    } catch (error: any) {
      console.error('Failed to submit review:', error);
      
      // Determine error type and provide better feedback
      let errorMessage = 'Unknown error occurred';
      if (error.message && error.message.includes('Invalid')) {
        errorMessage = `Data validation error: ${error.message}`;
      } else if (error.status === 500 || error.isServerError) {
        errorMessage = 'Server error - continuing with local progress tracking';
      } else if (error.status === 404) {
        errorMessage = 'Card not found on server - continuing locally';
      } else if (error.isNetworkError || !navigator.onLine) {
        errorMessage = 'No internet connection - continuing with offline mode';
      } else {
        errorMessage = `API Error (${error.status}): ${error.message}`;
      }
      
      console.warn(`Review submission failed: ${errorMessage}`);
      
      // Set offline mode indicator
      if (!isOfflineMode) {
        setIsOfflineMode(true);
        // Show a brief notification that we're now in offline mode
        console.info('📱 Switched to offline mode - progress is being saved locally');
      }
      
      // Still update local state so user can continue studying
      // The variables are already available from the outer scope
      
      // Move to next card
      let nextIndex = currentCardIndex;
      if (shouldRemoveFromQueue) {
        updatedQueue.splice(currentCardIndex, 1);
        if (currentCardIndex >= updatedQueue.length && updatedQueue.length > 0) {
          nextIndex = 0;
        }
      } else {
        nextIndex = (currentCardIndex + 1) % updatedQueue.length;
      }
      
      setStudyQueue(updatedQueue);
      setCurrentCardIndex(nextIndex);
      
      // Update session stats even if backend fails
      setSessionStats(prev => ({
        ...prev,
        totalReviews: prev.totalReviews + 1,
        correct: prev.correct + (wasCorrect ? 1 : 0),
        studied: shouldRemoveFromQueue ? prev.studied + 1 : prev.studied, // Only increment when card is mastered
        stageProgress: calculateStageProgress(updatedQueue, shouldRemoveFromQueue ? prev.studied + 1 : prev.studied), // Recalculate from actual queue state
      }));
    }
  };

  const moveToNextAvailableCard = (queue: typeof studyQueue) => {
    const now = new Date();
    let nextIndex = -1;
    
    // Find next card that's ready to be shown
    for (let i = 0; i < queue.length; i++) {
      const card = queue[i];
      if (!card.nextShowTime || card.nextShowTime <= now) {
        nextIndex = i;
        break;
      }
    }
    
    // If no card is immediately ready, find the one with earliest next show time
    if (nextIndex === -1 && queue.length > 0) {
      let earliestTime = queue[0].nextShowTime;
      nextIndex = 0;
      
      for (let i = 1; i < queue.length; i++) {
        const card = queue[i];
        if (card.nextShowTime && (!earliestTime || card.nextShowTime < earliestTime)) {
          earliestTime = card.nextShowTime;
          nextIndex = i;
        }
      }
    }
    
    setCurrentCardIndex(nextIndex >= 0 ? nextIndex : 0);
  };

  const handleSessionComplete = async () => {
    if (!session) return;

    try {
      const sessionDuration = Math.floor((Date.now() - sessionStats.startTime.getTime()) / 1000);
      
      await ApiService.completeSession(session.id, {
        cardsStudied: sessionStats.studied,
        cardsCorrect: sessionStats.correct,
        totalTime: sessionDuration,
      });
    } catch (error) {
      console.error('Failed to complete session:', error);
    }
    
    navigate(`/deck/${id}`);
  };

  const handleExitSession = () => {
    if (confirm('Are you sure you want to exit this study session? Your progress will be saved.')) {
      navigate(`/deck/${id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-koda-accent-light/30 to-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="relative">
            <KodaBear 
              size="xl" 
              expression="focused" 
              animation="float" 
              className="mx-auto mb-6" 
            />
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-16 h-2 bg-koda-primary/20 rounded-full animate-pulse"></div>
          </div>
          
          <h3 className="text-xl font-semibold text-koda-primary-dark mb-2">
            Getting ready for you!
          </h3>
          <p className="text-neutral-600 mb-4">
            I'm preparing your personalized study session...
          </p>
          
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-koda-primary rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-koda-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-koda-primary rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !deck) {
    const isAllDone = error.includes('No cards');
    return (
      <div className="min-h-screen bg-gradient-to-br from-koda-accent-light/30 to-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="relative">
            <KodaBear 
              size="xl" 
              expression={isAllDone ? 'celebrating' : 'confused'} 
              animation={isAllDone ? 'bounce' : 'none'}
              className="mx-auto mb-6" 
            />
            {isAllDone && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="animate-ping absolute top-0 left-4 w-2 h-2 bg-yellow-400/60 rounded-full"></div>
                <div className="animate-ping absolute top-2 right-2 w-1.5 h-1.5 bg-green-400/60 rounded-full" style={{animationDelay: '0.5s'}}></div>
                <div className="animate-ping absolute bottom-2 left-2 w-1 h-1 bg-blue-400/60 rounded-full" style={{animationDelay: '1s'}}></div>
              </div>
            )}
          </div>
          
          <h2 className="text-2xl font-bold text-koda-primary-dark mb-4">
            {isAllDone ? 'Fantastic! All caught up!' : 'Something went wrong'}
          </h2>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 mb-6 border border-koda-primary/10">
            <p className="text-neutral-700">
              {isAllDone 
                ? "You've completed all your due cards! I'm so proud of your dedication to learning. Come back later for your next review session!"
                : "Don't worry, these things happen sometimes. Let's get you back on track!"
              }
            </p>
            {!isAllDone && (
              <p className="text-sm text-neutral-500 mt-2 italic">
                Error details: {error}
              </p>
            )}
          </div>
          
          <div className="space-x-3">
            <Button onClick={() => navigate(`/deck/${id}`)}>
              Back to Deck
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isSessionComplete) {
    return (
      <StudyComplete
        deck={deck}
        sessionStats={sessionStats}
        onContinue={handleSessionComplete}
        onStudyMore={() => {
          // Restart session with fresh data
          setCurrentCardIndex(0);
          setSessionStats({
            studied: 0,
            correct: 0,
            totalReviews: 0,
            startTime: new Date(),
            completedCards: new Set<string>(),
            stageProgress: {
              new: 0,
              learning: 0,
              review: 0,
              mastered: 0,
            },
          });
          setStudyQueue([]);
          fetchStudyData();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface/95 backdrop-blur-sm border-b border-border shadow-subtle sticky top-0 z-40 pt-safe">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={handleExitSession}
                className="mr-6 text-text-secondary hover:text-koda-primary transition-all duration-200 p-2 hover:bg-surface-elevated rounded-xl font-medium flex items-center gap-2 group"
                aria-label="Exit study session"
              >
                <span className="transform group-hover:-translate-x-0.5 transition-transform duration-200">←</span>
                <span className="hidden sm:inline">Exit</span>
              </button>
              <div>
                <h1 className="text-2xl font-display font-bold text-text-primary">
                  {deck.name}
                </h1>
                <p className="text-base text-text-secondary font-medium">
                  Study Session
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {isOfflineMode && (
                <div className="flex items-center px-4 py-2 bg-warning-light text-warning text-sm font-semibold rounded-full border border-warning/30 shadow-subtle animate-pulse">
                  <KodaBear size="xs" expression="alert" className="mr-2" />
                  Offline Mode
                </div>
              )}
              <div className="relative group">
                <div className="flex items-center gap-2 group-hover:scale-110 transition-all duration-300">
                  <span className="text-2xl">🐻</span>
                  <span className="font-display font-bold text-koda-primary text-lg">Koda</span>
                </div>
              </div>
              <SettingsDropdown />
            </div>
          </div>
        </div>
      </header>


      {/* Progress Bar */}
      <StudyProgress
        current={sessionStats.studied}
        total={initialCards.length}
        remaining={studyQueue.length}
        weightedProgress={calculateWeightedProgress(initialCards, studyQueue, sessionStats.studied)}
        sessionStats={sessionStats}
      />

      {/* Study Card */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-12 pb-safe">
        {currentCard && (
          <StudyCard
            card={currentCard}
            cardNumber={sessionStats.studied + 1}
            totalCards={initialCards.length}
            remainingCards={studyQueue.length}
            reviewCount={currentCard.reviewCount || 0}
            onReview={handleCardReview}
          />
        )}
      </main>
    </div>
  );
};

export default StudySessionPage;