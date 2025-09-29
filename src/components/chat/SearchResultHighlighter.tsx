import React from 'react';

interface SearchResultHighlighterProps {
  text: string;
  searchTerm: string;
  className?: string;
}

export function SearchResultHighlighter({ 
  text, 
  searchTerm, 
  className = "" 
}: SearchResultHighlighterProps) {
  if (!searchTerm.trim()) {
    return <span className={className}>{text}</span>;
  }

  // Create a case-insensitive regex for the search term
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => 
        regex.test(part) ? (
          <mark 
            key={index} 
            className="bg-primary/20 text-primary-foreground px-1 rounded"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
}