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
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isCamouflaged 
        ? "bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/20 dark:via-green-950/20 dark:to-teal-950/20" 
        : "bg-gradient-to-br from-primary-lighter via-background to-accent-soft/20"
    }`}>
      <SEO title={pageTitle} description={pageDescription} />
      
      {/* Background pattern */}
      <div className={`absolute inset-0 opacity-[0.03] ${
        isCamouflaged
          ? "bg-[radial-gradient(circle_at_30%_20%,hsl(142_70%_45%)_0%,transparent_50%),radial-gradient(circle_at_80%_80%,hsl(158_60%_50%)_0%,transparent_50%)]"
          : "bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary))_0%,transparent_50%),radial-gradient(circle_at_80%_80%,hsl(var(--accent))_0%,transparent_50%)]"
      }`} />
      
      <main className="relative w-full max-w-md">
        <div className="text-center mb-8 fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className={`p-3 rounded-xl ${
              isCamouflaged ? "bg-emerald-100 dark:bg-emerald-900/20" : "bg-primary/10"
            }`}>
              {isCamouflaged ? (
                <Heart className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Shield className="h-8 w-8 text-primary" />
              )}
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{appTitle}</h1>
          <p className="text-muted-foreground">{appTagline}</p>
        </div>

        <Card className={`${isCamouflaged ? "card-wellness" : "card-premium"}`}>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {welcomeText}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder={emailPlaceholder}
                  className="focus-elegant"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••••••"
                  className="focus-elegant"
                />
              </div>
            </div>

            {mode === "signin" ? (
              <Button 
                onClick={signIn} 
                disabled={loading} 
                className={`w-full h-11 ${isCamouflaged ? "btn-wellness" : "btn-premium"}`}
              >
                {loading ? "Signing in..." : signInText}
              </Button>
            ) : (
              <Button 
                onClick={signUp} 
                disabled={loading}
                className={`w-full h-11 ${isCamouflaged ? "btn-wellness" : "btn-premium"}`}
              >
                {loading ? "Creating account..." : signUpText}
              </Button>
            )}

            <div className="text-center text-sm text-muted-foreground">
              {mode === "signin" ? (
                <span>
                  Need an account?{" "}
                  <button 
                    className="text-primary hover:underline font-medium transition-colors" 
                    onClick={() => setMode("signup")}
                  >
                    Sign up here
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{" "}
                  <button 
                    className="text-primary hover:underline font-medium transition-colors" 
                    onClick={() => setMode("signin")}
                  >
                    Sign in instead
                  </button>
                </span>
              )}
            </div>

            <div className="pt-4 border-t">
              <div className="text-xs text-muted-foreground text-center space-y-2">
                <p className="flex items-center justify-center gap-1">
                  {isCamouflaged ? (
                    <Heart className="h-3 w-3" />
                  ) : (
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {securityText}
                </p>
                <Link to="/" className="text-primary hover:underline">{dashboardLinkText}</Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}