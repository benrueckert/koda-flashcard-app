/**
 * Settings Modal Component
 * 
 * Modal for detailed user preferences and settings management.
 */

import { useState, useEffect } from 'react';
import { XMarkIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import Button from './Button';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [dailyGoal, setDailyGoal] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSave = async () => {
    if (dailyGoal < 1 || dailyGoal > 1000) {
      setError('Daily goal must be between 1 and 1000 cards');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      // Save to localStorage for now (since no user system)
      localStorage.setItem('koda_daily_goal', dailyGoal.toString());

      setSuccessMessage('Settings saved successfully!');
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 1500);
    } catch (error: any) {
      setError(error.message || 'Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl border border-border shadow-card max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-text-primary">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {successMessage}
            </div>
          )}

          {/* Study Preferences */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AcademicCapIcon className="w-5 h-5 text-koda-primary" />
              <h3 className="text-lg font-semibold text-text-primary">Study Preferences</h3>
            </div>

            <div className="space-y-4">
              {/* Daily Goal */}
              <div>
                <label htmlFor="dailyGoal" className="block text-sm font-medium text-text-primary mb-2">
                  Daily Study Goal
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    id="dailyGoal"
                    min="1"
                    max="1000"
                    value={dailyGoal}
                    onChange={(e) => setDailyGoal(parseInt(e.target.value) || 1)}
                    className="input-primary flex-1"
                    placeholder="20"
                  />
                  <span className="text-text-secondary text-sm">cards/day</span>
                </div>
                <p className="text-text-muted text-xs mt-1">
                  Set your daily study target to stay motivated (saved locally)
                </p>
              </div>

              {/* Coming Soon Features */}
              <div className="space-y-3 opacity-60">
                <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg">
                  <div>
                    <div className="font-medium text-text-primary">Dark Mode</div>
                    <div className="text-text-muted text-sm">Switch to dark theme</div>
                  </div>
                  <span className="text-xs bg-koda-primary/10 text-koda-primary px-2 py-1 rounded-full">
                    Coming Soon
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg">
                  <div>
                    <div className="font-medium text-text-primary">Language</div>
                    <div className="text-text-muted text-sm">Switch to German</div>
                  </div>
                  <span className="text-xs bg-koda-primary/10 text-koda-primary px-2 py-1 rounded-full">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} isLoading={isLoading}>
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;