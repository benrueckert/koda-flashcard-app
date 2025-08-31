/**
 * Custom Confirmation Modal Component
 * 
 * Beautiful confirmation modal to replace browser default confirm dialogs.
 */

import { useEffect } from 'react';
import { Button, KodaBear } from './';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}) => {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-surface rounded-2xl max-w-md w-full p-8 shadow-strong border border-border animate-scale-up">
        {/* Header with Icon */}
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            confirmVariant === 'danger' 
              ? 'bg-red-100 text-red-600' 
              : 'bg-koda-primary/10 text-koda-primary'
          }`}>
            <ExclamationTriangleIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-display font-bold text-text-primary">
              {title}
            </h3>
          </div>
        </div>

        {/* Message */}
        <p className="text-text-secondary leading-relaxed mb-8">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
            {cancelText}
          </Button>
          <Button
            className={`flex-1 ${
              confirmVariant === 'danger' 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : ''
            }`}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;