import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, FileText, Gavel, Scale, Filter, X } from 'lucide-react';
import CitationChip from './CitationChip';
import { useCitationContext } from '@/hooks/useCitationContext';

interface SearchFilters {
  searchType: 'semantic' | 'keyword' | 'both';
  jurisdiction: string;
  citationType: string;
  yearFrom: string;
  yearTo: string;
  court: string;
  includePersonal: boolean;
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
  document_type: string;
  relevance_score: number;
  legal_concepts: string[];
  section_id: string;
  document_id: string;
  citations?: any[];
}

export default function EnhancedLegalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { getDisplayMode } = useCitationContext();
  const { toast } = useToast();

  const [filters, setFilters] = useState<SearchFilters>({
    searchType: 'both',
    jurisdiction: 'NSW',
    citationType: 'all',
    yearFrom: '',
    yearTo: '',
    court: '',
    includePersonal: false,
  });

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-legal-search', {
        body: {
          query: query.trim(),
          searchType: filters.searchType,
          jurisdiction: filters.jurisdiction,
          citationType: filters.citationType !== 'all' ? filters.citationType : undefined,
          yearFrom: filters.yearFrom ? parseInt(filters.yearFrom) : undefined,
          yearTo: filters.yearTo ? parseInt(filters.yearTo) : undefined,
          court: filters.court || undefined,
          includePersonal: filters.includePersonal,
        },
      });

      if (error) throw error;

      setResults(data.results || []);
      
      if (data.results?.length === 0) {
        toast({
          title: "No results found",
          description: "Try adjusting your search terms or filters.",
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to search legal database. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      searchType: 'both',
      jurisdiction: 'NSW',
      citationType: 'all',
      yearFrom: '',
      yearTo: '',
      court: '',
      includePersonal: false,
    });
  };

  const getResultIcon = (documentType: string) => {
    switch (documentType) {
      case 'statute':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'case_law':
        return <Gavel className="h-4 w-4 text-green-600" />;
      case 'regulation':
      case 'practice_direction':
      case 'rule':
        return <Scale className="h-4 w-4 text-purple-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>NSW Legal Search</span>
          </CardTitle>
          <CardDescription>
            Search NSW legislation, case law, and practice directions with citations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="flex space-x-2">
            <Input
              placeholder="Search legal documents, cases, or statutes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="px-3"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Advanced Filters</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs">Search Type</Label>
                    <Select
                      value={filters.searchType}
                      onValueChange={(value: any) => setFilters({ ...filters, searchType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Semantic + Keyword</SelectItem>
                        <SelectItem value="semantic">Semantic Only</SelectItem>
                        <SelectItem value="keyword">Keyword Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Jurisdiction</Label>
                    <Select
                      value={filters.jurisdiction}
                      onValueChange={(value) => setFilters({ ...filters, jurisdiction: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NSW">NSW</SelectItem>
                        <SelectItem value="Commonwealth">Commonwealth</SelectItem>
                        <SelectItem value="All">All Jurisdictions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Content Type</Label>
                    <Select
                      value={filters.citationType}
                      onValueChange={(value) => setFilters({ ...filters, citationType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="statute">Statutes</SelectItem>
                        <SelectItem value="case_law">Case Law</SelectItem>
                        <SelectItem value="regulation">Regulations</SelectItem>
                        <SelectItem value="practice_direction">Practice Directions</SelectItem>
                        <SelectItem value="rule">Rules</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs">Year From</Label>
                    <Input
                      type="number"
                      placeholder="2000"
                      value={filters.yearFrom}
                      onChange={(e) => setFilters({ ...filters, yearFrom: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Year To</Label>
                    <Input
                      type="number"
                      placeholder="2024"
                      value={filters.yearTo}
                      onChange={(e) => setFilters({ ...filters, yearTo: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Court</Label>
                    <Input
                      placeholder="Federal Circuit and Family Court"
                      value={filters.court}
                      onChange={(e) => setFilters({ ...filters, court: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="personal-docs"
                    checked={filters.includePersonal}
                    onCheckedChange={(checked) => setFilters({ ...filters, includePersonal: checked })}
                  />
                  <Label htmlFor="personal-docs" className="text-xs">
                    Include personal legal documents
                  </Label>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Search Results</h3>
            <Badge variant="outline">{results.length} results</Badge>
          </div>

          {results.map((result) => (
            <Card key={result.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {getResultIcon(result.document_type)}
                    <CardTitle className="text-base">{result.title}</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(result.relevance_score * 100)}% match
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {result.content}
                </p>

                {result.legal_concepts && result.legal_concepts.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground mb-1 block">
                      Legal Concepts:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {result.legal_concepts.slice(0, 5).map((concept, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {concept}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {result.citations && result.citations.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground mb-2 block">
                      Citations:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {result.citations.map((citation) => (
                        <CitationChip
                          key={citation.id}
                          citation={citation}
                          mode={getDisplayMode()}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}