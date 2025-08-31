/**
 * Koda Bear Mascot Component
 * 
 * The cute bear mascot that appears throughout the app.
 */

import React from 'react';
import { cn } from '../../utils/cn';
import type { KodaBearProps } from '../../types';

// Add custom animations to your global CSS or Tailwind config:
// @keyframes wiggle {
//   0%, 100% { transform: rotate(-3deg); }
//   50% { transform: rotate(3deg); }
// }
// @keyframes float {
//   0%, 100% { transform: translateY(0px); }
//   50% { transform: translateY(-4px); }
// }
// @keyframes glow {
//   0%, 100% { filter: drop-shadow(0 0 5px rgba(255, 183, 77, 0.3)); }
//   50% { filter: drop-shadow(0 0 15px rgba(255, 183, 77, 0.6)); }
// }
// @keyframes fadeIn {
//   from { opacity: 0; transform: scale(0.8); }
//   to { opacity: 1; transform: scale(1); }
// }

const KodaBear: React.FC<KodaBearProps> = ({
  size = 'md',
  expression = 'default',
  animation = 'none',
  message,
  showMessage = false,
  className,
}) => {
  const sizes = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  // Enhanced emoji expressions for rich study interactions
  // Each expression conveys specific emotional support for learning moments
  const expressions = {
    default: '🐻',
    thinking: '🤔',
    celebrating: '🎉',
    encouraging: '👍',
    sleeping: '😴',
    alert: '⚠️',
    // Study-specific expressions
    excited: '🤩',
    proud: '😊',
    supportive: '🤗',
    cheering: '📣',
    impressed: '😍',
    worried: '😟',
    focused: '🐻',
    relaxed: '😌',
    surprised: '😮',
    winking: '😉',
    determined: '😤',
    confused: '😕',
    // Achievement expressions
    trophy: '🏆',
    star: '⭐',
    fire: '🔥',
    rocket: '🚀',
    // Struggle support expressions
    gentle: '🥰',
    patient: '☺️',
    understanding: '💙',
  };

  const expressionEmoji = expressions[expression] || expressions.default;

  const animations = {
    none: '',
    bounce: 'animate-bounce',
    pulse: 'animate-pulse',
    wiggle: 'animate-wiggle',
    float: 'animate-float',
    glow: 'animate-glow',
  };

  return (
    <div className="relative inline-flex flex-col items-center">
      <div
        className={cn(
          'inline-flex items-center justify-center text-koda-primary transition-all duration-300',
          sizes[size],
          animations[animation],
          'hover:scale-110 cursor-default',
          className
        )}
        role="img"
        aria-label={`Koda bear - ${expression}`}
      >
        <span className="text-current text-2xl select-none">
          {expressionEmoji}
        </span>
      </div>
      
      {showMessage && message && (
        <div className="absolute top-full mt-2 px-3 py-1 bg-white/95 backdrop-blur-sm border border-koda-primary/20 rounded-full shadow-lg text-xs font-medium text-koda-primary-dark whitespace-nowrap animate-fadeIn">
          {message}
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-l border-t border-koda-primary/20 rotate-45"></div>
        </div>
      )}
    </div>
  );
};

export default KodaBear;