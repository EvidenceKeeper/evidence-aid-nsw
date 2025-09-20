import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Calendar, 
  Tag, 
  Eye,
  ChevronRight,
  Folder,
  Search
} from "lucide-react";
import { useEnhancedMemory } from "@/hooks/useEnhancedMemory";
import { format } from "date-fns";

interface EvidenceItem {
  file_id: string;
  exhibit_code: string;
  file_name: string;
  summary: string;
  uploaded_date: string;
  sections_count?: number;
  category?: string;
}

export function EvidenceIndexDisplay() {
  const { caseMemory } = useEnhancedMemory();
  const [selectedExhibit, setSelectedExhibit] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  if (!caseMemory?.evidence_index) return null;

  const evidenceItems = Array.isArray(caseMemory.evidence_index) 
    ? caseMemory.evidence_index as EvidenceItem[]
    : [];

  const filteredEvidence = evidenceItems.filter(item => 
    item.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.exhibit_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedItem = selectedExhibit 
    ? evidenceItems.find(item => item.exhibit_code === selectedExhibit)
    : null;

  const getCategoryIcon = (category?: string) => {
    const icons = {
      'police_report': '🚔',
      'medical': '⚕️',
      'communication': '💬',
      'financial': '💰',
      'photo': '📸',
      'document': '📄',
    };
    return icons[category as keyof typeof icons] || '📄';
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Folder className="h-4 w-4" />
          Evidence Index ({evidenceItems.length} files)
        </CardTitle>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search exhibits..."
            className="w-full text-xs pl-7 pr-3 py-2 bg-muted/50 border-0 rounded focus:bg-background focus:ring-1 focus:ring-ring"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-64">
          <div className="p-3 space-y-2">
            {filteredEvidence.length === 0 ? (
              <div className="text-center py-4">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  {searchTerm ? 'No matching exhibits found' : 'No evidence indexed yet'}
                </p>
              </div>
            ) : (
              filteredEvidence.map((item) => (
                <Card 
                  key={item.exhibit_code}
                  className={`cursor-pointer transition-all hover:shadow-sm ${
                    selectedExhibit === item.exhibit_code ? 'ring-2 ring-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setSelectedExhibit(
                    selectedExhibit === item.exhibit_code ? null : item.exhibit_code
                  )}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {/* Exhibit Code */}
                      <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {item.exhibit_code}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs">
                            {getCategoryIcon(item.category)}
                          </span>
                          <h4 className="font-medium text-xs truncate">
                            {item.file_name}
                          </h4>
                          <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform ${
                            selectedExhibit === item.exhibit_code ? 'rotate-90' : ''
                          }`} />
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {item.summary}
                        </p>

                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            <Calendar className="w-2 h-2 mr-1" />
                            {format(new Date(item.uploaded_date), "MMM dd")}
                          </Badge>
                          
                          {item.sections_count && (
                            <Badge variant="outline" className="text-xs">
                              {item.sections_count} sections
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {selectedExhibit === item.exhibit_code && selectedItem && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        <div className="text-xs">
                          <span className="font-medium text-muted-foreground">File ID: </span>
                          <span className="font-mono text-xs">{selectedItem.file_id.slice(-8)}</span>
                        </div>
                        
                        <div className="text-xs">
                          <span className="font-medium text-muted-foreground">Uploaded: </span>
                          <span>{format(new Date(selectedItem.uploaded_date), "PPP")}</span>
                        </div>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs h-6 mt-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            // In a real app, this would navigate to the file view
                            console.log('View exhibit:', selectedItem.exhibit_code);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Details
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}