import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Scale, Send, Clock, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ConsultationRequest {
  id: string;
  status: string;
  case_summary: string | null;
  priority: string;
  created_at: string;
  message_count?: number;
}

export default function ConsultationRequest() {
  const [caseSummary, setCaseSummary] = useState('');
  const [priority, setPriority] = useState('normal');
  const [submitting, setSubmitting] = useState(false);
  const [existingConsultations, setExistingConsultations] = useState<ConsultationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchExistingConsultations();
  }, []);

  const fetchExistingConsultations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('lawyer_consultations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get message counts
      const consultationsWithCounts = await Promise.all(
        (data || []).map(async (consultation) => {
          const { count } = await supabase
            .from('consultation_messages')
            .select('*', { count: 'exact', head: true })
            .eq('consultation_id', consultation.id);

          return {
            ...consultation,
            message_count: count || 0,
          };
        })
      );

      setExistingConsultations(consultationsWithCounts);
    } catch (error) {
      console.error('Error fetching consultations:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitConsultationRequest = async () => {
    if (!caseSummary.trim()) {
      toast({
        title: "Error",
        description: "Please provide a case summary.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to request a consultation.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('lawyer_consultations')
        .insert({
          user_id: user.id,
          lawyer_id: null,
          case_summary: caseSummary.trim(),
          priority,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Consultation Requested",
        description: "Your consultation request has been submitted. A lawyer will review it shortly.",
      });

      setCaseSummary('');
      setPriority('normal');
      fetchExistingConsultations(); // Refresh the list
    } catch (error) {
      console.error('Error submitting consultation request:', error);
      toast({
        title: "Error",
        description: "Failed to submit consultation request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      case 'normal': return 'outline';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Request New Consultation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Scale className="h-5 w-5" />
            <span>Request Legal Consultation</span>
          </CardTitle>
          <CardDescription>
            Get professional legal advice from qualified lawyers. Provide a summary of your case and we'll connect you with the right lawyer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Case Summary</label>
            <Textarea
              placeholder="Please describe your legal situation, including key facts, issues, and what kind of help you need. The more detail you provide, the better we can assist you."
              value={caseSummary}
              onChange={(e) => setCaseSummary(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Priority Level</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - General advice needed</SelectItem>
                <SelectItem value="normal">Normal - Standard consultation</SelectItem>
                <SelectItem value="high">High - Time-sensitive matter</SelectItem>
                <SelectItem value="urgent">Urgent - Immediate legal assistance required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={submitConsultationRequest} 
            disabled={submitting || !caseSummary.trim()}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {submitting ? 'Submitting...' : 'Submit Consultation Request'}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Consultations */}
      {existingConsultations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Your Consultation History</span>
            </CardTitle>
            <CardDescription>
              Track the status of your consultation requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {existingConsultations.map((consultation) => (
                <div
                  key={consultation.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(consultation.status)}>
                        {consultation.status}
                      </Badge>
                      <Badge variant={getPriorityColor(consultation.priority)}>
                        {consultation.priority} priority
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {consultation.message_count} messages
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(consultation.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  {consultation.case_summary && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {consultation.case_summary}
                    </p>
                  )}
                  
                  {consultation.status === 'active' && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-green-600 font-medium">
                        ✓ A lawyer is reviewing your case and will respond soon.
                      </p>
                    </div>
                  )}
                  
                  {consultation.status === 'pending' && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-yellow-600 font-medium">
                        ⏳ Your consultation request is waiting for lawyer assignment.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
