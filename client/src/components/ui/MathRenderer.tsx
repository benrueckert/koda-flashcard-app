/**
 * Math Renderer Component
 * 
 * Renders LaTeX mathematical expressions using KaTeX.
 */

import { useState, useEffect } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  content: string;
  className?: string;
}

const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  const [renderedContent, setRenderedContent] = useState(content);

  useEffect(() => {
    // Process the content to render LaTeX expressions
    const processContent = (text: string) => {
      // Skip truncation check - always process LaTeX even in truncated content
      // CSS will handle visual truncation while preserving rendered math

      let processed = text;

      // Decode HTML entities first (crucial for LaTeX with special characters)
      processed = processed
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');

      // Replace inline math \(...\) with improved error handling
      processed = processed.replace(/\\\((.*?)\\\)/gs, (match, expression) => {
        try {
          // Clean up the expression - remove extra whitespace and newlines
          const cleanExpression = expression.trim().replace(/\s+/g, ' ');
          return katex.renderToString(cleanExpression, { 
            displayMode: false,
            throwOnError: false,
            strict: false
          });
        } catch (error) {
          console.warn('KaTeX rendering error for inline math:', error, 'Expression:', expression);
          return match; // Return original if rendering fails
        }
      });

      // Replace display math \[...\] with improved error handling
      processed = processed.replace(/\\\[(.*?)\\\]/gs, (match, expression) => {
        try {
          // Clean up the expression - remove extra whitespace and newlines
          const cleanExpression = expression.trim().replace(/\s+/g, ' ');
          return katex.renderToString(cleanExpression, { 
            displayMode: true,
            throwOnError: false,
            strict: false
          });
        } catch (error) {
          console.warn('KaTeX rendering error for display math:', error, 'Expression:', expression);
          return match; // Return original if rendering fails
        }
      });

      // Handle \displaylines{} and other special LaTeX commands
      processed = processed.replace(/\\displaylines\{(.*?)\}/gs, (match, expression) => {
        try {
          // \displaylines is for multiple lines - convert to align environment
          const alignExpression = expression.replace(/\\\\/g, '\\\\');
          return katex.renderToString(`\\begin{aligned}${alignExpression}\\end{aligned}`, { 
            displayMode: true,
            throwOnError: false,
            strict: false
          });
        } catch (error) {
          console.warn('KaTeX rendering error for displaylines:', error);
          // Fallback: try rendering as regular display math
          try {
            return katex.renderToString(expression, { 
              displayMode: true,
              throwOnError: false,
              strict: false
            });
          } catch (fallbackError) {
            return match; // Return original if both attempts fail
          }
        }
      });

      return processed;
    };

    setRenderedContent(processContent(content));
  }, [content]);

  return (
    <div 
      className={`math-container content-safe ${className}`}
      style={{
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        hyphens: 'auto',
        wordBreak: 'break-word',
        maxWidth: '100%',
        overflowX: 'auto',
        overflowY: 'hidden'
      }}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
};

export default MathRenderer;