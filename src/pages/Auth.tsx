import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWellnessSettings } from "@/hooks/useWellnessSettings";
import { Heart, Shield } from "lucide-react";
import { GoalOnboarding } from "@/components/onboarding/GoalOnboarding";

export default function AuthPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGoalOnboarding, setShowGoalOnboarding] = useState(false);
  
  const { settings, isLoading: settingsLoading } = useWellnessSettings();

  // Determine if we should show MindSpace camouflage
  const isCamouflaged = settings.enableWellnessFront;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // For new signups, show goal onboarding first
        if (event === 'SIGNED_IN' && session.user.email_confirmed_at) {
          // Check if this is a new user by checking if they have case_memory
          supabase
            .from('case_memory')
            .select('id')
            .eq('user_id', session.user.id)
            .single()
            .then(({ data }) => {
              if (!data) {
                setShowGoalOnboarding(true);
              } else {
                navigate("/", { replace: true });
              }
            });
        } else if (event === 'SIGNED_IN') {
          navigate("/", { replace: true });
        }
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate("/", { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    toast({ title: "Signed in" });
  };

  const signUp = async () => {
    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    setLoading(false);
    if (error) return toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    toast({ title: "Check your email", description: "Confirm your address to complete signup." });
  };

  if (showGoalOnboarding) {
    return (
      <GoalOnboarding 
        onComplete={() => navigate("/", { replace: true })}
        onSkip={() => navigate("/", { replace: true })}
      />
    );
  }

  if (settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Define content based on camouflage settings
  const appTitle = isCamouflaged ? "MindSpace" : "NSW Legal Evidence";
  const appTagline = isCamouflaged ? "Your personal wellness companion" : "Secure evidence management for legal professionals";
  const pageTitle = isCamouflaged ? "MindSpace - Sign In" : "Sign in | NSW Legal Evidence Manager";
  const pageDescription = isCamouflaged ? "Access your personal wellness space for meditation, journaling, and mental health support" : "Access your secure NSW evidence vault with email and password.";
  const welcomeText = mode === "signin" ? (isCamouflaged ? "Welcome back to your safe space" : "Welcome back") : (isCamouflaged ? "Join your wellness community" : "Create your account");
  const signInText = isCamouflaged ? "Enter your wellness space" : "Sign in securely";
  const signUpText = isCamouflaged ? "Begin your wellness journey" : "Create secure account";
  const emailPlaceholder = isCamouflaged ? "your.email@example.com" : "legal.professional@example.com";
  const securityText = isCamouflaged ? "Your privacy is our priority" : "Bank-level encryption and security";
  const dashboardLinkText = isCamouflaged ? "← Back to wellness" : "← Back to dashboard";

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${
      isCamouflaged 
        ? "bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/20 dark:via-green-950/20 dark:to-teal-950/20" 
        : "bg-gradient-to-br from-warm-50 via-warm-100 to-warm-200"
    }`}>
      <SEO title={pageTitle} description={pageDescription} />
      
      {/* Simplified background pattern */}
      <div className={`absolute inset-0 opacity-10 ${
        isCamouflaged
          ? "bg-gradient-to-br from-emerald-100 to-teal-100"
          : "bg-gradient-to-br from-primary/10 to-accent/10"
      }`} />
      
      <main className="relative w-full max-w-md">
        <div className="text-center mb-10 fade-in">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className={`p-4 rounded-2xl shadow-soft ${
              isCamouflaged ? "bg-emerald-100 dark:bg-emerald-900/20" : "bg-gradient-to-br from-primary/15 to-primary/10"
            }`}>
              {isCamouflaged ? (
                <Heart className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Shield className="h-10 w-10 text-primary" />
              )}
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            {appTitle}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-sm mx-auto">{appTagline}</p>
        </div>

        <Card className={`${isCamouflaged ? "card-wellness" : "card-premium"} overflow-hidden`}>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-semibold">
              {welcomeText}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 px-8 pb-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-semibold text-foreground/90">Email address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder={emailPlaceholder}
                  className="input-elegant focus-elegant"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground/90">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••••••"
                  className="input-elegant focus-elegant"
                />
              </div>
            </div>

            {mode === "signin" ? (
              <Button 
                onClick={signIn} 
                disabled={loading} 
                className={`w-full h-14 text-lg ${isCamouflaged ? "btn-wellness" : "btn-premium"}`}
              >
                {loading ? "Signing in..." : signInText}
              </Button>
            ) : (
              <Button 
                onClick={signUp} 
                disabled={loading}
                className={`w-full h-14 text-lg ${isCamouflaged ? "btn-wellness" : "btn-premium"}`}
              >
                {loading ? "Creating account..." : signUpText}
              </Button>
            )}

            <div className="text-center text-base text-muted-foreground">
              {mode === "signin" ? (
                <span>
                  Need an account?{" "}
                  <button 
                    className="text-primary hover:text-primary/80 font-semibold transition-colors hover:underline"
                    onClick={() => setMode("signup")}
                  >
                    Sign up here
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{" "}
                  <button 
                    className="text-primary hover:text-primary/80 font-semibold transition-colors hover:underline" 
                    onClick={() => setMode("signin")}
                  >
                    Sign in instead
                  </button>
                </span>
              )}
            </div>

            <div className="pt-6 border-t border-border/40">
              <div className="text-sm text-muted-foreground text-center space-y-3">
                <p className="flex items-center justify-center gap-2">
                  {isCamouflaged ? (
                    <Heart className="h-4 w-4" />
                  ) : (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {securityText}
                </p>
                <Link 
                  to="/" 
                  className="text-primary hover:text-primary/80 font-medium transition-colors hover:underline inline-block"
                >
                  {dashboardLinkText}
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}