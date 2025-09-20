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

export default function AuthPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { settings, isLoading: settingsLoading } = useWellnessSettings();

  // Determine if we should show MindSpace camouflage
  const isCamouflaged = settings.enableWellnessFront;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) navigate("/", { replace: true });
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
      
      {/* Enhanced background pattern */}
      <div className={`absolute inset-0 opacity-[0.15] ${
        isCamouflaged
          ? "bg-[radial-gradient(circle_at_30%_20%,hsl(142_70%_45%)_0%,transparent_50%),radial-gradient(circle_at_80%_80%,hsl(158_60%_50%)_0%,transparent_50%)]"
          : "bg-[radial-gradient(circle_at_25%_25%,hsl(var(--primary))_0%,transparent_40%),radial-gradient(circle_at_75%_75%,hsl(var(--accent))_0%,transparent_40%)]"
      }`} />
      
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />
      
      <main className="relative w-full max-w-md">
        <div className="text-center mb-10 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className={`p-4 rounded-2xl shadow-soft ${
              isCamouflaged ? "bg-emerald-100 dark:bg-emerald-900/20" : "bg-gradient-to-br from-primary/15 to-primary/10"
            }`}>
              {isCamouflaged ? (
                <Heart className="h-10 w-10 text-emerald-600 dark:text-emerald-400 animate-gentle-bounce" />
              ) : (
                <Shield className="h-10 w-10 text-primary animate-gentle-bounce" />
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
                    className="text-primary hover:text-primary-soft font-semibold transition-colors hover:underline" 
                    onClick={() => setMode("signup")}
                  >
                    Sign up here
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{" "}
                  <button 
                    className="text-primary hover:text-primary-soft font-semibold transition-colors hover:underline" 
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
                  className="text-primary hover:text-primary-soft font-medium transition-colors hover:underline inline-block"
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