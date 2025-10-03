import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Users,
  MapPin,
  Calendar,
  Heart,
  AlertTriangle,
  UserCheck,
  Settings,
  Home,
  Baby,
  Briefcase,
  Phone
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
  
  // New comprehensive intake data
  const [personalInfo, setPersonalInfo] = useState({
    name: '',
    location: '',
    livingStatus: '',
    dependents: ''
  });
  const [keyFacts, setKeyFacts] = useState('');
  const [parties, setParties] = useState<Array<{id: string, name: string, relationship: string}>>([]);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyRelationship, setNewPartyRelationship] = useState('');
  const [issues, setIssues] = useState<Array<{id: string, issue: string, urgency: string}>>([]);
  const [safetyInfo, setSafetyInfo] = useState({
    safetyLevel: '',
    supportNetwork: '',
    immediateHelp: ''
  });
  const [communicationPrefs, setCommunicationPrefs] = useState({
    style: '',
    frequency: '',
    accessibility: ''
  });
  
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const progress = (step / 8) * 100;

  const handleNext = () => {
    if (step < 8) setStep(step + 1);
  };

  const handlePrevious = () => {
    if (step > 1) setStep(step - 1);
  };

  const addParty = () => {
    if (newPartyName.trim() && newPartyRelationship) {
      setParties([...parties, {
        id: crypto.randomUUID(),
        name: newPartyName.trim(),
        relationship: newPartyRelationship
      }]);
      setNewPartyName('');
      setNewPartyRelationship('');
    }
  };

  const removeParty = (id: string) => {
    setParties(parties.filter(p => p.id !== id));
  };

  const addIssue = (issueText: string, urgency: string) => {
    setIssues([...issues, {
      id: crypto.randomUUID(),
      issue: issueText,
      urgency
    }]);
  };

  const handleComplete = async () => {
    if (!caseType || !experience || !primaryGoal.trim()) {
      toast({ 
        title: "Please complete the main steps", 
        description: "We need at least your case type, experience, and goal.",
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Prepare comprehensive case memory data
      const caseMemoryData = {
        user_id: user.id,
        primary_goal: primaryGoal.trim(),
        key_facts: keyFacts ? [{
          id: crypto.randomUUID(),
          fact: keyFacts,
          added_at: new Date().toISOString(),
          source: 'onboarding'
        }] : [],
        parties: parties.length > 0 ? {
          involved_parties: parties,
          case_type: caseType,
          collected_at: new Date().toISOString()
        } : null,
        issues: issues.length > 0 ? {
          priority_issues: issues,
          assessment_date: new Date().toISOString()
        } : null,
        personalization_profile: {
          case_type: caseType,
          experience_level: experience,
          communication_style: communicationPrefs.style || 'balanced',
          communication_frequency: communicationPrefs.frequency || 'normal',
          accessibility_needs: communicationPrefs.accessibility || 'none',
          personal_info: {
            preferred_name: personalInfo.name || 'there',
            location: personalInfo.location,
            living_status: personalInfo.livingStatus,
            dependents: personalInfo.dependents
          },
          safety_profile: {
            safety_level: safetyInfo.safetyLevel,
            support_network: safetyInfo.supportNetwork,
            immediate_help_needed: safetyInfo.immediateHelp
          },
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString()
        },
        case_readiness_status: 'collecting',
        current_stage: 1,
        session_count: 2,
        updated_at: new Date().toISOString(),
        last_updated_at: new Date().toISOString()
      };

      // Save comprehensive onboarding data to case_memory
      const { error: memoryError } = await supabase
        .from('case_memory')
        .upsert(caseMemoryData, { onConflict: 'user_id' });

      if (memoryError) {
        console.error('❌ Failed to update case_memory with session_count:', memoryError);
        throw memoryError;
      } else {
        console.log('✅ Onboarding complete: session_count set to 2, onboarding_completed: true');
      }

      toast({ 
        title: `Welcome ${personalInfo.name || 'to Veronica'}!`, 
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
            <p className="text-sm text-muted-foreground">Step {step} of 8</p>
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
                      className="h-auto p-2 text-left justify-start text-muted-foreground hover:text-foreground whitespace-normal"
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
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">Tell me a bit about yourself</h3>
                <p className="text-muted-foreground">This helps me tailor my assistance</p>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">What should I call you?</label>
                    <Input
                      value={personalInfo.name}
                      onChange={(e) => setPersonalInfo({...personalInfo, name: e.target.value})}
                      placeholder="Your preferred name"
                      className="h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Where are you located?</label>
                    <Input
                      value={personalInfo.location}
                      onChange={(e) => setPersonalInfo({...personalInfo, location: e.target.value})}
                      placeholder="NSW suburb or region"
                      className="h-11"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current living situation</label>
                  <Select value={personalInfo.livingStatus} onValueChange={(value) => setPersonalInfo({...personalInfo, livingStatus: value})}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select your current situation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="safe_stable">Safe and stable</SelectItem>
                      <SelectItem value="temporary">Temporary accommodation</SelectItem>
                      <SelectItem value="with_family">Staying with family/friends</SelectItem>
                      <SelectItem value="unsafe">Not feeling safe</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Do you have children or dependents involved?</label>
                  <Input
                    value={personalInfo.dependents}
                    onChange={(e) => setPersonalInfo({...personalInfo, dependents: e.target.value})}
                    placeholder="e.g., 2 children (ages 8, 12), elderly parent"
                    className="h-11"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">Tell me what happened</h3>
                <p className="text-muted-foreground">Share the main events - I'll help organize them later</p>
              </div>
              
              <div className="space-y-4">
                <Textarea
                  value={keyFacts}
                  onChange={(e) => setKeyFacts(e.target.value)}
                  placeholder="Tell me about the key events, incidents, or situations that led you here. Don't worry about perfect details - just share what feels important..."
                  className="min-h-32 text-base resize-none"
                  rows={6}
                />
                
                <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  💡 <strong>Tip:</strong> Include dates if you remember them, but don't worry if you don't. We can build a proper timeline together later.
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">Who else is involved?</h3>
                <p className="text-muted-foreground">Add the important people in your case</p>
              </div>
              
              <div className="space-y-4">
                {parties.length > 0 && (
                  <div className="space-y-2">
                    {parties.map((party) => (
                      <div key={party.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <div className="font-medium">{party.name}</div>
                          <div className="text-sm text-muted-foreground">{party.relationship}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeParty(party.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    value={newPartyName}
                    onChange={(e) => setNewPartyName(e.target.value)}
                    placeholder="Name (e.g., John Smith)"
                    className="h-11"
                  />
                  <Select value={newPartyRelationship} onValueChange={setNewPartyRelationship}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ex_partner">Ex-partner</SelectItem>
                      <SelectItem value="current_partner">Current partner</SelectItem>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="employer">Employer</SelectItem>
                      <SelectItem value="colleague">Colleague</SelectItem>
                      <SelectItem value="neighbor">Neighbor</SelectItem>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="witness">Witness</SelectItem>
                      <SelectItem value="lawyer">Lawyer/Legal Rep</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={addParty} disabled={!newPartyName.trim() || !newPartyRelationship} className="h-11">
                    Add Person
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">How are you feeling right now?</h3>
                <p className="text-muted-foreground">Your safety and wellbeing are my priority</p>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Do you feel safe right now?
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {[
                      { id: 'safe', label: '😌 I feel safe', color: 'bg-green-500/10 text-green-700 border-green-200' },
                      { id: 'concerned', label: '😟 Somewhat concerned', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-200' },
                      { id: 'unsafe', label: '😰 I don\'t feel safe', color: 'bg-red-500/10 text-red-700 border-red-200' }
                    ].map((option) => (
                      <Button
                        key={option.id}
                        variant={safetyInfo.safetyLevel === option.id ? "default" : "outline"}
                        className={`h-auto p-3 ${safetyInfo.safetyLevel === option.id ? '' : option.color}`}
                        onClick={() => setSafetyInfo({...safetyInfo, safetyLevel: option.id})}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Who can support you through this?
                  </label>
                  <Input
                    value={safetyInfo.supportNetwork}
                    onChange={(e) => setSafetyInfo({...safetyInfo, supportNetwork: e.target.value})}
                    placeholder="e.g., Family member, friend, counselor, support service"
                    className="h-11"
                  />
                </div>
                
                {safetyInfo.safetyLevel === 'unsafe' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-red-800 font-medium">
                      <AlertTriangle className="w-4 h-4" />
                      Immediate Help Available
                    </div>
                    <p className="text-sm text-red-700">
                      If you're in immediate danger, call 000. For support: 1800 RESPECT (1800 737 732)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">How do you like to communicate?</h3>
                <p className="text-muted-foreground">I'll adapt to work best for you</p>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium">Communication style</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {[
                      { id: 'simple', label: '📝 Simple & clear', desc: 'Plain language, short responses' },
                      { id: 'balanced', label: '💬 Balanced', desc: 'Mix of detail and simplicity' },
                      { id: 'detailed', label: '📚 Detailed', desc: 'Legal terms, comprehensive info' }
                    ].map((style) => (
                      <Button
                        key={style.id}
                        variant={communicationPrefs.style === style.id ? "default" : "outline"}
                        className="h-auto p-3 text-left justify-start"
                        onClick={() => setCommunicationPrefs({...communicationPrefs, style: style.id})}
                      >
                        <div>
                          <div className="font-medium text-sm">{style.label}</div>
                          <div className="text-xs text-muted-foreground">{style.desc}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-medium">Do you need any accessibility support?</label>
                  <Select value={communicationPrefs.accessibility} onValueChange={(value) => setCommunicationPrefs({...communicationPrefs, accessibility: value})}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select any needs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No special needs</SelectItem>
                      <SelectItem value="screen_reader">Screen reader support</SelectItem>
                      <SelectItem value="large_text">Large text preference</SelectItem>
                      <SelectItem value="audio_preferred">Audio responses preferred</SelectItem>
                      <SelectItem value="slow_pace">Slower communication pace</SelectItem>
                      <SelectItem value="other">Other (tell me in chat)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <Check className="w-8 h-8 text-primary mx-auto mb-2" />
                  <h4 className="font-semibold">Perfect! You're ready to start</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    I now have everything I need to provide you with personalized legal assistance
                  </p>
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
              {step < 8 ? (
                <Button 
                  onClick={handleNext} 
                  disabled={
                    (step === 1 && !caseType) ||
                    (step === 2 && !experience) ||
                    (step === 3 && !primaryGoal.trim())
                    // Steps 4-7 are optional for better UX
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