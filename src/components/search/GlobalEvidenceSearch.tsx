import { useState, useCallback, useEffect, useRef } from "react";
import { Search, Filter, Clock, FileText, Scale, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SearchResult {
  evidence_id: string;
  file_name: string;
  excerpt: string;
  relevance_score: number;
  concepts_matched: string[];
  legal_significance: string;
  category: string;
  created_at: string;
  highlighted_text: string;
}

interface SearchResponse {
  query: string;
  steps: string[];
  results: SearchResult[];
  total_found: number;
  search_time_ms: number;
}

const RECENT_SEARCHES_KEY = 'evidence-search-history';
const MAX_RECENT_SEARCHES = 8;

const QUICK_FILTERS = [
  { label: "Violence", query: "violence physical harm assault", icon: "⚠️" },
  { label: "Coercion", query: "coercion threats pressure manipulation", icon: "🎯" },
  { label: "Stalking", query: "stalking harassment following surveillance", icon: "👁️" },
  { label: "Child Safety", query: "child safety behaviour in front of children", icon: "🛡️" },
  { label: "Financial Control", query: "financial control money abuse economic", icon: "💰" },
  { label: "Communication", query: "messages texts emails threats", icon: "💬" },
];

export function GlobalEvidenceSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchMeta, setSearchMeta] = useState<{ total: number; timeMs: number; steps: string[] }>({
    total: 0,
    timeMs: 0,
    steps: []
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load recent searches on mount
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Save search to history
  const saveSearchToHistory = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s !== searchQuery);
      const updated = [searchQuery, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Perform enterprise search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    saveSearchToHistory(searchQuery);

    try {
      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Authentication required. Please sign in to search evidence.');
      }

      const { data, error } = await supabase.functions.invoke('enterprise-evidence-search', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { 
          query: searchQuery,
          include_analysis: true,
          max_results: 20,
          min_relevance: 0.3
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      const response: SearchResponse = data;
      setResults(response.results || []);
      setSearchMeta({
        total: response.total_found || 0,
        timeMs: response.search_time_ms || 0,
        steps: response.steps || []
      });

      if (response.results?.length === 0) {
        toast({
          title: "No evidence found",
          description: "Try different keywords or check your uploaded evidence.",
          variant: "default"
        });
      }
    } catch (error: any) {
      console.error('Search error:', error);
      
      // Better error handling
      if (error.message?.includes('Authentication')) {
        toast({
          title: "Authentication Error",
          description: "Please sign in to search evidence.",
          variant: "destructive"
        });
      } else if (error.status === 500) {
        toast({
          title: "Search Error",
          description: "Server error occurred. Check console for details.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Search failed",
          description: error.message || "Please try again or contact support.",
          variant: "destructive"
        });
      }
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [saveSearchToHistory, toast]);

  // Handle search submission
  const handleSearch = useCallback((searchQuery: string = query) => {
    if (!searchQuery.trim()) return;
    performSearch(searchQuery);
  }, [query, performSearch]);

  // Handle quick filter clicks
  const handleQuickFilter = useCallback((filterQuery: string) => {
    setQuery(filterQuery);
    performSearch(filterQuery);
  }, [performSearch]);

  // Handle recent search clicks
  const handleRecentSearch = useCallback((recentQuery: string) => {
    setQuery(recentQuery);
    performSearch(recentQuery);
  }, [performSearch]);

  // Render highlighted text
  const renderHighlightedText = (text: string) => {
    // Simple highlighting - replace **[highlight]** and **[/highlight]** with styled spans
    const highlighted = text.replace(
      /\*\*\[highlight\](.*?)\*\*\[\/highlight\]/g,
      '<mark class="bg-primary/20 text-primary font-semibold px-1 rounded">$1</mark>'
    );
    return <div dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

  // Get relevance color
  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (score >= 0.6) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="gap-2 bg-card hover:bg-accent border-border text-foreground min-w-[200px] justify-start"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Search evidence...</span>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[600px] p-0 bg-card border-border shadow-elegant" 
        align="end"
        side="bottom"
        sideOffset={8}
      >
        <Command className="bg-transparent">
          <div className="flex items-center border-b border-border px-3">
            <Search className="h-4 w-4 text-muted-foreground mr-2" />
            <CommandInput
              ref={inputRef}
              placeholder="Search for evidence patterns, behaviors, or specific content..."
              value={query}
              onValueChange={setQuery}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              className="flex-1 bg-transparent border-0 focus:ring-0 placeholder:text-muted-foreground"
            />
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />}
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                }}
                className="h-6 w-6 p-0 ml-2"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <CommandList className="max-h-[500px]">
            {!query && !results.length && (
              <>
                {/* Quick Filters */}
                <CommandGroup heading="Quick Searches">
                  {QUICK_FILTERS.map((filter) => (
                    <CommandItem
                      key={filter.label}
                      onSelect={() => handleQuickFilter(filter.query)}
                      className="cursor-pointer hover:bg-accent"
                    >
                      <span className="mr-2">{filter.icon}</span>
                      <span className="font-medium">{filter.label}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {filter.query.split(' ').length} terms
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>

                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <CommandGroup heading="Recent Searches">
                    {recentSearches.slice(0, 5).map((recent, index) => (
                      <CommandItem
                        key={index}
                        onSelect={() => handleRecentSearch(recent)}
                        className="cursor-pointer hover:bg-accent"
                      >
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="truncate">{recent}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}

            {query && !results.length && !isLoading && (
              <CommandEmpty>
                <div className="text-center py-6">
                  <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Press Enter to search for "{query}"
                  </p>
                </div>
              </CommandEmpty>
            )}

            {/* Search Results */}
            {results.length > 0 && (
              <CommandGroup heading={`${searchMeta.total} Results (${searchMeta.timeMs}ms)`}>
                <ScrollArea className="h-[400px]">
                  {results.map((result, index) => (
                    <div key={`${result.evidence_id}-${index}`} className="p-3 border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1">
                          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="font-medium text-sm truncate">{result.file_name}</span>
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getRelevanceColor(result.relevance_score))}
                          >
                            {Math.round(result.relevance_score * 100)}%
                          </Badge>
                        </div>
                        {result.legal_significance && (
                          <Scale className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                        )}
                      </div>
                      
                      <div className="text-sm text-foreground mb-2 leading-relaxed">
                        {renderHighlightedText(result.highlighted_text || result.excerpt)}
                      </div>

                      {result.concepts_matched?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {result.concepts_matched.map((concept, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {concept}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {result.legal_significance && (
                        <div className="text-xs text-primary bg-primary/10 rounded px-2 py-1">
                          <strong>Legal significance:</strong> {result.legal_significance}
                        </div>
                      )}
                    </div>
                  ))}
                </ScrollArea>
              </CommandGroup>
            )}
          </CommandList>
        </Command>

        {/* Search Reasoning Steps */}
        {searchMeta.steps.length > 0 && (
          <div className="border-t border-border p-3 bg-muted/30">
            <div className="text-xs text-muted-foreground">
              <details className="cursor-pointer">
                <summary className="font-medium mb-1">Search Analysis Steps</summary>
                <ul className="space-y-1 pl-4">
                  {searchMeta.steps.map((step, index) => (
                    <li key={index} className="text-xs">• {step}</li>
                  ))}
                </ul>
              </details>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}