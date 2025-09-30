import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Filter, Calendar, Tag } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchFilters {
  dateRange?: 'today' | 'week' | 'month' | 'all';
  messageType?: 'all' | 'user' | 'assistant' | 'evidence';
  tags?: string[];
}

interface ChatSearchBarProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  onClear: () => void;
  placeholder?: string;
  isSearching?: boolean;
}

export function ChatSearchBar({ 
  onSearch, 
  onClear, 
  placeholder = "Search messages, evidence, or legal topics...",
  isSearching = false 
}: ChatSearchBarProps) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    dateRange: 'all',
    messageType: 'all',
    tags: []
  });
  const [showFilters, setShowFilters] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Debounce search query to reduce API calls
  const debouncedQuery = useDebounce(query, 300);

  // Auto-trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim() && debouncedQuery !== query) {
      onSearch(debouncedQuery.trim(), filters);
    }
  }, [debouncedQuery]);

  // Focus search input when component mounts
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query.trim(), filters);
    }
  };

  const handleClear = () => {
    setQuery("");
    setFilters({
      dateRange: 'all',
      messageType: 'all', 
      tags: []
    });
    onClear();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      handleClear();
    }
  };

  const activeFiltersCount = [
    filters.dateRange !== 'all',
    filters.messageType !== 'all',
    filters.tags && filters.tags.length > 0
  ].filter(Boolean).length;

  return (
    <div 
      className="flex items-center gap-2 p-3 border-b border-border/10 bg-background/50"
      role="search"
      aria-label="Search messages and evidence"
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <Input
          ref={searchInputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-10"
          aria-label="Search query"
          aria-describedby="search-instructions"
          role="searchbox"
        />
        <span id="search-instructions" className="sr-only">
          Press Enter to search, Escape to clear. Search filters available.
        </span>
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            aria-label="Clear search"
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </Button>
        )}
      </div>
      
      <Popover open={showFilters} onOpenChange={setShowFilters}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="relative"
            aria-label={`Filter options${activeFiltersCount > 0 ? `, ${activeFiltersCount} active` : ''}`}
            aria-expanded={showFilters}
          >
            <Filter className="w-4 h-4" aria-hidden="true" />
            {activeFiltersCount > 0 && (
              <Badge 
                variant="secondary" 
                className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Search Filters</h4>
            
            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Time Period
              </label>
              <Select 
                value={filters.dateRange} 
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  dateRange: value as SearchFilters['dateRange'] 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All messages</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This week</SelectItem>
                  <SelectItem value="month">This month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Message Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Message Type
              </label>
              <Select 
                value={filters.messageType} 
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  messageType: value as SearchFilters['messageType'] 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All messages</SelectItem>
                  <SelectItem value="user">Your messages</SelectItem>
                  <SelectItem value="assistant">AI responses</SelectItem>
                  <SelectItem value="evidence">Evidence uploads</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSearch} size="sm" disabled={!query.trim()}>
                Apply Filters
              </Button>
              <Button variant="outline" onClick={handleClear} size="sm">
                Clear All
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      <Button
        onClick={handleSearch}
        disabled={!query.trim() || isSearching}
        size="sm"
        aria-label={isSearching ? "Searching..." : "Execute search"}
      >
        {isSearching ? "Searching..." : "Search"}
      </Button>
    </div>
  );
}