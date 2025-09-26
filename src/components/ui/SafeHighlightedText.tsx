import React from 'react';

interface SafeHighlightedTextProps {
  text: string;
  className?: string;
}

/**
 * Safely renders text with highlighting markers without using dangerouslySetInnerHTML
 * Handles patterns like **[highlight]text[/highlight]** by converting to React elements
 */
export function SafeHighlightedText({ text, className = "" }: SafeHighlightedTextProps) {
  // Split text by highlight markers and render safely
  const parts = text.split(/(\*\*\[highlight\].*?\*\*\[\/highlight\])/g);
  
  return (
    <div className={className}>
      {parts.map((part, index) => {
        const highlightMatch = part.match(/\*\*\[highlight\](.*?)\*\*\[\/highlight\]/);
        if (highlightMatch) {
          return (
            <mark 
              key={index} 
              className="bg-primary/20 text-primary font-semibold px-1 rounded"
            >
              {highlightMatch[1]}
            </mark>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </div>
  );
}