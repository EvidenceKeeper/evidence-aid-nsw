import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CaseStrengthMeter } from "@/components/case/CaseStrengthMeter";
import { useCaseIntelligence } from "@/components/realtime/CaseIntelligenceProvider";
import { Link } from "react-router-dom";
import { 
  Upload, 
  Calendar, 
  MessageSquare, 
  ArrowRight,
  Shield,
  FileText,
  Heart,
  Star,
  CheckCircle
} from "lucide-react";

export default function Dashboard() {
  const { intelligence } = useCaseIntelligence();
  
  // Dynamic welcome messages based on case progress
  const getWelcomeMessage = () => {
    if (intelligence.isAnalyzing) {
      return {
        title: "We're working on your case right now",
        subtitle: "Take a breath. Our AI is carefully analyzing your evidence to help build the strongest case possible."
      };
    }
    
    if (intelligence.caseStrength === 0) {
      return {
        title: "Welcome, brave soul",
        subtitle: "You've taken the hardest step by being here. We're going to support you through this journey, one small step at a time."
      };
    }
    
    if (intelligence.caseStrength < 30) {
      return {
        title: "You're building something powerful",
        subtitle: "Every piece of evidence you add makes your case stronger. You're doing amazing work."
      };
    }
    
    if (intelligence.caseStrength < 70) {
      return {
        title: "Your case is getting stronger every day",
        subtitle: "Look how far you've come! Your evidence is painting a clear picture that will help you."
      };
    }
    
    return {
      title: "Your case is looking really strong",
      subtitle: "You should feel proud of the work you've done. Your evidence tells a powerful story."
    };
  };

  const welcomeMsg = getWelcomeMessage();

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      <SEO
        title="Your Safe Space | NSW Legal Evidence Manager"
        description="A trauma-informed approach to organizing your legal evidence. You're not alone in this journey."
      />
      
      {/* Trauma-Informed Welcome Header */}
      <header className="mb-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-primary/10 rounded-full shrink-0">
            <Heart className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight mb-2">
              {welcomeMsg.title}
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {welcomeMsg.subtitle}
            </p>
          </div>
        </div>
        
        {/* Safe Space Reminder */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <div className="text-sm">
              <span className="font-medium">This is your safe space.</span>
              <span className="text-muted-foreground ml-1">
                Everything here is private, encrypted, and secure. Take your time.
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Where You Are Today */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dynamic Progress Card */}
          <Card className="bg-gradient-to-br from-background to-muted/30">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                Where You Are Today
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {intelligence.caseStrength > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Your Case Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {intelligence.caseStrength}% complete
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-primary to-primary/80 h-3 rounded-full transition-all duration-700"
                      style={{ width: `${intelligence.caseStrength}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Every document you add helps build a stronger foundation for your case.
                  </p>
                </div>
              )}
              
              {intelligence.insights.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    What We've Discovered
                  </h4>
                  <div className="space-y-2">
                    {intelligence.insights.slice(0, 2).map((insight, index) => (
                      <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Case Strength Meter */}
          <CaseStrengthMeter />
        </div>

        {/* Your Next Small Steps */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Your Next Small Step
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/evidence">
                <Button className="w-full justify-start" variant="outline" size="lg">
                  <Upload className="w-4 h-4 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Share Your Story</div>
                    <div className="text-xs text-muted-foreground">Add documents, photos, or messages</div>
                  </div>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
              </Link>
              
              <Link to="/timeline">
                <Button className="w-full justify-start" variant="outline" size="lg">
                  <Calendar className="w-4 h-4 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">See Your Journey</div>
                    <div className="text-xs text-muted-foreground">View your timeline of events</div>
                  </div>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
              </Link>
              
              <Link to="/assistant">
                <Button className="w-full justify-start" variant="outline" size="lg">
                  <MessageSquare className="w-4 h-4 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Get Support</div>
                    <div className="text-xs text-muted-foreground">Ask questions anytime</div>
                  </div>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Encouragement Card */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                <Star className="w-5 h-5" />
                You're incredibly brave
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-green-700 mb-4">
                Taking control of your situation takes real courage. You're not just surviving - you're fighting back.
              </p>
              <div className="space-y-3 text-xs text-green-600">
                <div className="flex items-center gap-2">
                  <Shield className="w-3 h-3" />
                  <span>Your information is completely secure and private</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-3 h-3" />
                  <span>We organize everything so you don't have to worry</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-3 h-3" />
                  <span>You're not alone - support is always here</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps Based on Case Data */}
          {intelligence.nextSteps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  Gentle Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {intelligence.nextSteps.slice(0, 3).map((step, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-primary">{index + 1}</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
