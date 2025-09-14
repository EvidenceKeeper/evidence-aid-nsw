import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send, FileText, User, Calendar, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import CitationAwareResponse from '@/components/legal/CitationAwareResponse';

interface Consultation {
  id: string;
  user_id: string;
  lawyer_id: string;
  status: string;
  case_summary: string | null;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface ConsultationMessage {
  id: string;
  consultation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  citations: any;
  metadata: any;
  created_at: string;
  sender_role?: string;
}

interface UserEvidence {
  id: string;
  name: string;
  category: string;
  created_at: string;
}

export default function ConsultationDetail() {
  const { consultationId } = useParams<{ consultationId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [userEvidence, setUserEvidence] = useState<UserEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<string>('legal_analysis');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (consultationId) {
      fetchConsultationData();
    }
  }, [consultationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConsultationData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setCurrentUserId(user.id);

      // Fetch consultation details
      const { data: consultationData, error: consultationError } = await supabase
        .from('lawyer_consultations')
        .select('*')
        .eq('id', consultationId)
        .single();

      if (consultationError) throw consultationError;
      setConsultation(consultationData);

      // Fetch messages with sender role information
      const { data: messagesData, error: messagesError } = await supabase
        .from('consultation_messages')
        .select(`
          *
        `)
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Enhance messages with sender role info
      const enhancedMessages = await Promise.all(
        (messagesData || []).map(async (message) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', message.sender_id)
            .single();
          
          return {
            ...message,
            sender_role: roleData?.role || 'user',
          };
        })
      );

      setMessages(enhancedMessages);

      // Fetch user's evidence files
      const { data: evidenceData, error: evidenceError } = await supabase
        .from('files')
        .select('id, name, category, created_at')
        .eq('user_id', consultationData.user_id)
        .order('created_at', { ascending: false });

      if (evidenceError) throw evidenceError;
      setUserEvidence(evidenceData || []);

    } catch (error) {
      console.error('Error fetching consultation data:', error);
      toast({
        title: "Error",
        description: "Failed to load consultation details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !consultation || !currentUserId) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('consultation_messages')
        .insert({
          consultation_id: consultation.id,
          sender_id: currentUserId,
          content: newMessage.trim(),
          message_type: messageType,
          citations: [],
          metadata: {}
        });

      if (error) throw error;

      setNewMessage('');
      fetchConsultationData(); // Refresh to show new message
      
      toast({
        title: "Message sent",
        description: "Your message has been sent to the client.",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'legal_analysis': return 'bg-blue-50 border-blue-200';
      case 'citation': return 'bg-green-50 border-green-200';
      case 'recommendation': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getMessageTypeLabel = (type: string) => {
    switch (type) {
      case 'legal_analysis': return 'Legal Analysis';
      case 'citation': return 'Citation';
      case 'recommendation': return 'Recommendation';
      default: return 'Message';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Consultation not found</p>
            <Button onClick={() => navigate('/consultations')} className="mt-4">
              Back to Consultations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/consultations')}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Legal Consultation</h1>
          <p className="text-muted-foreground">Case ID: {consultation.id.slice(0, 8)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chat Area */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Case Discussion</span>
                </CardTitle>
                <Badge variant="outline">{consultation.status}</Badge>
              </div>
              {consultation.case_summary && (
                <CardDescription>{consultation.case_summary}</CardDescription>
              )}
            </CardHeader>
            
            <Separator />
            
            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg border ${getMessageTypeColor(message.message_type)} ${
                    message.sender_id === currentUserId ? 'ml-8' : 'mr-8'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {message.sender_role === 'lawyer' ? 'Lawyer' : 'Client'}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {getMessageTypeLabel(message.message_type)}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.created_at).toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Use Citation-Aware Response for lawyer messages */}
                  {message.sender_role === 'lawyer' ? (
                    <CitationAwareResponse
                      content={message.content}
                      citations={message.citations || []}
                      consultationId={consultation.id}
                      mode="lawyer"
                      className="border-0 shadow-none p-0"
                    />
                  ) : (
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </CardContent>
            
            <Separator />
            
            {/* Message Input */}
            <div className="p-4 space-y-3">
              <div className="flex items-center space-x-2">
                <Select value={messageType} onValueChange={(value: any) => setMessageType(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Message</SelectItem>
                    <SelectItem value="legal_analysis">Legal Analysis</SelectItem>
                    <SelectItem value="citation">Citation</SelectItem>
                    <SelectItem value="recommendation">Recommendation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex space-x-2">
                <Textarea
                  placeholder="Type your legal response with full citations..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="min-h-[80px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={sending || !newMessage.trim()}
                  size="icon"
                  className="h-20"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ctrl+Enter to send • All legal responses should include relevant citations
              </p>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Case Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Case Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium">Priority</p>
                <Badge variant="outline">{consultation.priority}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="text-sm text-muted-foreground flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {new Date(consultation.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Last Updated</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(consultation.updated_at).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Client Evidence */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Client Evidence</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userEvidence.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {userEvidence.map((file) => (
                    <div key={file.id} className="p-2 bg-muted rounded text-sm">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.category} • {new Date(file.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No evidence files uploaded</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}