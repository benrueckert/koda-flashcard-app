/**
 * Edit Card Modal Component
 * 
 * Modal for editing existing flashcards.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ApiService } from '../../services';
import { Button, KodaBear } from '../ui';
import type { Card } from '../../types';

const editCardSchema = z.object({
  front: z.string().min(1, 'Front content is required').max(2000, 'Content too long'),
  back: z.string().min(1, 'Back content is required').max(2000, 'Content too long'),
  hint: z.string().max(500, 'Hint too long').optional(),
  type: z.enum(['basic', 'cloze', 'reverse']),
});

type EditCardFormData = z.infer<typeof editCardSchema>;

interface EditCardModalProps {
  card: Card;
  onClose: () => void;
  onCardUpdated: () => void;
}

const EditCardModal: React.FC<EditCardModalProps> = ({ card, onClose, onCardUpdated }) => {
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
  } = useForm<EditCardFormData>({
    resolver: zodResolver(editCardSchema),
    defaultValues: {
      front: card.front,
      back: card.back,
      hint: card.hint || '',
      type: card.type,
    },
  });

  const watchedValues = watch();

  const onSubmit = async (data: EditCardFormData) => {
    try {
      setServerError('');
      const updateData = {
        front: data.front.trim(),
        back: data.back.trim(),
        hint: data.hint?.trim() || undefined,
        type: data.type,
      };
      
      await ApiService.updateCard(card.id, updateData);
      onCardUpdated();
    } catch (error: any) {
      setServerError(error.message || 'Failed to update card. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="text-center mb-6">
            <KodaBear size="lg" expression="default" className="mx-auto mb-4" />
            <h2 className="text-2xl font-display font-bold text-koda-primary-dark">
              Edit Card
            </h2>
            <p className="text-neutral-600 mt-2">
              Update your flashcard content
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
                      {watchedValues.front}
                    </div>
                  </div>
                </div>
                <div className="card-flashcard bg-gradient-to-br from-blue-50 to-white">
                  <div className="text-center">
                    <div className="text-xs text-neutral-600 mb-2 opacity-75">BACK</div>
                    <div className="text-lg font-medium text-neutral-700">
                      {watchedValues.back}
                    </div>
                    {watchedValues.hint && (
                      <div className="text-sm text-neutral-500 mt-3 border-t pt-3">
                        💡 {watchedValues.hint}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-neutral-500">
                <span>Type: {watchedValues.type}</span>
              </div>

              {/* Card Stats */}
              <div className="card bg-neutral-50">
                <h4 className="font-medium text-neutral-700 mb-3">Card Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-koda-primary font-semibold">{card.reviewCount || 0}</div>
                    <div className="text-neutral-500">Reviews</div>
                  </div>
                  <div className="text-center">
                    <div className="text-koda-primary font-semibold">{card.consecutiveCorrect || 0}</div>
                    <div className="text-neutral-500">Streak</div>
                  </div>
                  <div className="text-center">
                    <div className="text-koda-primary font-semibold">{card.stage}</div>
                    <div className="text-neutral-500">Stage</div>
                  </div>
                  <div className="text-center">
                    <div className="text-koda-primary font-semibold">
                      {Math.round((card.difficulty || 0.5) * 100)}%
                    </div>
                    <div className="text-neutral-500">Difficulty</div>
                  </div>
                </div>
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
                <label htmlFor="hint" className="block text-sm font-medium text-neutral-700 mb-1">
                  Hint (Optional)
                </label>
                <input
                  {...register('hint')}
                  type="text"
                  id="hint"
                  className="input-primary"
                  placeholder="Optional hint to help remember the answer"
                  disabled={isSubmitting}
                />
                {errors.hint && (
                  <p className="text-koda-error text-sm mt-1">{errors.hint.message}</p>
                )}
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
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCardModal;