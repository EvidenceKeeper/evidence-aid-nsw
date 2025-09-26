import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, Calendar, Filter, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SearchResult {
  chunk_id: string;
  file_id: string;
  text: string;
  rank: number;
  file_name: string;
  file_category: string;
  file_tags: string[];
  created_at: string;
  snippet: string;
}

interface FileResult {
  id: string;
  name: string;
  category: string;
  auto_category: string;
  tags: string[];
  created_at: string;
  size: number;
  mime_type: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [fileResults, setFileResults] = useState<FileResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  const categories = [
    "all", "police_report", "medical_record", "financial_document", 
    "court_document", "correspondence", "incident_report", "evidence_photo", 
    "witness_statement", "legal_notice", "other"
  ];

  const searchContent = async () => {
    if (!query.trim()) {
      toast({
        title: "Search Query Required",
        description: "Please enter a search term",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      // Search in chunks for content
      let chunksQuery = supabase
        .from("chunks")
        .select(`
          id,
          file_id,
          text,
          files!inner(
            id,
            name,
            category,
            auto_category,
            tags,
            created_at,
            user_id
          )
        `)
        .textSearch("tsv", query, { type: "websearch" })
        .limit(20);

      // Apply category filter
      if (categoryFilter !== "all") {
        chunksQuery = chunksQuery.or(
          `category.eq.${categoryFilter},auto_category.eq.${categoryFilter}`,
          { foreignTable: "files" }
        );
      }

      const { data: chunks, error: chunksError } = await chunksQuery;

      if (chunksError) throw chunksError;

      // Transform chunk results
      const transformedChunks: SearchResult[] = (chunks || []).map((chunk: any) => ({
        chunk_id: chunk.id,
        file_id: chunk.file_id,
        text: chunk.text,
        rank: 1, // We could implement ranking later
        file_name: chunk.files.name,
        file_category: chunk.files.category || chunk.files.auto_category || "other",
        file_tags: chunk.files.tags || [],
        created_at: chunk.files.created_at,
        snippet: highlightSearchTerms(chunk.text.substring(0, 200) + "...", query)
      }));

      setSearchResults(transformedChunks);

      // Search in files for metadata
      let filesQuery = supabase
        .from("files")
        .select("id, name, category, auto_category, tags, created_at, size, mime_type")
        .or(`name.ilike.%${query}%,tags.cs.{${query}}`);

      if (categoryFilter !== "all") {
        filesQuery = filesQuery.or(`category.eq.${categoryFilter},auto_category.eq.${categoryFilter}`);
      }

      const { data: files, error: filesError } = await filesQuery.limit(10);

      if (filesError) throw filesError;
      setFileResults(files || []);

    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search Failed",
        description: "An error occurred while searching",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const highlightSearchTerms = (text: string, searchQuery: string): string => {
    if (!searchQuery) return text;
    
    const terms = searchQuery.toLowerCase().split(" ").filter(term => term.length > 2);
    let highlighted = text;
    
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, "gi");
      highlighted = highlighted.replace(regex, "<mark>$1</mark>");
    });
    
    return highlighted;
  };

  const openFile = async (fileId: string) => {
    // This would typically open a file viewer or redirect to evidence page
    toast({
      title: "File Viewer",
      description: "File viewer functionality will be implemented next",
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      searchContent();
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <SEO title="Search | NSW Legal Evidence Manager" description="Search across documents by keyword, category, and tags with fast retrieval." />
      
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Search Evidence</h1>
          <p className="text-muted-foreground">Search across all your documents and evidence files</p>
        </div>

        {/* Search Input */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for keywords, phrases, dates, names..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category === "all" ? "All Categories" : category.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={searchContent} disabled={loading}>
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Search
          </Button>
        </div>

        {/* Results */}
        {hasSearched && (
          <Tabs defaultValue="content" className="space-y-4">
            <TabsList>
              <TabsTrigger value="content" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Content ({searchResults.length})
              </TabsTrigger>
              <TabsTrigger value="files" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Files ({fileResults.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Searching...</p>
                  </div>
                </div>
              ) : searchResults.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Search className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Content Found</h3>
                    <p className="text-muted-foreground text-center">
                      No content matches your search query. Try different keywords or check the category filter.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                searchResults.map((result) => (
                  <Card key={result.chunk_id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-medium mb-1">
                            {result.file_name}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {result.file_category.replace("_", " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(result.created_at), "MMM dd, yyyy")}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openFile(result.file_id)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-sm text-muted-foreground">
                        {result.snippet}
                      </div>
                      {result.file_tags.length > 0 && (
                        <div className="flex gap-1 mt-3">
                          {result.file_tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="files" className="space-y-4">
              {fileResults.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Files Found</h3>
                    <p className="text-muted-foreground text-center">
                      No files match your search criteria. Try different keywords or adjust the category filter.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                fileResults.map((file) => (
                  <Card key={file.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-medium mb-2">{file.name}</CardTitle>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">
                              {(file.category || file.auto_category || "other").replace("_", " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(file.created_at), "MMM dd, yyyy")}
                            </span>
                            {file.size && (
                              <span className="text-xs text-muted-foreground">
                                {(file.size / 1024).toFixed(1)} KB
                              </span>
                            )}
                          </div>
                          {file.tags && file.tags.length > 0 && (
                            <div className="flex gap-1">
                              {file.tags.slice(0, 4).map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openFile(file.id)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}

        {!hasSearched && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Search className="h-16 w-16 text-muted-foreground mb-6" />
              <h3 className="text-xl font-semibold mb-3">Search Your Evidence</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Enter keywords, phrases, dates, or names to search across all your uploaded documents and evidence files.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground max-w-md">
                <div>
                  <h4 className="font-medium mb-2">Search by content:</h4>
                  <ul className="space-y-1">
                    <li>• Incident details</li>
                    <li>• People mentioned</li>
                    <li>• Dates and times</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Search by metadata:</h4>
                  <ul className="space-y-1">
                    <li>• File names</li>
                    <li>• Categories</li>
                    <li>• Tags</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}