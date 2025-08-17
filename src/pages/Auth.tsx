import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function AuthPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-lighter via-background to-accent-soft/20 flex items-center justify-center p-4">
      <SEO title="Sign in | NSW Legal Evidence Manager" description="Access your secure NSW evidence vault with email and password." />
      
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary))_0%,transparent_50%),radial-gradient(circle_at_80%_80%,hsl(var(--accent))_0%,transparent_50%)] opacity-[0.03]" />
      
      <main className="relative w-full max-w-md">
        <div className="text-center mb-8 fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">NSW Legal Evidence</h1>
          <p className="text-muted-foreground">Secure evidence management for legal professionals</p>
        </div>

        <Card className="card-premium">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {mode === "signin" ? "Welcome back" : "Create your account"}
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
                  placeholder="legal.professional@example.com"
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
                className="w-full btn-premium h-11"
              >
                {loading ? "Signing in..." : "Sign in securely"}
              </Button>
            ) : (
              <Button 
                onClick={signUp} 
                disabled={loading}
                className="w-full btn-premium h-11"
              >
                {loading ? "Creating account..." : "Create secure account"}
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
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Bank-level encryption and security
                </p>
                <Link to="/" className="text-primary hover:underline">← Back to dashboard</Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}