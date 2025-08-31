/**
 * Deck Management Store
 * 
 * Manages deck state and operations using Zustand.
 */

import { create } from 'zustand';
import ApiService from '../services/api';
import type { Deck, CreateDeckData, UpdateDeckData, DeckStore as DeckStoreType } from '../types';

export const useDeckStore = create<DeckStoreType>((set) => ({
  decks: [],
  currentDeck: null,
  isLoading: false,
  error: null,

  fetchDecks: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await ApiService.getDecks();
      set({
        decks: response.decks || [],
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch decks',
        isLoading: false,
      });
      throw error;
    }
  },

  createDeck: async (data: CreateDeckData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await ApiService.createDeck(data);
      const newDeck = response.deck;
      
      set((state) => ({
        decks: [newDeck, ...state.decks],
        isLoading: false,
      }));
      
      return newDeck;
    } catch (error: any) {
      set({
        error: error.message || 'Failed to create deck',
        isLoading: false,
      });
      throw error;
    }
  },

  updateDeck: async (id: string, data: UpdateDeckData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await ApiService.updateDeck(id, data);
      const updatedDeck = response.deck;
      
      set((state) => ({
        decks: state.decks.map((deck) => 
          deck.id === id ? updatedDeck : deck
        ),
        currentDeck: state.currentDeck?.id === id ? updatedDeck : state.currentDeck,
        isLoading: false,
      }));
      
      return updatedDeck;
    } catch (error: any) {
      set({
        error: error.message || 'Failed to update deck',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteDeck: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await ApiService.deleteDeck(id);
      
      set((state) => ({
        decks: state.decks.filter((deck) => deck.id !== id),
        currentDeck: state.currentDeck?.id === id ? null : state.currentDeck,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.message || 'Failed to delete deck',
        isLoading: false,
      });
      throw error;
    }
  },

  setCurrentDeck: (deck: Deck | null) => {
    set({ currentDeck: deck });
  },
}));