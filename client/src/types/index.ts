/**
 * Shared TypeScript Types for Koda Frontend
 */

// API Response Types
export interface ApiResponse<T = unknown> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: ValidationError[];
  timestamp?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}


// Deck Types
export interface Deck {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  tags: string;
  cardCount: number;
  dueCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeckData {
  name: string;
  description?: string;
  tags?: string;
  isPublic?: boolean;
}

export interface UpdateDeckData extends Partial<CreateDeckData> {}

// Card Types
export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  hint?: string;
  type: string;
  tags: string;
  stage: 'new' | 'learning' | 'review' | 'mastered';
  interval: number;
  easeFactor: number;
  nextReviewAt: Date;
  reviewCount: number;
  consecutiveCorrect: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCardData {
  deckId: string;
  front: string;
  back: string;
  hint?: string;
  type?: string;
  tags?: string;
}

export interface UpdateCardData extends Partial<Omit<CreateCardData, 'deckId'>> {}

// Study Types
export interface StudySession {
  id: string;
  deckId: string;
  sessionType: string;
  cardsStudied: number;
  cardsCorrect: number;
  totalTime: number;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudyCard extends Card {
  // Additional study-specific properties can be added here
}

export interface ReviewData {
  cardId: string;
  sessionId?: string;
  quality: number; // 0-5 scale
  responseTime: number; // milliseconds
  wasCorrect: boolean;
}

export interface ReviewResult {
  card: Card;
  nextReviewAt: Date;
  interval: number;
}

export interface StudyStats {
  totalReviews: number;
  correctReviews: number;
  accuracy: number;
  averageResponseTime: number;
  totalDue: number;
  period: number;
}


// Component Props Types
export interface KodaBearProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  expression?: 'default' | 'thinking' | 'celebrating' | 'encouraging' | 'sleeping' | 'alert' | 
              'excited' | 'proud' | 'supportive' | 'cheering' | 'impressed' | 'worried' | 
              'focused' | 'relaxed' | 'surprised' | 'winking' | 'determined' | 'confused' |
              'trophy' | 'star' | 'fire' | 'rocket' | 'gentle' | 'patient' | 'understanding';
  className?: string;
  animation?: 'none' | 'bounce' | 'pulse' | 'wiggle' | 'float' | 'glow';
  message?: string;
  showMessage?: boolean;
}

// Store Types (for Zustand)

export interface DeckStore {
  decks: Deck[];
  currentDeck: Deck | null;
  isLoading: boolean;
  error: string | null;
  fetchDecks: () => Promise<void>;
  createDeck: (data: CreateDeckData) => Promise<Deck>;
  updateDeck: (id: string, data: UpdateDeckData) => Promise<Deck>;
  deleteDeck: (id: string) => Promise<void>;
  setCurrentDeck: (deck: Deck | null) => void;
}

export interface StudyStore {
  currentSession: StudySession | null;
  studyCards: StudyCard[];
  currentCardIndex: number;
  isStudying: boolean;
  sessionStats: {
    studied: number;
    correct: number;
    startTime: Date;
  };
  startSession: (deckId: string, sessionType?: 'review' | 'learn' | 'mixed') => Promise<void>;
  submitReview: (reviewData: ReviewData) => Promise<void>;
  endSession: () => Promise<void>;
  nextCard: () => void;
  previousCard: () => void;
}