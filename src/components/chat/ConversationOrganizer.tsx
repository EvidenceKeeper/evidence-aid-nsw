import React, { useState } from 'react';
import { Bookmark, BookmarkCheck, Tag, MoreVertical } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ConversationTag {
  id: string;
  name: string;
  color: string;
}

interface ConversationOrganizerProps {
  messageId: string;
  isBookmarked?: boolean;
  tags?: ConversationTag[];
  onBookmarkToggle: (messageId: string, bookmarked: boolean) => void;
  onTagAdd: (messageId: string, tag: ConversationTag) => void;
  onTagRemove: (messageId: string, tagId: string) => void;
  availableTags?: ConversationTag[];
}

const DEFAULT_TAGS: ConversationTag[] = [
  { id: 'evidence', name: 'Evidence', color: 'bg-blue-500' },
  { id: 'legal-advice', name: 'Legal Advice', color: 'bg-green-500' },
  { id: 'deadlines', name: 'Deadlines', color: 'bg-red-500' },
  { id: 'questions', name: 'Questions', color: 'bg-purple-500' },
  { id: 'strategy', name: 'Strategy', color: 'bg-orange-500' },
  { id: 'follow-up', name: 'Follow-up', color: 'bg-yellow-500' }
];

export function ConversationOrganizer({
  messageId,
  isBookmarked = false,
  tags = [],
  onBookmarkToggle,
  onTagAdd,
  onTagRemove,
  availableTags = DEFAULT_TAGS
}: ConversationOrganizerProps) {
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const { toast } = useToast();

  const handleBookmarkToggle = () => {
    onBookmarkToggle(messageId, !isBookmarked);
    toast({
      title: isBookmarked ? "Bookmark removed" : "Bookmark added",
      description: isBookmarked ? "Message unbookmarked" : "Message bookmarked for easy access"
    });
  };

  const handleTagAdd = (tag: ConversationTag) => {
    const isAlreadyTagged = tags.some(t => t.id === tag.id);
    if (isAlreadyTagged) {
      onTagRemove(messageId, tag.id);
      toast({
        title: "Tag removed",
        description: `Removed "${tag.name}" tag`
      });
    } else {
      onTagAdd(messageId, tag);
      toast({
        title: "Tag added", 
        description: `Added "${tag.name}" tag`
      });
    }
  };

  const handleNewTag = () => {
    if (newTagName.trim()) {
      const newTag: ConversationTag = {
        id: `custom-${Date.now()}`,
        name: newTagName.trim(),
        color: 'bg-gray-500'
      };
      onTagAdd(messageId, newTag);
      setNewTagName("");
      toast({
        title: "Custom tag added",
        description: `Added "${newTag.name}" tag`
      });
    }
  };

  return (
    <div className="flex items-center gap-1" role="toolbar" aria-label="Message organization tools">
      {/* Bookmark Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBookmarkToggle}
        className="h-6 w-6 p-0 hover:bg-muted"
        aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
        aria-pressed={isBookmarked}
      >
        {isBookmarked ? (
          <BookmarkCheck className="w-3 h-3 text-primary" aria-hidden="true" />
        ) : (
          <Bookmark className="w-3 h-3" aria-hidden="true" />
        )}
      </Button>

      {/* Tags Display */}
      {tags.length > 0 && (
        <div className="flex gap-1">
          {tags.slice(0, 2).map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="text-xs px-1 py-0 h-4"
              style={{ backgroundColor: `${tag.color}20` }}
            >
              {tag.name}
            </Badge>
          ))}
          {tags.length > 2 && (
            <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
              +{tags.length - 2}
            </Badge>
          )}
        </div>
      )}

      {/* Tag Menu */}
      <Popover open={showTagMenu} onOpenChange={setShowTagMenu}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm" 
            className="h-6 w-6 p-0 hover:bg-muted"
            aria-label="Manage tags"
            aria-expanded={showTagMenu}
          >
            <MoreVertical className="w-3 h-3" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              <h4 className="font-medium text-sm">Organize Message</h4>
            </div>

            {/* Available Tags */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Quick Tags</Label>
              <div className="grid grid-cols-2 gap-1">
                {availableTags.map((tag) => {
                  const isSelected = tags.some(t => t.id === tag.id);
                  return (
                    <Button
                      key={tag.id}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleTagAdd(tag)}
                      className="text-xs justify-start h-7"
                    >
                      <div 
                        className={`w-2 h-2 rounded-full mr-2 ${tag.color}`}
                      />
                      {tag.name}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Custom Tag Input */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Add Custom Tag</Label>
              <div className="flex gap-1">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Custom tag name"
                  className="text-xs h-7"
                  aria-label="Custom tag name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleNewTag();
                    }
                  }}
                />
                <Button
                  onClick={handleNewTag}
                  disabled={!newTagName.trim()}
                  size="sm"
                  className="h-7 px-2"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}