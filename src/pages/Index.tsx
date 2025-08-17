import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Files, MessageCircleQuestion, CalendarClock, FileText, TrendingUp, Clock, Users, Shield } from "lucide-react";

const Index = () => {
  return (
    <div className="relative">
      <SEO 
        title="Legal Evidence Dashboard | NSW Legal Evidence Manager" 
        description="Professional case management dashboard for NSW legal matters. Track evidence, manage timelines, and organize your legal documentation."
      />
      
      {/* Hero section with gradient */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-lighter via-background to-accent-soft/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary))_0%,transparent_50%),radial-gradient(circle_at_80%_80%,hsl(var(--accent))_0%,transparent_50%)] opacity-[0.03]" />
        
        <div className="relative container mx-auto px-6 py-16">
          <div className="max-w-4xl">
            <div className="slide-up">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-foreground">
                Organize your legal evidence with 
                <span className="text-primary"> confidence</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
                Built specifically for NSW AVO and Family Court matters. Upload documents, extract insights, build timelines, and get AI assistance grounded in your case files.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/evidence">
                  <Button size="lg" className="btn-premium gap-2 h-12 px-8">
                    <Files className="h-5 w-5" />
                    Start with Evidence
                  </Button>
                </Link>
                <Link to="/assistant">
                  <Button size="lg" variant="outline" className="btn-premium gap-2 h-12 px-8">
                    <MessageCircleQuestion className="h-5 w-5" />
                    Chat with Assistant
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Case overview cards */}
      <section className="container mx-auto px-6 py-16">
        <div className="slide-up">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-8">Your Case at a Glance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="card-premium">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Documents</CardTitle>
                <Files className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
                <p className="text-xs text-muted-foreground">+3 this week</p>
              </CardContent>
            </Card>
            
            <Card className="card-premium">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Timeline Events</CardTitle>
                <CalendarClock className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">Last updated today</p>
              </CardContent>
            </Card>
            
            <Card className="card-premium">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Tasks</CardTitle>
                <Clock className="h-4 w-4 text-warm" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">7</div>
                <p className="text-xs text-muted-foreground">2 due this week</p>
              </CardContent>
            </Card>
            
            <Card className="card-premium">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Case Strength</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Strong</div>
                <p className="text-xs text-muted-foreground">Based on evidence</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick actions */}
        <div className="slide-up">
          <h3 className="text-xl font-semibold tracking-tight mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="card-premium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Files className="h-5 w-5 text-primary" />
                  Upload Evidence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Add new documents, photos, or recordings to your case file.
                </p>
                <Link to="/evidence">
                  <Button className="w-full">Go to Evidence</Button>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="card-premium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-accent" />
                  Build Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a chronological timeline of events from your evidence.
                </p>
                <Link to="/timeline">
                  <Button variant="outline" className="w-full">View Timeline</Button>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="card-premium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircleQuestion className="h-5 w-5 text-warm" />
                  Ask Assistant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Get AI assistance based on your uploaded evidence and case details.
                </p>
                <Link to="/assistant">
                  <Button variant="outline" className="w-full">Start Chat</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust indicators */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-6">
          <div className="slide-up text-center">
            <h3 className="text-2xl font-semibold tracking-tight mb-6">Secure & Professional</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="flex flex-col items-center gap-3">
                <Shield className="h-10 w-10 text-primary" />
                <h4 className="font-medium">Bank-level Security</h4>
                <p className="text-sm text-muted-foreground text-center">
                  Your evidence is encrypted and stored securely with enterprise-grade protection.
                </p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <Users className="h-10 w-10 text-accent" />
                <h4 className="font-medium">Legal Professional Approved</h4>
                <p className="text-sm text-muted-foreground text-center">
                  Designed with input from NSW legal professionals for real-world use.
                </p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <FileText className="h-10 w-10 text-warm" />
                <h4 className="font-medium">Court-ready Outputs</h4>
                <p className="text-sm text-muted-foreground text-center">
                  Generate professional reports and timelines suitable for court submission.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
