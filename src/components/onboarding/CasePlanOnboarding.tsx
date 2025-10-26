import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Target, CheckCircle2, Loader2, Edit2, ArrowRight, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface CasePlanOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface Milestone {
  title: string;
  description: string;
  success_criteria: string[];
  estimated_days: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  category: string;
}

export function CasePlanOnboarding({ onComplete, onSkip }: CasePlanOnboardingProps) {
  const [step, setStep] = useState<'goal' | 'context' | 'review' | 'customize'>('goal');
  const [primaryGoal, setPrimaryGoal] = useState('');
  const [caseType, setCaseType] = useState('family_law');
  const [context, setContext] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState<'urgent' | 'normal'>('normal');
  const [generatedMilestones, setGeneratedMilestones] = useState<Milestone[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const commonGoals = [
    'Obtain full custody of my children',
    'Secure an AVO (Apprehended Violence Order)',
    'Document abuse for family court',
    'Prepare for custody hearing',
    'Gather evidence of domestic violence',
    'Apply for child support',
    'Respond to AVO application'
  ];

  const handleGeneratePlan = async () => {
    if (!primaryGoal.trim()) {
      toast({
        title: 'Goal Required',
        description: 'Please enter or select your primary legal goal',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-case-plan', {
        body: {
          primary_goal: primaryGoal,
          case_type: caseType,
          context: context || 'No additional context'
        }
      });

      if (error) throw error;

      setGeneratedMilestones(data.milestones);
      setStep('review');
      
      toast({
        title: 'Case Plan Generated! 🎯',
        description: `Created ${data.milestones.length}-step plan for: ${primaryGoal}`,
      });
    } catch (error: any) {
      console.error('Error generating plan:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Could not generate case plan',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComplete = () => {
    toast({
      title: 'Case Plan Activated! 🚀',
      description: 'Your AI assistant will now guide you through each milestone',
    });
    onComplete();
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      evidence: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
      legal: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
      safety: 'bg-red-500/10 text-red-700 dark:text-red-300',
      documentation: 'bg-green-500/10 text-green-700 dark:text-green-300',
      preparation: 'bg-orange-500/10 text-orange-700 dark:text-orange-300'
    };
    return colors[category] || 'bg-muted text-muted-foreground';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'destructive',
      high: 'default',
      medium: 'secondary',
      low: 'outline'
    };
    return colors[priority] || 'outline';
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-6 w-6 text-primary" />
            <CardTitle>Create Your Case Plan</CardTitle>
          </div>
          <CardDescription>
            {step === 'goal' && 'Define your primary legal goal to generate a personalized roadmap'}
            {step === 'context' && 'Provide additional context to refine your plan'}
            {step === 'review' && 'Review your AI-generated milestone plan'}
            {step === 'customize' && 'Customize your milestones'}
          </CardDescription>
          <Progress value={
            step === 'goal' ? 25 : 
            step === 'context' ? 50 : 
            step === 'review' ? 75 : 100
          } className="mt-4" />
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Goal Definition */}
          {step === 'goal' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="primaryGoal">Your Primary Legal Goal *</Label>
                <Input
                  id="primaryGoal"
                  placeholder="e.g., Obtain full custody of my children"
                  value={primaryGoal}
                  onChange={(e) => setPrimaryGoal(e.target.value)}
                  className="text-base"
                />
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Or select a common goal:</p>
                  <div className="grid gap-2">
                    {commonGoals.map((goal) => (
                      <Button
                        key={goal}
                        variant={primaryGoal === goal ? 'default' : 'outline'}
                        className="justify-start text-left h-auto py-3"
                        onClick={() => setPrimaryGoal(goal)}
                      >
                        {goal}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Case Type</Label>
                <RadioGroup value={caseType} onValueChange={setCaseType}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="family_law" id="family" />
                    <Label htmlFor="family" className="font-normal">Family Law / Custody</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="domestic_violence" id="dv" />
                    <Label htmlFor="dv" className="font-normal">Domestic Violence / AVO</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="general" id="general" />
                    <Label htmlFor="general" className="font-normal">General Legal Matter</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={() => setStep('context')} 
                  disabled={!primaryGoal.trim()}
                  className="flex-1"
                >
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={onSkip}>
                  Skip for now
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Context & Urgency */}
          {step === 'context' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="context">Additional Context (Optional)</Label>
                <Textarea
                  id="context"
                  placeholder="Any important details about your situation, deadlines, or specific concerns..."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-3">
                <Label>Urgency Level</Label>
                <RadioGroup value={urgencyLevel} onValueChange={(v) => setUrgencyLevel(v as any)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="urgent" id="urgent" />
                    <Label htmlFor="urgent" className="font-normal">
                      <span className="font-semibold">Urgent</span> - Court date or deadline within 30 days
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="normal" id="normal" />
                    <Label htmlFor="normal" className="font-normal">
                      <span className="font-semibold">Normal</span> - Building case over time
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('goal')}>
                  Back
                </Button>
                <Button 
                  onClick={handleGeneratePlan} 
                  disabled={isGenerating}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Your Plan...
                    </>
                  ) : (
                    <>
                      Generate My Plan
                      <Target className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review Generated Plan */}
          {step === 'review' && (
            <div className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-lg border">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Goal: {primaryGoal}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Generated {generatedMilestones.length}-step personalized plan
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {generatedMilestones.map((milestone, index) => (
                  <Card key={index} className="border-l-4 border-l-primary">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="font-mono">
                              Milestone {index + 1}
                            </Badge>
                            <Badge variant={getPriorityColor(milestone.priority) as any}>
                              {milestone.priority}
                            </Badge>
                            <Badge className={getCategoryColor(milestone.category)}>
                              {milestone.category}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg">{milestone.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {milestone.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Success Criteria:</p>
                        <ul className="space-y-1">
                          {milestone.success_criteria.map((criteria, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex gap-2">
                              <span className="text-primary">✓</span>
                              {criteria}
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-muted-foreground mt-2">
                          Estimated time: {milestone.estimated_days} days
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Your AI assistant will guide you
                    </p>
                    <p className="text-blue-700 dark:text-blue-300">
                      Every conversation will focus on completing your current milestone. 
                      The AI will proactively help you gather what you need and move through each step.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('context')}>
                  Back
                </Button>
                <Button onClick={handleComplete} className="flex-1">
                  Activate This Plan <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}