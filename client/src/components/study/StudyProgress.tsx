/**
 * Study Progress Component
 * 
 * Shows progress bar and session statistics during study.
 */

import { useEffect, useState } from 'react';
import { KodaBear } from '../ui';

interface StudyProgressProps {
  current: number;
  total: number;
  remaining?: number;
  weightedProgress?: number; // New weighted progress percentage
  sessionStats: {
    studied: number;
    correct: number;
    totalReviews: number;
    startTime: Date;
    completedCards: Set<string>;
    stageProgress: {
      new: number;
      learning: number;
      review: number;
      mastered: number;
    };
  };
}

const StudyProgress: React.FC<StudyProgressProps> = ({ current, total, remaining, weightedProgress, sessionStats }) => {
  const [elapsedTime, setElapsedTime] = useState('0:00');
  
  const progressPercentage = weightedProgress ?? ((current / total) * 100);
  const accuracy = sessionStats.totalReviews > 0 ? Math.round((sessionStats.correct / sessionStats.totalReviews) * 100) : 0;
  
  // Update elapsed time every second
  useEffect(() => {
    const updateElapsedTime = () => {
      const elapsed = Math.floor((Date.now() - sessionStats.startTime.getTime()) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      setElapsedTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateElapsedTime();
    const interval = setInterval(updateElapsedTime, 1000);
    return () => clearInterval(interval);
  }, [sessionStats.startTime]);


  const getAccuracyColor = (acc: number) => {
    if (acc >= 90) return 'text-koda-primary';
    if (acc >= 70) return 'text-warning';
    return 'text-error';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'from-koda-primary to-koda-primary-light';
    if (percentage >= 50) return 'from-koda-primary/80 to-koda-primary-light/80';
    return 'from-koda-primary/60 to-koda-primary-light/60';
  };

  return (
    <div className="bg-surface/95 backdrop-blur-sm border-b border-border shadow-subtle relative">
      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center text-sm text-text-secondary mb-3">
            <span className="font-semibold text-text-primary">Session Progress</span>
            <div className="flex items-center space-x-3">
              <div className="flex items-center gap-2">
                <span className="text-text-secondary text-sm">Time:</span>
                <span className="text-text-primary font-bold text-sm font-mono">{elapsedTime}</span>
              </div>
              <span className="font-medium">{Math.round(progressPercentage)}% complete</span>
              {progressPercentage >= 100 && (
                <div className="flex items-center gap-2 bg-success-light px-3 py-1 rounded-full border border-koda-primary/20">
                  <KodaBear 
                    size="xs" 
                    expression="trophy" 
                    animation="bounce" 
                  />
                  <span className="text-koda-primary font-semibold text-sm animate-pulse">Complete!</span>
                </div>
              )}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
            <div 
              className={`bg-gradient-to-r ${getProgressColor(progressPercentage)} h-4 rounded-full transition-all duration-500 ease-out shadow-subtle relative overflow-hidden`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            >
              {progressPercentage > 15 && (
                <div className="absolute inset-0 flex items-center justify-end pr-3">
                  <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse"></div>
                </div>
              )}
              {/* Shimmer effect for active progress */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-slide-right"></div>
            </div>
          </div>
        </div>

        {/* Stage Progress - Always show all stages */}
        <div className="mb-6">
          <div className="flex justify-center space-x-8 text-sm">
            <div className="text-center group">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-all duration-300 shadow-subtle hover:shadow-card ${
                sessionStats.stageProgress.new > 0 
                  ? 'bg-gradient-to-br from-info-light to-info/10 ring-2 ring-info/20 scale-105' 
                  : 'bg-surface-elevated border border-border-light'
              }`}>
                <span className={`font-bold text-base ${
                  sessionStats.stageProgress.new > 0 ? 'text-info' : 'text-text-disabled'
                }`}>
                  {sessionStats.stageProgress.new || 0}
                </span>
              </div>
              <div className="text-text-secondary text-xs font-semibold group-hover:text-text-primary transition-colors duration-200">New</div>
            </div>
            
            <div className="text-center group">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-all duration-300 shadow-subtle hover:shadow-card ${
                sessionStats.stageProgress.learning > 0 
                  ? 'bg-gradient-to-br from-warning-light to-warning/10 ring-2 ring-warning/20 scale-105' 
                  : 'bg-surface-elevated border border-border-light'
              }`}>
                <span className={`font-bold text-base ${
                  sessionStats.stageProgress.learning > 0 ? 'text-warning' : 'text-text-disabled'
                }`}>
                  {sessionStats.stageProgress.learning || 0}
                </span>
              </div>
              <div className="text-text-secondary text-xs font-semibold group-hover:text-text-primary transition-colors duration-200">Learning</div>
            </div>
            
            <div className="text-center group">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-all duration-300 shadow-subtle hover:shadow-card ${
                sessionStats.stageProgress.review > 0 
                  ? 'bg-gradient-to-br from-purple-100 to-purple-50 ring-2 ring-purple-200/50 scale-105' 
                  : 'bg-surface-elevated border border-border-light'
              }`}>
                <span className={`font-bold text-base ${
                  sessionStats.stageProgress.review > 0 ? 'text-purple-600' : 'text-text-disabled'
                }`}>
                  {sessionStats.stageProgress.review || 0}
                </span>
              </div>
              <div className="text-text-secondary text-xs font-semibold group-hover:text-text-primary transition-colors duration-200">Review</div>
            </div>
            
            <div className="text-center group">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-all duration-300 shadow-subtle hover:shadow-card ${
                sessionStats.stageProgress.mastered > 0 
                  ? 'bg-gradient-to-br from-success-light to-koda-primary/10 ring-2 ring-koda-primary/20 scale-105 animate-pulse' 
                  : 'bg-surface-elevated border border-border-light'
              }`}>
                <span className={`font-bold text-base ${
                  sessionStats.stageProgress.mastered > 0 ? 'text-koda-primary' : 'text-text-disabled'
                }`}>
                  {sessionStats.stageProgress.mastered || 0}
                </span>
              </div>
              <div className="text-text-secondary text-xs font-semibold group-hover:text-text-primary transition-colors duration-200">Mastered</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudyProgress;