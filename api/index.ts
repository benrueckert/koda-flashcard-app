import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

// Extend global types
declare global {
  var prisma: PrismaClient | undefined;
}

// Initialize Prisma client
let prisma: PrismaClient;
if (!global.prisma) {
  global.prisma = new PrismaClient();
}
prisma = global.prisma;

// Schemas


const createDeckSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isPublic: z.boolean().optional().default(false),
  tags: z.string().optional().default(""),
});

const updateDeckSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
  tags: z.string().optional(),
});

const createCardSchema = z.object({
  deckId: z.string(),
  front: z.string().min(1),
  back: z.string().min(1),
  hint: z.string().optional(),
  type: z.string().optional().default("basic"),
  tags: z.string().optional().default(""),
});

const updateCardSchema = z.object({
  front: z.string().min(1).optional(),
  back: z.string().min(1).optional(),
  hint: z.string().optional(),
  type: z.string().optional(),
  tags: z.string().optional(),
});

const startStudySessionSchema = z.object({
  deckId: z.string(),
  sessionType: z.string().optional().default("mixed"),
  maxCards: z.number().optional().default(20),
});

const reviewSchema = z.object({
  cardId: z.string(),
  sessionId: z.string().optional(),
  quality: z.number().min(0).max(5),
  responseTime: z.number(),
  wasCorrect: z.boolean(),
});

const completeSessionSchema = z.object({
  cardsStudied: z.number(),
  cardsCorrect: z.number(),
  totalTime: z.number(),
});

const batchCreateCardsSchema = z.object({
  deckId: z.string(),
  cards: z.array(z.object({
    front: z.string().min(1),
    back: z.string().min(1),
    hint: z.string().optional(),
    type: z.string().optional().default("basic"),
    tags: z.string().optional().default(""),
  })),
});

// Simple rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function rateLimit(req: VercelRequest, res: VercelResponse, limit: number = 100, windowMs: number = 15 * 60 * 1000) {
  const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const key = `${clientIp}:${req.url}`;
  
  const clientData = rateLimitStore.get(key);
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (clientData.count >= limit) {
    res.status(429).json({ error: 'Too many requests' });
    return false;
  }
  
  clientData.count++;
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply rate limiting
  const limit = 100;
  
  if (!rateLimit(req, res, limit)) {
    return; // Rate limit exceeded
  }

  // Set CORS headers - more restrictive
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'https://koda-flashcard-app.vercel.app'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin || '')) {
    res.setHeader('Access-Control-Allow-Origin', origin!);
  } else if (process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Only in development
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Remove 'api' from path segments
    if (pathSegments[0] === 'api') {
      pathSegments.shift();
    }


    // Route: /api/decks
    if (pathSegments[0] === 'decks' && pathSegments.length === 1) {
      if (req.method === 'GET') {
        const decks = await prisma.deck.findMany({
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { cards: true } } }
        });
        
        return res.status(200).json({
          decks: decks.map(deck => ({ ...deck, cardCount: deck._count.cards, dueCount: 0 })),
          pagination: { page: 1, limit: 50, total: decks.length, totalPages: 1 }
        });
      }
      
      if (req.method === 'POST') {
        const { name, description, isPublic, tags } = createDeckSchema.parse(req.body);
        const deck = await prisma.deck.create({
          data: { name, description, isPublic, tags },
          include: { _count: { select: { cards: true } } }
        });
        
        return res.status(201).json({
          deck: { ...deck, cardCount: deck._count.cards }
        });
      }
    }

    // Route: /api/decks/[id]
    if (pathSegments[0] === 'decks' && pathSegments.length === 2) {
      const deckId = pathSegments[1];
      
      if (req.method === 'GET') {
        const deck = await prisma.deck.findUnique({
          where: { id: deckId },
          include: { _count: { select: { cards: true } } }
        });
        
        if (!deck) {
          return res.status(404).json({ error: 'Deck not found' });
        }
        
        return res.status(200).json({
          deck: { ...deck, cardCount: deck._count.cards }
        });
      }
      
      if (req.method === 'PUT') {
        const updateData = updateDeckSchema.parse(req.body);
        const existingDeck = await prisma.deck.findUnique({
          where: { id: deckId }
        });
        
        if (!existingDeck) {
          return res.status(404).json({ error: 'Deck not found' });
        }
        
        const deck = await prisma.deck.update({
          where: { id: deckId },
          data: updateData,
          include: { _count: { select: { cards: true } } }
        });
        
        return res.status(200).json({
          deck: { ...deck, cardCount: deck._count.cards }
        });
      }
      
      if (req.method === 'DELETE') {
        const existingDeck = await prisma.deck.findUnique({
          where: { id: deckId }
        });
        
        if (!existingDeck) {
          return res.status(404).json({ error: 'Deck not found' });
        }
        
        await prisma.deck.delete({ where: { id: deckId } });
        return res.status(200).json({ message: 'Deck deleted successfully' });
      }
    }

    // Route: /api/cards/deck/[deckId]
    if (pathSegments[0] === 'cards' && pathSegments[1] === 'deck' && pathSegments.length === 3) {
      const deckId = pathSegments[2];
      
      if (req.method === 'GET') {
        const deck = await prisma.deck.findUnique({
          where: { id: deckId }
        });
        
        if (!deck) {
          return res.status(404).json({ error: 'Deck not found' });
        }
        
        const cards = await prisma.card.findMany({
          where: { deckId },
          orderBy: { createdAt: 'desc' }
        });
        
        return res.status(200).json({
          cards,
          pagination: { page: 1, limit: 1000, total: cards.length, totalPages: 1 }
        });
      }
    }

    // Route: /api/cards
    if (pathSegments[0] === 'cards' && pathSegments.length === 1) {
      if (req.method === 'POST') {
        const { deckId, front, back, hint, type, tags } = createCardSchema.parse(req.body);
        
        const deck = await prisma.deck.findUnique({
          where: { id: deckId }
        });
        
        if (!deck) {
          return res.status(404).json({ error: 'Deck not found' });
        }
        
        const card = await prisma.card.create({
          data: { deckId, front, back, hint, type, tags },
        });
        
        return res.status(201).json({ card });
      }
    }

    // Route: /api/cards/batch
    if (pathSegments[0] === 'cards' && pathSegments[1] === 'batch' && req.method === 'POST') {
      const { deckId, cards } = batchCreateCardsSchema.parse(req.body);
      
      // Verify deck exists
      const deck = await prisma.deck.findUnique({
        where: { id: deckId }
      });
      
      if (!deck) {
        return res.status(404).json({ error: 'Deck not found' });
      }
      
      // Create all cards in a transaction
      const createdCards = await prisma.$transaction(
        cards.map(card => 
          prisma.card.create({
            data: {
              deckId,
              front: card.front,
              back: card.back,
              hint: card.hint,
              type: card.type || 'basic',
              tags: card.tags || ''
            }
          })
        )
      );
      
      return res.status(201).json({ 
        cards: createdCards,
        count: createdCards.length 
      });
    }

    // Route: /api/cards/[id]
    if (pathSegments[0] === 'cards' && pathSegments.length === 2 && pathSegments[1] !== 'deck' && pathSegments[1] !== 'batch') {
      const cardId = pathSegments[1];
      
      if (req.method === 'GET') {
        const card = await prisma.card.findUnique({
          where: { id: cardId },
          include: { deck: { select: { name: true } } }
        });
        
        if (!card) {
          return res.status(404).json({ error: 'Card not found' });
        }
        
        return res.status(200).json({ card });
      }
      
      if (req.method === 'PUT') {
        const updateData = updateCardSchema.parse(req.body);
        const existingCard = await prisma.card.findUnique({
          where: { id: cardId }
        });
        
        if (!existingCard) {
          return res.status(404).json({ error: 'Card not found' });
        }
        
        const card = await prisma.card.update({
          where: { id: cardId },
          data: updateData
        });
        
        return res.status(200).json({ card });
      }
      
      if (req.method === 'DELETE') {
        const existingCard = await prisma.card.findUnique({
          where: { id: cardId }
        });
        
        if (!existingCard) {
          return res.status(404).json({ error: 'Card not found' });
        }
        
        await prisma.card.delete({ where: { id: cardId } });
        return res.status(200).json({ message: 'Card deleted successfully' });
      }
    }


    // Route: /api/debug
    if (pathSegments[0] === 'debug' && req.method === 'GET') {
      // SECURITY: Only allow in development
      if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Not found' });
      }
      const databaseUrl = process.env.DATABASE_URL;
      
      let prismaStatus = 'not initialized';
      let connectionTest = 'not tested';
      
      try {
        prismaStatus = 'initialized';
        await prisma.$connect();
        const userCount = await prisma.user.count();
        connectionTest = `connected - ${userCount} users in database`;
      } catch (dbError) {
        connectionTest = `connection failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`;
      }
      
      return res.status(200).json({
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'unknown',
        databaseUrl: databaseUrl ? 'set' : 'not set',
        prismaStatus,
        connectionTest,
        vercelRegion: process.env.VERCEL_REGION || 'unknown'
      });
    }

    // Route: /api/study/session
    if (pathSegments[0] === 'study' && pathSegments[1] === 'session' && req.method === 'POST') {
      const { deckId, sessionType, maxCards } = startStudySessionSchema.parse(req.body);
      
      // Verify deck exists
      const deck = await prisma.deck.findUnique({
        where: { id: deckId }
      });
      
      if (!deck) {
        return res.status(404).json({ error: 'Deck not found' });
      }
      
      // Get all non-mastered cards for study
      const cards = await prisma.card.findMany({
        where: { 
          deckId,
          stage: { not: 'mastered' } // Get all cards that aren't mastered
        },
        take: maxCards,
        orderBy: [
          { nextReviewAt: 'asc' },
          { createdAt: 'asc' }
        ]
      });
      
      // Create study session
      const session = await prisma.studySession.create({
        data: {
          deckId,
          sessionType
        }
      });
      
      return res.status(200).json({ session, cards });
    }

    // Route: /api/study/review
    if (pathSegments[0] === 'study' && pathSegments[1] === 'review' && req.method === 'POST') {
      const { cardId, sessionId, quality, responseTime, wasCorrect } = reviewSchema.parse(req.body);
      
      // Verify session exists (if sessionId provided)
      let session = null;
      if (sessionId) {
        session = await prisma.studySession.findUnique({
          where: { id: sessionId }
        });
        
        if (!session) {
          return res.status(404).json({ error: 'Study session not found' });
        }
      }
      
      // Get the card
      const card = await prisma.card.findUnique({
        where: { id: cardId }
      });
      
      if (!card) {
        return res.status(404).json({ error: 'Card not found' });
      }
      
      // Enhanced spaced repetition with robust stage management
      let newInterval = card.interval;
      let newEaseFactor = card.easeFactor;
      let newStage = card.stage;
      let newConsecutiveCorrect = card.consecutiveCorrect || 0;
      
      if (wasCorrect) {
        newConsecutiveCorrect = newConsecutiveCorrect + 1;
        
        // Stage progression based on performance and consecutive correct answers
        if (card.stage === 'new') {
          newStage = 'learning';
          newInterval = quality >= 4 ? 2 : 1; // Easy = 2 days, Good = 1 day
        } else if (card.stage === 'learning') {
          // Graduate to review after consistent good performance
          if (newConsecutiveCorrect >= 2 && quality >= 3) {
            newStage = 'review';
            newInterval = quality >= 4 ? 5 : 4; // Easy = 5 days, Good = 4 days
          } else {
            // Stay in learning but increase interval slightly
            newInterval = Math.max(1, Math.round(card.interval * 1.3));
          }
        } else if (card.stage === 'review') {
          // Graduate to mastered after excellent consistent performance
          if (newConsecutiveCorrect >= 3 && quality >= 4) {
            newStage = 'mastered';
          } else if (newConsecutiveCorrect >= 4 && quality >= 3) {
            newStage = 'mastered';
          }
          // Continue with spaced repetition
          newInterval = Math.max(1, Math.round(card.interval * newEaseFactor));
        } else if (card.stage === 'mastered') {
          // Maintain mastered status with longer intervals
          newInterval = Math.max(7, Math.round(card.interval * newEaseFactor));
        }
        
        // Adjust ease factor based on quality (1-5 scale)
        if (quality >= 4) {
          newEaseFactor = Math.min(2.8, newEaseFactor + 0.1);
        } else if (quality === 3) {
          newEaseFactor = Math.min(2.8, newEaseFactor + 0.05);
        } else {
          newEaseFactor = Math.max(1.3, newEaseFactor - 0.1);
        }
      } else {
        // Failed review - reset consecutive correct and demote if necessary
        newConsecutiveCorrect = 0;
        newEaseFactor = Math.max(1.3, newEaseFactor - 0.2);
        
        if (card.stage === 'mastered' || card.stage === 'review') {
          newStage = 'learning'; // Demote to learning
          newInterval = 1;
        } else if (card.stage === 'learning') {
          newStage = 'new'; // Demote to new
          newInterval = 0.5; // 12 hours
        } else {
          // Already new, just reset interval
          newInterval = 0.25; // 6 hours
        }
      }
      
      const nextReviewAt = new Date();
      nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);
      
      // Update card
      const updatedCard = await prisma.card.update({
        where: { id: cardId },
        data: {
          stage: newStage,
          interval: newInterval,
          easeFactor: newEaseFactor,
          nextReviewAt,
          reviewCount: { increment: 1 },
          consecutiveCorrect: newConsecutiveCorrect
        }
      });
      
      // Create review history
      await prisma.reviewHistory.create({
        data: {
          cardId,
          sessionId: sessionId || null,
          quality,
          responseTime,
          wasCorrect,
          intervalBefore: card.interval,
          intervalAfter: newInterval
        }
      });
      
      return res.status(200).json({ 
        card: updatedCard,
        nextReviewAt,
        interval: newInterval
      });
    }

    // Route: /api/study/due
    if (pathSegments[0] === 'study' && pathSegments[1] === 'due' && req.method === 'GET') {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      // Get all cards due for study
      const cards = await prisma.card.findMany(
        {
          where: {
            OR: [
              { nextReviewAt: { lte: new Date() } },
              { stage: 'new' }
            ]
          },
          take: limit,
          orderBy: [
            { nextReviewAt: 'asc' },
            { createdAt: 'asc' }
          ],
          include: {
            deck: { select: { name: true } }
          }
        }
      );
      
      // Get total count of due cards
      const totalDue = await prisma.card.count({
        where: {
          OR: [
            { nextReviewAt: { lte: new Date() } },
            { stage: 'new' }
          ]
        }
      });
      
      return res.status(200).json({ cards, totalDue });
    }

    // Route: /api/study/session/[id]/complete
    if (pathSegments[0] === 'study' && pathSegments[1] === 'session' && pathSegments.length === 4 && pathSegments[3] === 'complete' && req.method === 'PUT') {
      const sessionId = pathSegments[2];
      const { cardsStudied, cardsCorrect, totalTime } = completeSessionSchema.parse(req.body);
      
      // Verify session exists
      const session = await prisma.studySession.findUnique({
        where: { id: sessionId }
      });
      
      if (!session) {
        return res.status(404).json({ error: 'Study session not found' });
      }
      
      // Update session with completion data
      const completedSession = await prisma.studySession.update({
        where: { id: sessionId },
        data: {
          cardsStudied,
          cardsCorrect,
          totalTime,
          completedAt: new Date()
        }
      });
      
      // Calculate accuracy
      const accuracy = cardsStudied > 0 ? (cardsCorrect / cardsStudied) * 100 : 0;
      
      return res.status(200).json({
        session: completedSession,
        accuracy: Math.round(accuracy)
      });
    }

    // Route: /api/decks/[id]/reset-progress
    if (pathSegments[0] === 'decks' && pathSegments.length === 3 && pathSegments[2] === 'reset-progress' && req.method === 'POST') {
      const deckId = pathSegments[1];
      
      // Verify deck exists
      const deck = await prisma.deck.findUnique({
        where: { id: deckId }
      });
      
      if (!deck) {
        return res.status(404).json({ error: 'Deck not found' });
      }
      
      // Reset all cards in the deck
      const result = await prisma.card.updateMany({
        where: { deckId },
        data: {
          stage: 'new',
          interval: 1.0,
          easeFactor: 2.5,
          nextReviewAt: new Date(),
          reviewCount: 0,
          consecutiveCorrect: 0
        }
      });
      
      return res.status(200).json({ 
        message: 'Progress reset successfully',
        cardsReset: result.count
      });
    }


    // Default 404
    return res.status(404).json({
      error: 'Not Found',
      message: `API route ${req.url} not found`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('API error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    }
    
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}