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
    <div className="container mx-auto px-6 py-8">
      <SEO title="Sign in | NSW Legal Evidence Manager" description="Access your secure NSW evidence vault with email and password." />
      <main className="max-w-md mx-auto">
        <h1 className="text-2xl font-semibold tracking-tight mb-4">Account</h1>
        <Card>
          <CardHeader>
            <CardTitle>{mode === "signin" ? "Sign in" : "Create an account"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {mode === "signin" ? (
              <Button onClick={signIn} disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
            ) : (
              <Button onClick={signUp} disabled={loading}>{loading ? "Creating account..." : "Sign up"}</Button>
            )}

            <div className="text-sm text-muted-foreground">
              {mode === "signin" ? (
                <span>
                  New here?{" "}
                  <button className="underline" onClick={() => setMode("signup")}>Create an account</button>
                </span>
              ) : (
                <span>
                  Already have an account?{" "}
                  <button className="underline" onClick={() => setMode("signin")}>Sign in</button>
                </span>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              Tip: If email links don’t open correctly, set Site URL and Redirect URLs in Supabase Auth settings.
            </div>
            <Link to="/" className="text-sm underline">Back to app</Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
