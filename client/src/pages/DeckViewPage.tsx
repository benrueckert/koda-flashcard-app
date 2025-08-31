/**
 * Deck View Page
 * 
 * Shows deck details with all cards and management options.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PencilSquareIcon, TrashIcon, ArrowPathIcon, AcademicCapIcon, PlusCircleIcon, ArrowUpOnSquareIcon } from '@heroicons/react/24/outline';
import { ApiService } from '../services';
import { Button, CreateCardModal, CardList, EditDeckModal, ImportModal, ConfirmModal, SettingsDropdown } from '../components';
import { formatDate } from '../utils/dateUtils';
import type { Deck, Card } from '../types';

const DeckViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [showEditDeck, setShowEditDeck] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const fetchDeckData = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      setError('');
      
      const [deckResponse, cardsResponse] = await Promise.all([
        ApiService.getDeck(id),
        ApiService.getDeckCards(id, { limit: 1000 }), // Get all cards, not just first 20
      ]);
      
      setDeck(deckResponse.deck);
      setCards(cardsResponse.cards || []);
    } catch (error: any) {
      setError(error.message || 'Failed to load deck');
      if (error.status === 404) {
        navigate('/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeckData();
  }, [id, navigate]);

  const handleStartStudy = () => {
    if (deck && cards.length > 0) {
      // Check if there are any cards that need studying (not mastered)
      const masteredCards = cards.filter(card => card.stage === 'mastered');
      if (masteredCards.length < cards.length) {
        navigate(`/study/${deck.id}`);
      } else {
        alert('All cards are mastered! Great job! 🎉');
      }
    }
  };

  const handleCardCreated = () => {
    fetchDeckData(); // Refresh the card list
  };

  const handleCardDeleted = () => {
    fetchDeckData(); // Refresh the card list
  };

  const handleResetProgress = async () => {
    if (!deck) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Reset Progress',
      message: `Are you sure you want to reset the learning progress for "${deck.name}"? This will mark all cards as new and cannot be undone.`,
      confirmText: 'Reset',
      onConfirm: () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        executeResetProgress();
      }
    });
  };

  const executeResetProgress = async () => {
    if (!deck) return;
    
    try {
      setError('');
      await ApiService.resetDeckProgress(deck.id);
      fetchDeckData(); // Refresh to show updated stats
    } catch (error: any) {
      setError(error.message || 'Failed to reset deck progress');
    }
  };

  const handleDeleteDeck = async () => {
    if (!deck) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Deck',
      message: `Are you sure you want to delete "${deck.name}"? This will permanently delete the deck and all its ${cards.length} cards. This action cannot be undone.`,
      onConfirm: () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        executeDeleteDeck();
      }
    });
  };

  const executeDeleteDeck = async () => {
    if (!deck) return;
    
    try {
      setError('');
      await ApiService.deleteDeck(deck.id);
      navigate('/dashboard');
    } catch (error: any) {
      setError(error.message || 'Failed to delete deck');
    }
  };

  const handleDeckUpdated = (updatedDeck: Deck) => {
    setDeck(updatedDeck);
  };

  const handleImportCards = () => {
    setShowImport(true);
  };

  const handleImportComplete = () => {
    setShowImport(false);
    fetchDeckData(); // Refresh the card list
  };

  const handleSelectCard = (cardId: string) => {
    const newSelected = new Set(selectedCards);
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId);
    } else {
      newSelected.add(cardId);
    }
    setSelectedCards(newSelected);
  };

  const handleSelectAllCards = () => {
    if (selectedCards.size === cards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(cards.map(card => card.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCards.size === 0) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Cards',
      message: `Are you sure you want to delete ${selectedCards.size} selected cards? This action cannot be undone.`,
      onConfirm: () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        executeBulkDelete();
      }
    });
  };

  const executeBulkDelete = async () => {
    if (selectedCards.size === 0) return;
    
    try {
      setError('');
      // Delete cards one by one (could be optimized with a bulk endpoint)
      await Promise.all(
        Array.from(selectedCards).map(cardId => ApiService.deleteCard(cardId))
      );
      setSelectedCards(new Set());
      fetchDeckData(); // Refresh the card list
    } catch (error: any) {
      setError(error.message || 'Failed to delete selected cards');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-card">
            <span className="text-3xl">🐻</span>
          </div>
          <p className="text-text-secondary">Loading deck...</p>
        </div>
      </div>
    );
  }

  if (error || !deck) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-card">
            <span className="text-3xl">🐻</span>
          </div>
          <h2 className="text-2xl font-semibold text-text-primary mb-4">Oops!</h2>
          <p className="text-text-secondary mb-6">{error || 'Deck not found'}</p>
          <Button onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface/95 backdrop-blur-sm border-b border-border shadow-subtle sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-text-secondary hover:text-koda-primary transition-colors p-2 hover:bg-surface-elevated rounded-lg flex items-center gap-2 min-h-[44px] min-w-[44px] justify-center"
            >
              <span className="text-lg">←</span>
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>
            
            <div className="ml-3 sm:ml-6 flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-text-primary truncate">
                {deck.name}
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary">
                {cards.length} cards • {cards.filter(card => card.nextReviewAt <= new Date() || card.stage === 'new').length} due
              </p>
            </div>

            <div className="flex items-center space-x-3 sm:space-x-6">
              <SettingsDropdown />
            </div>
          </div>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Deck Overview Section - Redesigned */}
        <div className="bg-surface rounded-2xl border border-border shadow-card mb-8 overflow-hidden">
          {/* Header Section */}
          <div className="px-6 py-5 border-b border-border bg-gradient-to-r from-surface to-surface-elevated">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-display font-bold text-text-primary">
                    {deck.name}
                  </h2>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowEditDeck(true)}
                      className="p-1.5 text-text-muted hover:text-koda-primary transition-all duration-200 hover:bg-koda-primary/10 rounded-md group"
                      title="Edit deck details"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleDeleteDeck}
                      className="p-1.5 text-text-muted hover:text-error transition-all duration-200 hover:bg-error/10 rounded-md group"
                      title="Delete deck"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {deck.description && (
                  <p className="text-text-secondary leading-relaxed break-words text-sm">
                    {deck.description.length > 100 
                      ? `${deck.description.substring(0, 100)}...` 
                      : deck.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Statistics Section - Clean Progress Only */}
          <div className="px-6 py-5">
            {/* Progress Bar - Improved */}
            <div className="mb-4">
              {(() => {
                const newCards = cards.filter(card => card.stage === 'new');
                const learningCards = cards.filter(card => card.stage === 'learning');
                const reviewCards = cards.filter(card => card.stage === 'review');
                const masteredCards = cards.filter(card => card.stage === 'mastered');
                const totalCards = cards.length || 1;
                
                const completionPercentage = Math.round(((learningCards.length + reviewCards.length + masteredCards.length) / totalCards) * 100);
                
                return (
                  <>
                    <div className="flex justify-between text-sm text-text-secondary mb-3">
                      <span className="font-medium">Learning Progress</span>
                      <span className="font-semibold">{completionPercentage}% started</span>
                    </div>
                    
                    {/* Multi-stage Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner overflow-hidden">
                      <div className="h-full flex">
                        {/* Learning Stage */}
                        {learningCards.length > 0 && (
                          <div 
                            className="bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-700 ease-out"
                            style={{ width: `${(learningCards.length / totalCards) * 100}%` }}
                            title={`${learningCards.length} learning`}
                          />
                        )}
                        {/* Review Stage */}
                        {reviewCards.length > 0 && (
                          <div 
                            className="bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-700 ease-out"
                            style={{ width: `${(reviewCards.length / totalCards) * 100}%` }}
                            title={`${reviewCards.length} in review`}
                          />
                        )}
                        {/* Mastered Stage */}
                        {masteredCards.length > 0 && (
                          <div 
                            className="bg-gradient-to-r from-green-400 to-green-500 transition-all duration-700 ease-out"
                            style={{ width: `${(masteredCards.length / totalCards) * 100}%` }}
                            title={`${masteredCards.length} mastered`}
                          />
                        )}
                      </div>
                    </div>
                    
                    {/* Progress Legend */}
                    <div className="flex justify-between items-center text-xs text-text-muted mt-3">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                          <span>{newCards.length} new</span>
                        </div>
                        {learningCards.length > 0 && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <span>{learningCards.length} learning</span>
                          </div>
                        )}
                        {reviewCards.length > 0 && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                            <span>{reviewCards.length} review</span>
                          </div>
                        )}
                        {masteredCards.length > 0 && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span>{masteredCards.length} mastered</span>
                          </div>
                        )}
                      </div>
                      <span className="font-medium">{cards.length} total</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Primary Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            {cards.length > 0 && (
              <Button onClick={handleStartStudy} className="flex items-center justify-center gap-2 min-h-[48px] text-base font-semibold">
                <AcademicCapIcon className="w-5 h-5" />
                Study Now
              </Button>
            )}
            <Button 
              variant="secondary" 
              onClick={() => setShowCreateCard(true)}
              className="flex items-center justify-center gap-2 min-h-[48px]"
            >
              <PlusCircleIcon className="w-5 h-5" />
              Add Card
            </Button>
          </div>
          <Button 
            variant="secondary" 
            onClick={handleImportCards}
            className="flex items-center justify-center gap-2 min-h-[48px] w-full sm:w-auto"
          >
            <ArrowUpOnSquareIcon className="w-5 h-5" />
            Import
          </Button>
        </div>

        {/* Cards Section */}
        {cards.length === 0 ? (
          // Empty State
          <div className="text-center py-20 bg-surface rounded-2xl border border-border">
            <div className="w-24 h-24 bg-gradient-to-br from-surface-elevated to-surface rounded-3xl flex items-center justify-center mx-auto mb-8 border border-border-light shadow-card">
              <span className="text-5xl">🐻</span>
            </div>
            <h3 className="text-3xl font-display font-semibold text-text-primary mb-4">
              No cards yet
            </h3>
            <p className="text-text-secondary mb-8 text-lg leading-relaxed max-w-md mx-auto">
              Start building your flashcard collection. Add cards manually or import from your existing materials.
            </p>
            <div className="flex justify-center gap-4">
              <Button size="lg" onClick={() => setShowCreateCard(true)} className="flex items-center gap-2">
                <PlusCircleIcon className="w-5 h-5" />
                Add Your First Card
              </Button>
              <Button size="lg" variant="secondary" onClick={handleImportCards} className="flex items-center gap-2">
                <ArrowUpOnSquareIcon className="w-5 h-5" />
                Import Your Cards
              </Button>
            </div>
          </div>
        ) : (
          // Cards Management
          <div className="bg-surface rounded-2xl border border-border overflow-hidden">
            {/* Cards Header */}
            <div className="px-6 py-4 border-b border-border bg-surface-elevated">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-semibold text-text-primary">
                    Cards ({cards.length})
                  </h3>
                  {cards.length > 0 && (
                    <button
                      onClick={handleResetProgress}
                      className="flex items-center gap-2 px-3 py-1 text-text-muted hover:text-koda-primary transition-all duration-200 hover:bg-koda-primary/10 rounded-lg text-sm min-h-[36px]"
                      title="Reset all progress"
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                      Reset Progress
                    </button>
                  )}
                  {selectedCards.size > 0 && (
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-text-secondary">
                        {selectedCards.size} selected
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleBulkDelete}
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                      >
                        Delete Selected
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSelectAllCards}
                  >
                    {selectedCards.size === cards.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Cards List */}
            <div className="p-6">
              <CardList 
                cards={cards}
                selectedCards={selectedCards}
                onCardDeleted={handleCardDeleted}
                onCardUpdated={fetchDeckData}
                onCardSelect={handleSelectCard}
              />
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {showCreateCard && (
        <CreateCardModal
          deck={deck}
          onClose={() => setShowCreateCard(false)}
          onCardCreated={handleCardCreated}
        />
      )}
      
      {showEditDeck && (
        <EditDeckModal
          deck={deck}
          onClose={() => setShowEditDeck(false)}
          onDeckUpdated={handleDeckUpdated}
        />
      )}

      {showImport && (
        <ImportModal
          deck={deck}
          onClose={() => setShowImport(false)}
          onImportComplete={handleImportComplete}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText || "Delete"}
        confirmVariant="danger"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} })}
      />
    </div>
  );
};

export default DeckViewPage;