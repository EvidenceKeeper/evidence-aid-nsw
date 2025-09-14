import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Share2, Copy, Mail, Calendar as CalendarIcon, Trash2, Eye, MessageSquare, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCaseSharing } from '@/hooks/useCaseSharing';

interface CaseShareDialogProps {
  children: React.ReactNode;
}

export function CaseShareDialog({ children }: CaseShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<'view' | 'comment' | 'edit'>('view');
  const [expiryDate, setExpiryDate] = useState<Date>();
  const [showCalendar, setShowCalendar] = useState(false);
  
  const { 
    sharedCases, 
    shareToken, 
    isLoading, 
    shareCase, 
    revokeAccess, 
    generateShareLink, 
    copyShareLink 
  } = useCaseSharing();

  const handleShareCase = async () => {
    if (!shareEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    const success = await shareCase(shareEmail, permissionLevel, expiryDate);
    if (success) {
      setShareEmail('');
      setExpiryDate(undefined);
      toast.success('Case shared successfully!');
    }
  };

  const handleGenerateLink = async () => {
    await generateShareLink(permissionLevel, expiryDate);
  };

  const handleCopyLink = () => {
    if (shareToken) {
      copyShareLink(shareToken);
      toast.success('Share link copied to clipboard!');
    }
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'view': return <Eye className="h-4 w-4" />;
      case 'comment': return <MessageSquare className="h-4 w-4" />;
      case 'edit': return <Edit className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'view': return 'secondary';
      case 'comment': return 'outline';
      case 'edit': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Case
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Share with specific user */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Share with User</CardTitle>
              <CardDescription>
                Share your case with a specific user by email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="share-email">Email Address</Label>
                <Input
                  id="share-email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Permission Level</Label>
                <Select value={permissionLevel} onValueChange={(value: any) => setPermissionLevel(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        View Only
                      </div>
                    </SelectItem>
                    <SelectItem value="comment">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        View & Comment
                      </div>
                    </SelectItem>
                    <SelectItem value="edit">
                      <div className="flex items-center gap-2">
                        <Edit className="h-4 w-4" />
                        Full Edit Access
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Expiry Date (Optional)</Label>
                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expiryDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expiryDate ? format(expiryDate, "PPP") : "No expiry"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expiryDate}
                      onSelect={(date) => {
                        setExpiryDate(date);
                        setShowCalendar(false);
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                    {expiryDate && (
                      <div className="p-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setExpiryDate(undefined);
                            setShowCalendar(false);
                          }}
                        >
                          Clear expiry
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              <Button onClick={handleShareCase} disabled={isLoading} className="w-full">
                <Mail className="mr-2 h-4 w-4" />
                Share Case
              </Button>
            </CardContent>
          </Card>

          {/* Generate share link */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Share Link</CardTitle>
              <CardDescription>
                Generate a shareable link that anyone can use
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={handleGenerateLink} disabled={isLoading}>
                  Generate Link
                </Button>
                {shareToken && (
                  <Button onClick={handleCopyLink} variant="outline">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>
                )}
              </div>
              
              {shareToken && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Share Link:</p>
                  <p className="text-sm font-mono break-all">
                    {window.location.origin}/shared/{shareToken}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current shares */}
          {sharedCases.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Shares</CardTitle>
                <CardDescription>
                  Users who currently have access to your case
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sharedCases.map((share) => (
                    <div key={share.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{share.shared_with_email || 'Unknown User'}</p>
                            <Badge variant={getPermissionColor(share.permission_level)}>
                              <div className="flex items-center gap-1">
                                {getPermissionIcon(share.permission_level)}
                                <span className="capitalize">{share.permission_level}</span>
                              </div>
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Shared {format(new Date(share.shared_at), 'MMM d, yyyy')}
                            {share.expires_at && ` • Expires ${format(new Date(share.expires_at), 'MMM d, yyyy')}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeAccess(share.id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}