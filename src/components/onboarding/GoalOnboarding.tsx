import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, ArrowRight, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GoalOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

const COMMON_GOALS = [
  "Obtain full custody of my children",
  "Document domestic violence for court",
  "Prepare for divorce proceedings", 
  "Gather evidence for employment dispute",
  "Build case for harassment claim",
  "Prepare for family court hearing"
];

export function GoalOnboarding({ onComplete, onSkip }: GoalOnboardingProps) {
  const [selectedGoal, setSelectedGoal] = useState('');
  const [customGoal, setCustomGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSaveGoal = async () => {
    const goal = customGoal.trim() || selectedGoal;
    if (!goal) {
      toast({ title: "Please select or enter a goal", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      // Insert or update case memory with the goal
      const { error } = await supabase
        .from('case_memory')
        .upsert({
          user_id: user.user.id,
          primary_goal: goal,
          case_readiness_status: 'collecting',
          goal_status: 'active',
          last_updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({ title: "Goal saved successfully", description: "I'll help you work towards this goal." });
      onComplete();
    } catch (error) {
      console.error('Error saving goal:', error);
      toast({ title: "Failed to save goal", description: "Please try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-warm-50 via-warm-100 to-warm-200">
      <Card className="w-full max-w-2xl card-premium">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/10">
              <Target className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold mb-2">
            What's your main legal goal?
          </CardTitle>
          <p className="text-muted-foreground text-base">
            I'll tailor every conversation to help you progress towards this objective.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Choose a common goal:</Label>
            <div className="grid grid-cols-1 gap-2">
              {COMMON_GOALS.map((goal) => (
                <Button
                  key={goal}
                  variant={selectedGoal === goal ? "default" : "outline"}
                  className="h-auto p-3 text-left justify-start"
                  onClick={() => {
                    setSelectedGoal(goal);
                    setCustomGoal('');
                  }}
                >
                  <Shield className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="text-sm">{goal}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="custom-goal" className="text-sm font-medium">
              Describe your specific goal:
            </Label>
            <Input
              id="custom-goal"
              value={customGoal}
              onChange={(e) => {
                setCustomGoal(e.target.value);
                setSelectedGoal('');
              }}
              placeholder="e.g., Prepare evidence for workplace discrimination case"
              className="input-elegant focus-elegant"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onSkip}
              className="flex-1"
            >
              Skip for now
            </Button>
            <Button
              onClick={handleSaveGoal}
              disabled={loading || (!selectedGoal && !customGoal.trim())}
              className="flex-1 btn-premium"
            >
              {loading ? "Saving..." : (
                <>
                  Set Goal
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p className="flex items-center justify-center gap-2">
              <Shield className="h-4 w-4" />
              Your goal helps me provide focused, trauma-informed guidance
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}