import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, MessageSquare, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Consultation {
  id: string;
  user_id: string;
  lawyer_id: string;
  status: string;
  case_summary: string | null;
  priority: string;
  created_at: string;
  updated_at: string;
  // We'll join this data
  user_email?: any;
  message_count?: number;
}

export default function LawyerConsultations() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkUserRole();
    fetchConsultations();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!role || (role.role !== 'lawyer' && role.role !== 'admin')) {
      toast({
        title: "Access Denied",
        description: "Only lawyers and admins can access consultations.",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    setUserRole(role.role);
  };

  const fetchConsultations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('lawyer_consultations')
        .select(`
          *,
          user_email:user_id(email)
        `)
        .or(`lawyer_id.eq.${user.id},lawyer_id.is.null`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get message counts for each consultation
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

      setConsultations(consultationsWithCounts);
    } catch (error) {
      console.error('Error fetching consultations:', error);
      toast({
        title: "Error",
        description: "Failed to load consultations.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateConsultationStatus = async (consultationId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('lawyer_consultations')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          ...(status === 'completed' && { completed_at: new Date().toISOString() })
        })
        .eq('id', consultationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Consultation ${status} successfully.`,
      });

      fetchConsultations();
    } catch (error) {
      console.error('Error updating consultation:', error);
      toast({
        title: "Error",
        description: "Failed to update consultation status.",
        variant: "destructive",
      });
    }
  };

  const assignToSelf = async (consultationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('lawyer_consultations')
        .update({ 
          lawyer_id: user.id,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', consultationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Consultation assigned to you and activated.",
      });

      fetchConsultations();
    } catch (error) {
      console.error('Error assigning consultation:', error);
      toast({
        title: "Error",
        description: "Failed to assign consultation.",
        variant: "destructive",
      });
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'active': return <MessageSquare className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const ConsultationCard = ({ consultation }: { consultation: Consultation }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4" />
          <CardTitle className="text-sm font-medium">
            {consultation.user_email || 'Unknown User'}
          </CardTitle>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={getPriorityColor(consultation.priority)}>
            {consultation.priority}
          </Badge>
          <Badge variant="outline" className="flex items-center space-x-1">
            {getStatusIcon(consultation.status)}
            <span>{consultation.status}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-4">
          {consultation.case_summary || 'No case summary provided'}
        </CardDescription>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <span>Created: {new Date(consultation.created_at).toLocaleDateString()}</span>
          <span>{consultation.message_count} messages</span>
        </div>

        <div className="flex space-x-2">
          {consultation.status === 'pending' && !consultation.lawyer_id && (
            <Button size="sm" onClick={() => assignToSelf(consultation.id)}>
              Take Case
            </Button>
          )}
          
          {consultation.status === 'active' && (
            <>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate(`/consultation/${consultation.id}`)}
              >
                View Case
              </Button>
              <Button 
                size="sm" 
                variant="secondary"
                onClick={() => updateConsultationStatus(consultation.id, 'completed')}
              >
                Complete
              </Button>
            </>
          )}
          
          {consultation.status === 'pending' && consultation.lawyer_id && (
            <Button 
              size="sm" 
              onClick={() => updateConsultationStatus(consultation.id, 'active')}
            >
              Activate
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Legal Consultations</h1>
        <p className="text-muted-foreground">
          Review and manage client consultation requests
        </p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {consultations.filter(c => c.status === 'pending').map(consultation => (
            <ConsultationCard key={consultation.id} consultation={consultation} />
          ))}
          {consultations.filter(c => c.status === 'pending').length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No pending consultations</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {consultations.filter(c => c.status === 'active').map(consultation => (
            <ConsultationCard key={consultation.id} consultation={consultation} />
          ))}
          {consultations.filter(c => c.status === 'active').length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No active consultations</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {consultations.filter(c => c.status === 'completed').map(consultation => (
            <ConsultationCard key={consultation.id} consultation={consultation} />
          ))}
          {consultations.filter(c => c.status === 'completed').length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No completed consultations</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {consultations.map(consultation => (
            <ConsultationCard key={consultation.id} consultation={consultation} />
          ))}
          {consultations.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No consultations found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}