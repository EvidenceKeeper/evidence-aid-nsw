import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Shield, 
  FileText, 
  MessageSquare, 
  Clock, 
  ArrowRight, 
  Check,
  Target,
  BookOpen,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LawyerChatOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

const CASE_TYPES = [
  { id: 'coercive_control', name: 'Coercive Control', icon: Shield, color: 'bg-destructive/10 text-destructive' },
  { id: 'domestic_violence', name: 'Domestic Violence', icon: Shield, color: 'bg-destructive/10 text-destructive' },
  { id: 'family_law', name: 'Family Law/Custody', icon: Users, color: 'bg-primary/10 text-primary' },
  { id: 'harassment', name: 'Harassment/Stalking', icon: Shield, color: 'bg-orange-500/10 text-orange-600' },
  { id: 'employment', name: 'Employment Issues', icon: BookOpen, color: 'bg-blue-500/10 text-blue-600' },
  { id: 'other', name: 'Other Legal Matter', icon: FileText, color: 'bg-muted-foreground/10 text-muted-foreground' }
];

const EXPERIENCE_LEVELS = [
  { id: 'first_time', name: 'First time dealing with legal issues', description: 'I need guidance on everything' },
  { id: 'some_experience', name: 'Some legal experience', description: 'I understand basics but need help' },
  { id: 'experienced', name: 'Experienced with legal processes', description: 'I know what I\'m doing, just need AI assistance' }
];

export function LawyerChatOnboarding({ onComplete, onSkip }: LawyerChatOnboardingProps) {
  const [step, setStep] = useState(1);
  const [caseType, setCaseType] = useState('');
  const [experience, setExperience] = useState('');
  const [primaryGoal, setPrimaryGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const progress = (step / 4) * 100;

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handlePrevious = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = async () => {
    if (!caseType || !experience || !primaryGoal.trim()) {
      toast({ 
        title: "Please complete all steps", 
        description: "We need this information to personalize your experience.",
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Save onboarding data to case_memory
      const { error } = await supabase
        .from('case_memory')
        .upsert({
          user_id: user.id,
          primary_goal: primaryGoal.trim(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({ 
        title: "Welcome to Veronica!", 
        description: "Your legal assistant is ready to help with your case." 
      });
      
      onComplete();
    } catch (error) {
      console.error('Onboarding error:', error);
      toast({ 
        title: "Setup failed", 
        description: "Please try again or skip for now.",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl card-premium">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Brain className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Welcome to Veronica</CardTitle>
              <p className="text-muted-foreground mt-1">Your NSW Legal Evidence Assistant</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground">Step {step} of 4</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">What brings you here today?</h3>
                <p className="text-muted-foreground">Select the type of legal matter you're dealing with</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {CASE_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <Button
                      key={type.id}
                      variant={caseType === type.id ? "default" : "outline"}
                      className="h-auto p-4 justify-start gap-3"
                      onClick={() => setCaseType(type.id)}
                    >
                      <div className={`p-2 rounded-lg ${type.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-medium">{type.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">Your experience level?</h3>
                <p className="text-muted-foreground">This helps me adjust my communication style</p>
              </div>
              
              <div className="space-y-3">
                {EXPERIENCE_LEVELS.map((level) => (
                  <Button
                    key={level.id}
                    variant={experience === level.id ? "default" : "outline"}
                    className="w-full h-auto p-4 justify-start text-left"
                    onClick={() => setExperience(level.id)}
                  >
                    <div className="space-y-1">
                      <div className="font-medium">{level.name}</div>
                      <div className="text-sm text-muted-foreground">{level.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">What's your main goal?</h3>
                <p className="text-muted-foreground">Be specific about what you want to achieve</p>
              </div>
              
              <div className="space-y-4">
                <Input
                  value={primaryGoal}
                  onChange={(e) => setPrimaryGoal(e.target.value)}
                  placeholder="e.g., Get full custody of my children, Document abuse for court, Prepare for divorce..."
                  className="h-12 text-base"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    "Obtain custody of children",
                    "Document evidence for court",
                    "Prepare for divorce proceedings",
                    "Build harassment case",
                    "Employment dispute resolution",
                    "Safety planning and protection"
                  ].map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="ghost"
                      size="sm"
                      className="h-auto p-2 text-left justify-start text-muted-foreground hover:text-foreground"
                      onClick={() => setPrimaryGoal(suggestion)}
                    >
                      <Target className="w-3 h-3 mr-2 flex-shrink-0" />
                      <span className="text-xs">{suggestion}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-4">
                <div className="p-4 rounded-xl bg-primary/10">
                  <Check className="w-12 h-12 text-primary mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">You're all set!</h3>
                  <p className="text-muted-foreground">Here's what I can help you with:</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div className="flex gap-3 p-3 rounded-lg bg-muted/30">
                    <MessageSquare className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Smart Conversations</div>
                      <div className="text-xs text-muted-foreground">Context-aware legal guidance</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 p-3 rounded-lg bg-muted/30">
                    <FileText className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Evidence Analysis</div>
                      <div className="text-xs text-muted-foreground">Upload and analyze documents</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 p-3 rounded-lg bg-muted/30">
                    <Clock className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Case Timeline</div>
                      <div className="text-xs text-muted-foreground">Track events and progress</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 p-3 rounded-lg bg-muted/30">
                    <Shield className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Privacy First</div>
                      <div className="text-xs text-muted-foreground">Your information stays secure</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-6">
            <div className="flex gap-2">
              {step > 1 && (
                <Button variant="outline" onClick={handlePrevious}>
                  Previous
                </Button>
              )}
              <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
                Skip for now
              </Button>
            </div>
            
            <div>
              {step < 4 ? (
                <Button 
                  onClick={handleNext} 
                  disabled={
                    (step === 1 && !caseType) ||
                    (step === 2 && !experience) ||
                    (step === 3 && !primaryGoal.trim())
                  }
                >
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleComplete} disabled={loading} className="btn-premium">
                  {loading ? "Setting up..." : "Start Chatting"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}