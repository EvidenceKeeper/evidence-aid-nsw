import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useCaseIntelligence } from "@/components/realtime/CaseIntelligenceProvider";
import HealthStatus from "@/components/HealthStatus";
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
  CheckCircle,
  Files,
  Scale,
  Search,
  BarChart3
} from "lucide-react";

export default function MyCase() {
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
        title: "Welcome to your case workspace",
        subtitle: "This is your secure space to organize evidence and build your case. Take it one step at a time."
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
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      <SEO
        title="My Case | NSW Legal Evidence Manager"
        description="Your secure workspace to organize evidence, track progress, and build a strong case."
      />
      
      {/* Header */}
      <header className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-full shrink-0">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-semibold tracking-tight mb-2">
              {welcomeMsg.title}
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {welcomeMsg.subtitle}
            </p>
          </div>
        </div>
        <HealthStatus />
      </header>

      {/* Safe Space Reminder */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4 mb-8">
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

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Main Content - Case Progress & Insights */}
        <div className="xl:col-span-3 space-y-8">
          {/* Case Strength Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Progress Card */}
            <Card className="bg-gradient-to-br from-background to-muted/30">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  Case Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {intelligence.caseStrength > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Completion</span>
                      <span className="text-sm text-muted-foreground">
                        {intelligence.caseStrength}%
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-primary to-primary/80 h-3 rounded-full transition-all duration-700"
                        style={{ width: `${intelligence.caseStrength}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Every document you add helps build a stronger foundation.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Files className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Upload your first document to get started
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/evidence" className="block">
                  <Button className="w-full justify-start" variant="outline" size="lg">
                    <Upload className="w-4 h-4 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Upload Evidence</div>
                      <div className="text-xs text-muted-foreground">Add documents, photos, or messages</div>
                    </div>
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </Button>
                </Link>
                
                <Link to="/timeline" className="block">
                  <Button className="w-full justify-start" variant="outline" size="lg">
                    <Calendar className="w-4 h-4 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">View Timeline</div>
                      <div className="text-xs text-muted-foreground">See your events chronologically</div>
                    </div>
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </Button>
                </Link>
                
                <Link to="/assistant" className="block">
                  <Button className="w-full justify-start" variant="outline" size="lg">
                    <MessageSquare className="w-4 h-4 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Ask Assistant</div>
                      <div className="text-xs text-muted-foreground">Get help anytime</div>
                    </div>
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>


          {/* Key Insights */}
          {intelligence.insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {intelligence.insights.slice(0, 3).map((insight, index) => (
                    <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-800">{insight}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Support & Tools */}
        <div className="space-y-6">
          {/* Tool Access */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Legal Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/legal" className="block">
                <Button className="w-full justify-start" variant="ghost">
                  <Scale className="w-4 h-4 mr-3" />
                  NSW Legal Assistant
                </Button>
              </Link>
              
              <Link to="/search" className="block">
                <Button className="w-full justify-start" variant="ghost">
                  <Search className="w-4 h-4 mr-3" />
                  Legal Search
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

          {/* Next Steps */}
          {intelligence.nextSteps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  Recommended Steps
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