/**
 * Dashboard Page
 * 
 * Main dashboard showing user's decks and study progress.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PencilSquareIcon, TrashIcon, PlusCircleIcon, AcademicCapIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useDeckStore } from '../stores';
import { Button, KodaBear, CreateDeckModal, EditDeckModal, ConfirmModal, SettingsDropdown } from '../components';
import { ApiService } from '../services';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { decks, isLoading, fetchDecks } = useDeckStore();
  const [showCreateDeck, setShowCreateDeck] = useState(false);
  const [deletingDeckId, setDeletingDeckId] = useState<string | null>(null);
  const [editingDeck, setEditingDeck] = useState<any>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    fetchDecks().catch(console.error);
  }, [fetchDecks]);


  const handleDeleteDeck = async (deckId: string, deckName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Deck',
      message: `Are you sure you want to delete "${deckName}"? This action cannot be undone.`,
      onConfirm: () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        executeDeleteDeck(deckId);
      }
    });
  };

  const executeDeleteDeck = async (deckId: string) => {
    try {
      setDeletingDeckId(deckId);
      await ApiService.deleteDeck(deckId);
      fetchDecks(); // Refresh the deck list
    } catch (error: any) {
      alert(error.message || 'Failed to delete deck');
    } finally {
      setDeletingDeckId(null);
    }
  };

  const handleEditDeck = (deck: any) => {
    setEditingDeck(deck);
  };

  const handleDeckUpdated = (updatedDeck: any) => {
    setEditingDeck(null);
    fetchDecks(); // Refresh deck list
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <KodaBear size="lg" expression="thinking" className="mx-auto mb-4" />
          <p className="text-text-primary">Loading your decks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface/95 backdrop-blur-sm border-b border-border shadow-subtle sticky top-0 z-50 pt-safe">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center group">
              <span className="text-2xl mr-3">🐻</span>
              <h1 className="text-2xl font-display font-bold text-text-primary group-hover:text-koda-primary transition-colors duration-200">Koda</h1>
            </div>
            <div className="flex items-center space-x-3 sm:space-x-6">
              <SettingsDropdown />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 pb-safe">
        {decks.length === 0 ? (
          // Empty State
          <div className="text-center py-12 sm:py-24 animate-fade-in px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-surface-elevated to-surface rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8 border border-border-light shadow-card hover:shadow-card-hover transition-all duration-500 hover:scale-105">
              <span className="text-3xl sm:text-4xl animate-bounce-gentle">🐻</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-text-primary mb-4 sm:mb-6">
              Ready to Start Learning?
            </h2>
            <p className="text-lg sm:text-xl text-text-secondary mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed">
              Create your first flashcard deck and master any subject with intelligent spaced repetition. Let's begin your learning journey together!
            </p>
            <Button 
              size="lg" 
              onClick={() => setShowCreateDeck(true)}
              className="w-full sm:w-auto px-8 py-4 text-lg font-semibold shadow-card hover:shadow-card-hover transform hover:scale-105 active:scale-95 transition-all duration-300"
            >
              Create Your First Deck ✨
            </Button>
          </div>
        ) : (
          // Decks Grid
          <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 sm:mb-12 gap-4">
              <div>
                <h2 className="text-3xl sm:text-4xl font-display font-bold text-text-primary mb-2">
                  Your Decks
                </h2>
                <p className="text-base sm:text-lg text-text-secondary">
                  Continue your learning journey with these decks
                </p>
              </div>
              <Button 
                onClick={() => setShowCreateDeck(true)}
                className="w-full sm:w-auto shadow-card hover:shadow-card-hover transform hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <PlusCircleIcon className="w-5 h-5" />
                <span>Create New Deck</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {decks.map((deck, index) => (
                <div 
                  key={deck.id} 
                  className="group bg-surface rounded-2xl border border-border p-4 sm:p-6 lg:p-8 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 sm:hover:-translate-y-2 animate-slide-up flex flex-col h-80 sm:h-80"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Header Section - Fixed Height */}
                  <div className="flex items-start justify-between mb-4 sm:mb-6">
                    <h3 className="text-xl sm:text-2xl font-display font-semibold text-text-primary line-clamp-2 group-hover:text-koda-primary transition-colors duration-200 min-h-[3rem] sm:min-h-[3.5rem] flex items-center">
                      {deck.name}
                    </h3>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditDeck(deck);
                        }}
                        className="p-2 text-text-muted hover:text-koda-primary transition-all duration-200 hover:bg-surface-elevated rounded-lg"
                        title="Edit deck"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDeck(deck.id, deck.name);
                        }}
                        disabled={deletingDeckId === deck.id}
                        className="p-2 text-text-muted hover:text-error transition-all duration-200 hover:bg-error-light rounded-lg disabled:opacity-50"
                        title="Delete deck"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Description Section - Fixed Height with Flex Grow */}
                  <div className="flex-1 mb-3 sm:mb-6 min-h-[3rem] sm:min-h-[4.5rem] flex items-start">
                    <p className="text-text-secondary line-clamp-2 sm:line-clamp-3 leading-relaxed text-sm sm:text-base">
                      {deck.description && deck.description.length > 100 
                        ? `${deck.description.substring(0, 100)}...` 
                        : deck.description || 'No description provided'}
                    </p>
                  </div>

                  {/* Stats Section - Fixed Position */}
                  <div className="flex justify-between items-center text-sm mb-4 sm:mb-6">
                    <div className="flex items-center space-x-1">
                      <span className="text-text-primary font-semibold">{deck.cardCount}</span>
                      <span className="text-text-secondary">cards</span>
                    </div>
                    <div className={`flex items-center space-x-1 px-3 py-1 rounded-full ${
                      deck.dueCount > 0 
                        ? 'bg-koda-primary/10 text-koda-primary font-semibold' 
                        : 'bg-gray-100 text-text-secondary'
                    }`}>
                      <span className="font-semibold">{deck.dueCount}</span>
                      <span>due</span>
                    </div>
                  </div>

                  {/* Buttons Section - Always at Bottom */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-auto pt-2 pb-3">
                    <Button 
                      size="sm" 
                      className="flex-1 min-h-[44px] shadow-button hover:shadow-button-hover flex items-center justify-center gap-2"
                      onClick={() => navigate(`/study/${deck.id}`)}
                      disabled={deck.cardCount === 0}
                    >
                      <AcademicCapIcon className="w-5 h-5" />
                      Study
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="flex-1 min-h-[44px] flex items-center justify-center gap-2"
                      onClick={() => navigate(`/deck/${deck.id}`)}
                    >
                      <EyeIcon className="w-5 h-5" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Create Deck Modal */}
      {showCreateDeck && (
        <CreateDeckModal onClose={() => setShowCreateDeck(false)} />
      )}
      
      {/* Edit Deck Modal */}
      {editingDeck && (
        <EditDeckModal
          deck={editingDeck}
          onClose={() => setEditingDeck(null)}
          onDeckUpdated={handleDeckUpdated}
        />
      )}

      {/* Delete Confirmation Modal */}
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

export default DashboardPage;