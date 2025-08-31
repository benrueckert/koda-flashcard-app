/**
 * Create Card Modal Component
 * 
 * Modal for creating new flashcards with preview functionality.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ApiService } from '../../services';
import { Button, KodaBear } from '../ui';
import type { Deck } from '../../types';

const createCardSchema = z.object({
  front: z.string().min(1, 'Front content is required').max(2000, 'Content too long'),
  back: z.string().min(1, 'Back content is required').max(2000, 'Content too long'),
  type: z.enum(['basic', 'cloze', 'reverse']),
});

type CreateCardFormData = z.infer<typeof createCardSchema>;

interface CreateCardModalProps {
  deck: Deck;
  onClose: () => void;
  onCardCreated: () => void;
}

const CreateCardModal: React.FC<CreateCardModalProps> = ({ deck, onClose, onCardCreated }) => {
  const [serverError, setServerError] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

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
    watch,
  } = useForm<CreateCardFormData>({
    resolver: zodResolver(createCardSchema),
    defaultValues: {
      type: 'basic',
    },
  });

  const watchedValues = watch();

  const onSubmit = async (data: CreateCardFormData) => {
    try {
      setServerError('');
      const cardData = {
        deckId: deck.id,
        front: data.front.trim(),
        back: data.back.trim(),
        type: data.type,
      };
      
      await ApiService.createCard(cardData);
      onCardCreated();
      onClose();
    } catch (error: any) {
      setServerError(error.message || 'Failed to create card. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full min-h-screen sm:min-h-0 sm:max-h-[90vh] overflow-y-auto mt-0 sm:mt-4 mb-0 sm:mb-4">
        <div className="p-4 sm:p-6 pb-safe">
          <div className="text-center mb-4 sm:mb-6">
            <KodaBear size="md" expression="default" className="mx-auto mb-3 sm:mb-4" />
            <h2 className="text-xl sm:text-2xl font-display font-bold text-koda-primary-dark">
              Add New Card
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 mt-2">
              Create a flashcard for "{deck.name}"
            </p>
          </div>

          <div className="flex space-x-2 mb-6">
            <Button
              variant={!showPreview ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setShowPreview(false)}
            >
              Edit
            </Button>
            <Button
              variant={showPreview ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setShowPreview(true)}
            >
              Preview
            </Button>
          </div>

          {showPreview ? (
            // Preview Mode
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card-flashcard bg-gradient-to-br from-koda-accent-light to-white">
                  <div className="text-center">
                    <div className="text-xs text-koda-primary-dark mb-2 opacity-75">FRONT</div>
                    <div className="text-lg font-medium text-koda-primary-dark">
                      {watchedValues.front || 'Enter front content...'}
                    </div>
                  </div>
                </div>
                <div className="card-flashcard bg-gradient-to-br from-blue-50 to-white">
                  <div className="text-center">
                    <div className="text-xs text-neutral-600 mb-2 opacity-75">BACK</div>
                    <div className="text-lg font-medium text-neutral-700">
                      {watchedValues.back || 'Enter back content...'}  
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-neutral-500">
                <span>Type: {watchedValues.type}</span>
              </div>
            </div>
          ) : (
            // Edit Mode
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {serverError && (
                <div className="bg-koda-error-light border border-koda-error/20 text-koda-error px-4 py-3 rounded-lg text-sm">
                  {serverError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="front" className="block text-sm font-medium text-neutral-700 mb-1">
                    Front (Question) *
                  </label>
                  <textarea
                    {...register('front')}
                    id="front"
                    rows={4}
                    className="input-primary resize-none"
                    placeholder="What goes on the front of the card?"
                    disabled={isSubmitting}
                  />
                  {errors.front && (
                    <p className="text-koda-error text-sm mt-1">{errors.front.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="back" className="block text-sm font-medium text-neutral-700 mb-1">
                    Back (Answer) *
                  </label>
                  <textarea
                    {...register('back')}
                    id="back"
                    rows={4}
                    className="input-primary resize-none"
                    placeholder="What goes on the back of the card?"
                    disabled={isSubmitting}
                  />
                  {errors.back && (
                    <p className="text-koda-error text-sm mt-1">{errors.back.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-neutral-700 mb-1">
                  Card Type
                </label>
                <select
                  {...register('type')}
                  id="type"
                  className="input-primary"
                  disabled={isSubmitting}
                >
                  <option value="basic">Basic (Front → Back)</option>
                  <option value="reverse">Reverse (Back → Front too)</option>
                  <option value="cloze">Cloze Deletion</option>
                </select>
              </div>
            </form>
          )}

          <div className="flex space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {!showPreview && (
              <Button
                onClick={handleSubmit(onSubmit)}
                className="flex-1"
                isLoading={isSubmitting}
                disabled={isSubmitting || !watchedValues.front || !watchedValues.back}
              >
                {isSubmitting ? 'Creating...' : 'Create Card'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCardModal;