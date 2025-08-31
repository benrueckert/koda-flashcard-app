/**
 * Edit Deck Modal Component
 * 
 * Modal for editing existing flashcard deck details.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ApiService } from '../../services';
import { Button, KodaBear } from '../ui';
import type { Deck } from '../../types';

const editDeckSchema = z.object({
  name: z.string().min(1, 'Deck name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
});

type EditDeckFormData = z.infer<typeof editDeckSchema>;

interface EditDeckModalProps {
  deck: Deck;
  onClose: () => void;
  onDeckUpdated: (updatedDeck: Deck) => void;
}

const EditDeckModal: React.FC<EditDeckModalProps> = ({ 
  deck, 
  onClose, 
  onDeckUpdated
}) => {
  const [serverError, setServerError] = useState<string>('');

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditDeckFormData>({
    resolver: zodResolver(editDeckSchema),
    defaultValues: {
      name: deck.name,
      description: deck.description || '',
    },
  });

  const onSubmit = async (data: EditDeckFormData) => {
    try {
      setServerError('');
      const updateData = {
        name: data.name,
        description: data.description || undefined,
      };
      
      const response = await ApiService.updateDeck(deck.id, updateData);
      onDeckUpdated(response.deck);
      onClose();
    } catch (error: any) {
      setServerError(error.message || 'Failed to update deck. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="text-center mb-6">
            <KodaBear size="lg" expression="default" className="mx-auto mb-4" />
            <h2 className="text-2xl font-display font-bold text-koda-primary-dark">
              Edit Deck
            </h2>
            <p className="text-neutral-600 mt-2">
              Update your deck details
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <div className="bg-koda-error-light border border-koda-error/20 text-koda-error px-4 py-3 rounded-lg text-sm">
                {serverError}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
                Deck Name *
              </label>
              <input
                {...register('name')}
                type="text"
                id="name"
                className="input-primary"
                placeholder="e.g., Spanish Vocabulary, World History"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-koda-error text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-1">
                Description
              </label>
              <textarea
                {...register('description')}
                id="description"
                rows={3}
                className="input-primary resize-none"
                placeholder="What is this deck about? (optional)"
                disabled={isSubmitting}
              />
              {errors.description && (
                <p className="text-koda-error text-sm mt-1">{errors.description.message}</p>
              )}
            </div>


            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Update Deck'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditDeckModal;