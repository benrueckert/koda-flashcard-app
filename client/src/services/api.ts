/**
 * API Service Layer
 * 
 * Handles all HTTP requests to the Koda backend API.
 */

import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type {
  PaginatedResponse,
  Deck,
  Card,
  StudySession,
  StudyStats,
  CreateDeckData,
  UpdateDeckData,
  CreateCardData,
  UpdateCardData,
  ReviewData,
  ReviewResult,
} from '../types';

// Create axios instance with default config
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (
    typeof window !== 'undefined' && window.location.origin.includes('vercel.app')
      ? '/api'
      : 'http://localhost:3001/api'
  ),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});


// Demo mode detection and localStorage fallback
let isDemoMode = false;

// Demo mode localStorage keys
const DEMO_KEYS = {
  decks: 'koda_demo_decks',
  cards: 'koda_demo_cards',
  sessions: 'koda_demo_sessions',
} as const;

// Demo mode utilities
const generateId = () => Math.random().toString(36).substr(2, 9);

const getDemoData = <T>(key: keyof typeof DEMO_KEYS, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(DEMO_KEYS[key]);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setDemoData = <T>(key: keyof typeof DEMO_KEYS, data: T): void => {
  try {
    localStorage.setItem(DEMO_KEYS[key], JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save demo data to localStorage:', error);
  }
};

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    // Check if API is completely unavailable (network error, connection refused)
    if (!error.response && (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED' || error.message.includes('Network Error'))) {
      isDemoMode = true;
      
      // Return a demo mode error that components can handle gracefully
      return Promise.reject({
        message: 'Demo mode - API unavailable',
        status: 0,
        isDemoMode: true,
        data: null,
      });
    }
    
    // Format error for consistent handling
    const apiError = {
      message: error.response?.data?.error || error.message || 'An unexpected error occurred',
      status: error.response?.status || 500,
      data: error.response?.data,
      isDemoMode,
    };
    
    return Promise.reject(apiError);
  }
);

// API Service Class
export class ApiService {

  // Decks
  static async getDecks(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ decks: Deck[]; pagination: any }> {
    try {
      const response = await api.get<{ decks: Deck[]; pagination: any }>('/decks', { params });
      return response.data;
    } catch (error: any) {
      if (error.isDemoMode || error.status === 0) {
        // Fallback to demo mode
        isDemoMode = true;
        const decks = getDemoData('decks', [] as Deck[]);
        return { 
          decks, 
          pagination: { page: 1, limit: 50, total: decks.length, totalPages: 1 }
        };
      }
      throw error;
    }
  }

  static async getDeck(id: string): Promise<{ deck: Deck }> {
    try {
      const response = await api.get<{ deck: Deck }>(`/decks/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.isDemoMode || error.status === 0) {
        // Fallback to demo mode
        isDemoMode = true;
        const decks = getDemoData('decks', [] as Deck[]);
        const deck = decks.find(d => d.id === id);
        if (!deck) {
          throw { message: 'Deck not found', status: 404 };
        }
        return { deck };
      }
      throw error;
    }
  }

  static async createDeck(data: CreateDeckData): Promise<{ deck: Deck }> {
    try {
      const response = await api.post<{ deck: Deck }>('/decks', data);
      return response.data;
    } catch (error: any) {
      if (error.isDemoMode || error.status === 0) {
        // Fallback to demo mode
        isDemoMode = true;
        const decks = getDemoData('decks', [] as Deck[]);
        const newDeck: Deck = {
          id: generateId(),
          name: data.name,
          description: data.description || '',
          isPublic: data.isPublic || false,
          tags: data.tags || '',
          cardCount: 0,
          dueCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const updatedDecks = [newDeck, ...decks];
        setDemoData('decks', updatedDecks);
        return { deck: newDeck };
      }
      throw error;
    }
  }

  static async updateDeck(id: string, data: UpdateDeckData): Promise<{ deck: Deck }> {
    try {
      const response = await api.put<{ deck: Deck }>(`/decks/${id}`, data);
      return response.data;
    } catch (error: any) {
      if (error.isDemoMode || error.status === 0) {
        // Fallback to demo mode
        isDemoMode = true;
        const decks = getDemoData('decks', [] as Deck[]);
        const deckIndex = decks.findIndex(deck => deck.id === id);
        if (deckIndex === -1) {
          throw { message: 'Deck not found', status: 404 };
        }
        
        const updatedDeck = {
          ...decks[deckIndex],
          ...data,
          updatedAt: new Date(),
        };
        
        const updatedDecks = [...decks];
        updatedDecks[deckIndex] = updatedDeck;
        setDemoData('decks', updatedDecks);
        
        return { deck: updatedDeck };
      }
      throw error;
    }
  }

  static async deleteDeck(id: string): Promise<void> {
    try {
      await api.delete(`/decks/${id}`);
    } catch (error: any) {
      if (error.isDemoMode || error.status === 0) {
        // Fallback to demo mode
        isDemoMode = true;
        const decks = getDemoData('decks', [] as Deck[]);
        const deckExists = decks.some(deck => deck.id === id);
        if (!deckExists) {
          throw { message: 'Deck not found', status: 404 };
        }
        
        // Remove deck from storage
        const updatedDecks = decks.filter(deck => deck.id !== id);
        setDemoData('decks', updatedDecks);
        
        // Also remove all cards from this deck
        const cards = getDemoData('cards', [] as Card[]);
        const updatedCards = cards.filter(card => card.deckId !== id);
        setDemoData('cards', updatedCards);
        
        return;
      }
      throw error;
    }
  }

  static async getDeckStudyCards(id: string, limit?: number): Promise<{ cards: Card[]; totalDue: number }> {
    const response = await api.get<{ cards: Card[]; totalDue: number }>(`/decks/${id}/study`, {
      params: { limit },
    });
    return response.data;
  }

  static async resetDeckProgress(id: string): Promise<{ message: string; cardsReset: number }> {
    try {
      const response = await api.post<{ message: string; cardsReset: number }>(`/decks/${id}/reset-progress`);
      return response.data;
    } catch (error: any) {
      if (error.isDemoMode || error.status === 0) {
        // Fallback to demo mode
        isDemoMode = true;
        const cards = getDemoData('cards', [] as Card[]);
        const deckCards = cards.filter(card => card.deckId === id);
        
        if (deckCards.length === 0) {
          throw { message: 'Deck not found', status: 404 };
        }
        
        // Reset all cards in the deck
        const updatedCards = cards.map(card => 
          card.deckId === id 
            ? {
                ...card,
                stage: 'new' as const,
                interval: 1.0,
                easeFactor: 2.5,
                reviewCount: 0,
                consecutiveCorrect: 0,
                nextReviewAt: new Date(),
                updatedAt: new Date(),
              }
            : card
        );
        
        setDemoData('cards', updatedCards);
        
        return {
          message: 'Progress reset successfully',
          cardsReset: deckCards.length
        };
      }
      throw error;
    }
  }

  // Cards
  static async getCard(id: string): Promise<{ card: Card }> {
    const response = await api.get<{ card: Card }>(`/cards/${id}`);
    return response.data;
  }

  static async createCard(data: CreateCardData): Promise<{ card: Card }> {
    try {
      const response = await api.post<{ card: Card }>('/cards', data);
      return response.data;
    } catch (error: any) {
      if (error.isDemoMode || error.status === 0) {
        // Fallback to demo mode
        isDemoMode = true;
        const cards = getDemoData('cards', [] as Card[]);
        const newCard: Card = {
          id: generateId(),
          deckId: data.deckId,
          front: data.front,
          back: data.back,
          hint: data.hint || '',
          type: data.type || 'basic',
          tags: data.tags || '',
          stage: 'new',
          interval: 1.0,
          easeFactor: 2.5,
          reviewCount: 0,
          consecutiveCorrect: 0,
          nextReviewAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const updatedCards = [newCard, ...cards];
        setDemoData('cards', updatedCards);
        
        // Update deck card count
        const decks = getDemoData('decks', [] as Deck[]);
        const updatedDecks = decks.map(deck => 
          deck.id === data.deckId 
            ? { ...deck, cardCount: deck.cardCount + 1 }
            : deck
        );
        setDemoData('decks', updatedDecks);
        
        return { card: newCard };
      }
      throw error;
    }
  }

  static async updateCard(id: string, data: UpdateCardData): Promise<{ card: Card }> {
    try {
      const response = await api.put<{ card: Card }>(`/cards/${id}`, data);
      return response.data;
    } catch (error: any) {
      if (error.isDemoMode || error.status === 0) {
        // Fallback to demo mode
        isDemoMode = true;
        const cards = getDemoData('cards', [] as Card[]);
        const cardIndex = cards.findIndex(card => card.id === id);
        if (cardIndex === -1) {
          throw { message: 'Card not found', status: 404 };
        }
        
        const updatedCard = {
          ...cards[cardIndex],
          ...data,
          updatedAt: new Date(),
        };
        
        const updatedCards = [...cards];
        updatedCards[cardIndex] = updatedCard;
        setDemoData('cards', updatedCards);
        
        return { card: updatedCard };
      }
      throw error;
    }
  }

  static async deleteCard(id: string): Promise<void> {
    try {
      await api.delete(`/cards/${id}`);
    } catch (error: any) {
      if (error.isDemoMode || error.status === 0) {
        // Fallback to demo mode
        isDemoMode = true;
        const cards = getDemoData('cards', [] as Card[]);
        const cardExists = cards.some(card => card.id === id);
        if (!cardExists) {
          throw { message: 'Card not found', status: 404 };
        }
        
        // Get the card to find its deck
        const cardToDelete = cards.find(card => card.id === id);
        
        // Remove card from storage
        const updatedCards = cards.filter(card => card.id !== id);
        setDemoData('cards', updatedCards);
        
        // Update deck card count
        if (cardToDelete) {
          const decks = getDemoData('decks', [] as Deck[]);
          const updatedDecks = decks.map(deck => 
            deck.id === cardToDelete.deckId 
              ? { ...deck, cardCount: Math.max(0, deck.cardCount - 1) }
              : deck
          );
          setDemoData('decks', updatedDecks);
        }
        
        return;
      }
      throw error;
    }
  }

  static async createBatchCards(deckId: string, cards: Omit<CreateCardData, 'deckId'>[]): Promise<{ count: number }> {
    try {
      const response = await api.post<{ count: number }>('/cards/batch', {
        deckId,
        cards,
      });
      return response.data;
    } catch (error: any) {
      if (error.isDemoMode || error.status === 0) {
        // Fallback to demo mode
        isDemoMode = true;
        const existingCards = getDemoData('cards', [] as Card[]);
        
        // Verify deck exists
        const decks = getDemoData('decks', [] as Deck[]);
        const deck = decks.find(d => d.id === deckId);
        if (!deck) {
          throw { message: 'Deck not found', status: 404 };
        }
        
        // Create all new cards
        const newCards = cards.map(cardData => ({
          id: generateId(),
          deckId,
          front: cardData.front,
          back: cardData.back,
          hint: cardData.hint || '',
          type: cardData.type || 'basic',
          tags: cardData.tags || '',
          stage: 'new' as const,
          interval: 1.0,
          easeFactor: 2.5,
          reviewCount: 0,
          consecutiveCorrect: 0,
          nextReviewAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        
        // Add to storage
        const updatedCards = [...newCards, ...existingCards];
        setDemoData('cards', updatedCards);
        
        // Update deck card count
        const updatedDecks = decks.map(d => 
          d.id === deckId 
            ? { ...d, cardCount: d.cardCount + newCards.length }
            : d
        );
        setDemoData('decks', updatedDecks);
        
        return { count: newCards.length };
      }
      throw error;
    }
  }

  static async getDeckCards(deckId: string, params?: {
    page?: number;
    limit?: number;
    search?: string;
    stage?: string;
  }): Promise<{ cards: Card[]; pagination: any }> {
    try {
      const response = await api.get<{ cards: Card[]; pagination: any }>(`/cards/deck/${deckId}`, { params });
      return response.data;
    } catch (error: any) {
      if (error.isDemoMode || error.status === 0) {
        // Fallback to demo mode
        isDemoMode = true;
        const allCards = getDemoData('cards', [] as Card[]);
        const deckCards = allCards.filter(card => card.deckId === deckId);
        return { 
          cards: deckCards, 
          pagination: { page: 1, limit: 1000, total: deckCards.length, totalPages: 1 }
        };
      }
      throw error;
    }
  }

  // Study Sessions
  static async startStudySession(data: {
    deckId: string;
    sessionType?: 'review' | 'learn' | 'mixed';
    maxCards?: number;
  }): Promise<{ session: StudySession; cards: Card[] }> {
    try {
      const response = await api.post<{ session: StudySession; cards: Card[] }>('/study/session', data);
      return response.data;
    } catch (error: any) {
      if (error.isDemoMode || error.status === 0) {
        // Fallback to demo mode
        isDemoMode = true;
        
        // Verify deck exists
        const decks = getDemoData('decks', [] as Deck[]);
        const deck = decks.find(d => d.id === data.deckId);
        if (!deck) {
          throw { message: 'Deck not found', status: 404 };
        }
        
        // Get cards for study (not mastered)
        const allCards = getDemoData('cards', [] as Card[]);
        const deckCards = allCards.filter(card => 
          card.deckId === data.deckId && card.stage !== 'mastered'
        );
        
        // Limit cards for session
        const maxCards = data.maxCards || 20;
        const cardsForStudy = deckCards
          .sort((a, b) => new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime())
          .slice(0, maxCards);
        
        // Create demo study session
        const session = {
          id: generateId(),
          deckId: data.deckId,
          sessionType: data.sessionType || 'mixed',
          cardsStudied: 0,
          cardsCorrect: 0,
          totalTime: 0,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        // Store session in localStorage
        const sessions = getDemoData('sessions', [] as StudySession[]);
        setDemoData('sessions', [session, ...sessions]);
        
        return { session, cards: cardsForStudy };
      }
      throw error;
    }
  }

  static async submitReview(reviewData: ReviewData, retries: number = 0): Promise<ReviewResult> {
    try {
      const response = await api.post<ReviewResult>('/study/review', reviewData);
      return response.data;
    } catch (error: any) {
      if (error.isDemoMode || error.status === 0) {
        // Fallback to demo mode
        isDemoMode = true;
        
        const { cardId, quality, responseTime, wasCorrect } = reviewData;
        
        // Get the card
        const cards = getDemoData('cards', [] as Card[]);
        const cardIndex = cards.findIndex(card => card.id === cardId);
        if (cardIndex === -1) {
          throw { message: 'Card not found', status: 404 };
        }
        
        const card = cards[cardIndex];
        
        // Apply spaced repetition algorithm
        let newInterval = card.interval;
        let newEaseFactor = card.easeFactor;
        let newStage = card.stage;
        let newConsecutiveCorrect = card.consecutiveCorrect || 0;
        
        if (wasCorrect) {
          newConsecutiveCorrect = newConsecutiveCorrect + 1;
          
          // Stage progression
          if (card.stage === 'new') {
            newStage = 'learning';
            newInterval = quality >= 4 ? 2 : 1;
          } else if (card.stage === 'learning') {
            if (newConsecutiveCorrect >= 2 && quality >= 3) {
              newStage = 'review';
              newInterval = quality >= 4 ? 5 : 4;
            } else {
              newInterval = Math.max(1, Math.round(card.interval * 1.3));
            }
          } else if (card.stage === 'review') {
            if (newConsecutiveCorrect >= 3 && quality >= 4) {
              newStage = 'mastered';
            }
            newInterval = Math.max(1, Math.round(card.interval * newEaseFactor));
          } else if (card.stage === 'mastered') {
            newInterval = Math.max(7, Math.round(card.interval * newEaseFactor));
          }
          
          // Adjust ease factor
          if (quality >= 4) {
            newEaseFactor = Math.min(2.8, newEaseFactor + 0.1);
          } else if (quality === 3) {
            newEaseFactor = Math.min(2.8, newEaseFactor + 0.05);
          }
        } else {
          // Failed review
          newConsecutiveCorrect = 0;
          newEaseFactor = Math.max(1.3, newEaseFactor - 0.2);
          
          if (card.stage === 'mastered' || card.stage === 'review') {
            newStage = 'learning';
            newInterval = 1;
          } else if (card.stage === 'learning') {
            newStage = 'new';
            newInterval = 0.5;
          } else {
            newInterval = 0.25;
          }
        }
        
        const nextReviewAt = new Date();
        nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);
        
        // Update card
        const updatedCard = {
          ...card,
          stage: newStage,
          interval: newInterval,
          easeFactor: newEaseFactor,
          nextReviewAt,
          reviewCount: card.reviewCount + 1,
          consecutiveCorrect: newConsecutiveCorrect,
          updatedAt: new Date(),
        };
        
        const updatedCards = [...cards];
        updatedCards[cardIndex] = updatedCard;
        setDemoData('cards', updatedCards);
        
        return {
          card: updatedCard,
          nextReviewAt,
          interval: newInterval
        };
      }
      
      // Log the error for debugging
      console.error('API submitReview error:', {
        error: error.message,
        status: error.response?.status || error.status,
        data: error.response?.data || error.data,
        reviewData,
        fullError: error
      });
      
      // Retry logic for network errors (not validation errors)
      const statusCode = error.response?.status || error.status || 0;
      if (retries < 2 && (statusCode === 0 || statusCode >= 500)) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1))); // Exponential backoff
        return this.submitReview(reviewData, retries + 1);
      }
      
      // Re-throw the error with additional context
      throw {
        ...error,
        message: error.response?.data?.message || error.message || 'Review submission failed',
        status: statusCode,
        data: error.response?.data || error.data || {},
        isNetworkError: statusCode === 0 || !error.response,
        isServerError: statusCode >= 500
      };
    }
  }

  static async completeSession(sessionId: string, data: {
    cardsStudied: number;
    cardsCorrect: number;
    totalTime: number;
  }): Promise<{ session: StudySession; accuracy: number }> {
    try {
      const response = await api.put<{ session: StudySession; accuracy: number }>(
        `/study/session/${sessionId}/complete`,
        data
      );
      return response.data;
    } catch (error: any) {
      if (error.isDemoMode || error.status === 0) {
        // Fallback to demo mode
        isDemoMode = true;
        
        const sessions = getDemoData('sessions', [] as StudySession[]);
        const sessionIndex = sessions.findIndex(s => s.id === sessionId);
        if (sessionIndex === -1) {
          throw { message: 'Study session not found', status: 404 };
        }
        
        // Update session with completion data
        const completedSession = {
          ...sessions[sessionIndex],
          cardsStudied: data.cardsStudied,
          cardsCorrect: data.cardsCorrect,
          totalTime: data.totalTime,
          completedAt: new Date(),
          updatedAt: new Date(),
        };
        
        const updatedSessions = [...sessions];
        updatedSessions[sessionIndex] = completedSession;
        setDemoData('sessions', updatedSessions);
        
        // Calculate accuracy
        const accuracy = data.cardsStudied > 0 ? Math.round((data.cardsCorrect / data.cardsStudied) * 100) : 0;
        
        return { session: completedSession, accuracy };
      }
      throw error;
    }
  }

  static async getDueCards(limit?: number): Promise<{ cards: Card[]; totalDue: number }> {
    try {
      const response = await api.get<{ cards: Card[]; totalDue: number }>('/study/due', {
        params: { limit },
      });
      return response.data;
    } catch (error: any) {
      if (error.isDemoMode || error.status === 0) {
        // Fallback to demo mode
        isDemoMode = true;
        
        const allCards = getDemoData('cards', [] as Card[]);
        const now = new Date();
        
        // Find cards that are due for study
        const dueCards = allCards.filter(card => 
          card.nextReviewAt <= now || card.stage === 'new'
        );
        
        // Sort by next review date and creation date
        const sortedCards = dueCards.sort((a, b) => {
          const aTime = new Date(a.nextReviewAt).getTime();
          const bTime = new Date(b.nextReviewAt).getTime();
          if (aTime !== bTime) return aTime - bTime;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        
        const cardsToReturn = limit ? sortedCards.slice(0, limit) : sortedCards;
        
        return {
          cards: cardsToReturn,
          totalDue: dueCards.length
        };
      }
      throw error;
    }
  }

  static async getStudyStats(period?: number): Promise<{ stats: StudyStats }> {
    const response = await api.get<{ stats: StudyStats }>('/study/stats', {
      params: { period },
    });
    return response.data;
  }
}

// Demo mode utilities
export const getDemoMode = () => isDemoMode;
export const setDemoMode = (enabled: boolean) => { isDemoMode = enabled; };

// Export the axios instance for custom requests if needed
export { api };
export default ApiService;