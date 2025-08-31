/**
 * Settings Dropdown Component
 * 
 * Comprehensive settings dropdown with user info, preferences, and app settings.
 */

import { useState, useRef, useEffect } from 'react';
import { Cog6ToothIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import Button from './Button';

interface SettingsDropdownProps {
  className?: string;
}

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Logout functionality removed

  return (
    <>
      {/* Mobile Backdrop - Only show on mobile when dropdown is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 sm:hidden animate-fade-in" 
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}
      
      <div className={`relative ${className}`} ref={dropdownRef}>
        {/* Settings Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded-lg transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Settings"
        >
          <Cog6ToothIcon className="w-5 h-5" />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-surface rounded-xl border border-border shadow-card-hover z-50 py-2 animate-fade-in">
            {/* App Info Section */}
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-koda-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🐻</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-primary truncate">
                    Koda Flashcards
                  </p>
                  <p className="text-sm text-text-secondary truncate">
                    Your AI-powered learning companion
                  </p>
                </div>
              </div>
            </div>

            {/* Study Preferences Section */}
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2 mb-2">
                <AcademicCapIcon className="w-4 h-4 text-text-secondary" />
                <span className="text-sm font-medium text-text-primary">Study Preferences</span>
              </div>
              <button
                disabled
                className="w-full text-left px-2 py-2 text-sm text-text-muted rounded-lg cursor-not-allowed flex items-center justify-between"
              >
                Daily Study Goal
                <span className="text-xs bg-koda-primary/10 text-koda-primary px-2 py-0.5 rounded-full">
                  Coming Soon
                </span>
              </button>
              <button
                disabled
                className="w-full text-left px-2 py-2 text-sm text-text-muted rounded-lg cursor-not-allowed flex items-center justify-between"
              >
                Dark Mode
                <span className="text-xs bg-koda-primary/10 text-koda-primary px-2 py-0.5 rounded-full">
                  Coming Soon
                </span>
              </button>
            </div>

            {/* App Settings Section */}
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2 mb-2">
                <Cog6ToothIcon className="w-4 h-4 text-text-secondary" />
                <span className="text-sm font-medium text-text-primary">App Settings</span>
              </div>
              <button
                disabled
                className="w-full text-left px-2 py-2 text-sm text-text-muted rounded-lg cursor-not-allowed flex items-center justify-between"
              >
                Language (Deutsch)
                <span className="text-xs bg-koda-primary/10 text-koda-primary px-2 py-0.5 rounded-full">
                  Coming Soon
                </span>
              </button>
            </div>


            {/* About Section */}
            <div className="px-4 py-3 border-b border-border">
              <span className="text-sm font-medium text-text-primary mb-2 block">About</span>
              <div className="px-2 py-1 text-sm text-text-secondary">
                Koda v0.2.0
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2">
              <div className="px-2 py-2 text-xs text-text-muted text-center">
                Made by{' '}
                <a 
                  href="https://github.com/benrueckert" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-koda-primary hover:text-koda-primary-dark transition-colors underline"
                >
                  Ben Rückert
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

    </>
  );
};

export default SettingsDropdown;