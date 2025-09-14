import { SEO } from "@/components/SEO";
import { useWellnessSettings } from "@/hooks/useWellnessSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, Eye, Download, Upload, RotateCcw, BookOpen, Share2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { LegalKnowledgeManager } from "@/components/legal/LegalKnowledgeManager";
import ConsultationRequest from "@/components/legal/ConsultationRequest";
import EnhancedLegalSearch from "@/components/legal/EnhancedLegalSearch";
import EvidenceIntegrationToggle from "@/components/evidence/EvidenceIntegrationToggle";
import EvidenceConnections from "@/components/evidence/EvidenceConnections";
import { CaseShareDialog } from "@/components/case/CaseShareDialog";
import { CollaborationActivity } from "@/components/case/CollaborationActivity";
import { useEvidenceIntegration } from "@/hooks/useEvidenceIntegration";

export default function Settings() {
  const { settings, updateSettings, resetSettings, exportSettings, importSettings, isLoading } = useWellnessSettings();
  const { settings: evidenceSettings, updateSettings: updateEvidenceSettings, refreshConnections } = useEvidenceIntegration();
  const { toast } = useToast();
  const [importText, setImportText] = useState("");

  const handleExport = () => {
    const settingsJson = exportSettings();
    navigator.clipboard.writeText(settingsJson);
    toast({
      title: "Settings exported",
      description: "Settings copied to clipboard",
    });
  };

  const handleImport = () => {
    if (importSettings(importText)) {
      toast({
        title: "Settings imported",
        description: "Settings have been successfully imported",
      });
      setImportText("");
    } else {
      toast({
        title: "Import failed",
        description: "Invalid settings format",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    resetSettings();
    toast({
      title: "Settings reset",
      description: "All settings have been reset to defaults",
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-4 bg-muted rounded w-96"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <SEO title="Settings | NSW Legal Evidence Manager" description="Manage privacy, wellness camouflage, and safety settings." />
      
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Customize your privacy and safety preferences
          </p>
        </div>

        <Tabs defaultValue="privacy" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Privacy & Safety
            </TabsTrigger>
            <TabsTrigger value="wellness" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Wellness Front
            </TabsTrigger>
            <TabsTrigger value="legal" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Legal Knowledge
            </TabsTrigger>
            <TabsTrigger value="consultation" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Consultation
            </TabsTrigger>
            <TabsTrigger value="emergency" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Emergency
            </TabsTrigger>
            <TabsTrigger value="backup" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Backup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy Protection
                </CardTitle>
                <CardDescription>
                  Control how your data and sessions are protected
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Enable Wellness Camouflage</Label>
                    <p className="text-sm text-muted-foreground">
                      Hide the login page behind a wellness website
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableWellnessFront}
                    onCheckedChange={(checked) => updateSettings({ enableWellnessFront: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Auto-logout Protection</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically log out after period of inactivity
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableAutoLogout}
                    onCheckedChange={(checked) => updateSettings({ enableAutoLogout: checked })}
                  />
                </div>

                {settings.enableAutoLogout && (
                  <div className="space-y-2">
                    <Label>Auto-logout time (minutes)</Label>
                    <Select
                      value={settings.autoLogoutMinutes.toString()}
                      onValueChange={(value) => updateSettings({ autoLogoutMinutes: parseInt(value) })}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Clear Browser History</Label>
                    <p className="text-sm text-muted-foreground">
                      Attempt to clear history when logging out
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableHistoryClearing}
                    onCheckedChange={(checked) => updateSettings({ enableHistoryClearing: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Session Warnings</Label>
                    <p className="text-sm text-muted-foreground">
                      Show warnings about secure logout
                    </p>
                  </div>
                  <Switch
                    checked={settings.sessionWarnings}
                    onCheckedChange={(checked) => updateSettings({ sessionWarnings: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wellness" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Wellness Camouflage
                </CardTitle>
                <CardDescription>
                  Customize how the wellness front appears and is accessed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Wellness Theme</Label>
                  <Select
                    value={settings.wellnessTheme}
                    onValueChange={(value: any) => updateSettings({ wellnessTheme: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mentalhealth">Mental Health & Resilience</SelectItem>
                      <SelectItem value="meditation">Meditation & Mindfulness</SelectItem>
                      <SelectItem value="fitness">Fitness & Wellness</SelectItem>
                      <SelectItem value="journaling">Journaling & Self-Care</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Access Method</Label>
                  <Select
                    value={settings.accessMethod}
                    onValueChange={(value: any) => updateSettings({ accessMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="triple-click">Triple-click logo</SelectItem>
                      <SelectItem value="keyword">Type keyword</SelectItem>
                      <SelectItem value="sequence">Click sequence</SelectItem>
                      <SelectItem value="timer">Hold timer button</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {settings.accessMethod === 'keyword' && (
                  <div className="space-y-2">
                    <Label>Custom Keyword</Label>
                    <Input
                      value={settings.customKeyword}
                      onChange={(e) => updateSettings({ customKeyword: e.target.value })}
                      placeholder="Enter access keyword"
                      className="w-64"
                    />
                    <p className="text-sm text-muted-foreground">
                      Type this word in the wellness site to reveal login
                    </p>
                  </div>
                )}

                <div className="bg-accent/20 border border-accent/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">Preview</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {settings.wellnessTheme === 'mentalhealth' && 'Site will appear as "Daily Mental Health Check-in" with resilience tips'}
                    {settings.wellnessTheme === 'meditation' && 'Site will appear as "Mindful Moments" with meditation guides'}
                    {settings.wellnessTheme === 'fitness' && 'Site will appear as "Wellness Tracker" with fitness tips'}
                    {settings.wellnessTheme === 'journaling' && 'Site will appear as "Daily Reflection" with journaling prompts'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="legal" className="space-y-6">
            <div className="space-y-6">
              <EvidenceIntegrationToggle 
                enabled={evidenceSettings.enabled} 
                onEnabledChange={(enabled) => updateEvidenceSettings({ enabled })}
                onAnalysisComplete={refreshConnections}
              />
              <EnhancedLegalSearch />
              <EvidenceConnections />
              
              {/* Case Sharing */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="h-5 w-5" />
                    Case Sharing & Collaboration
                  </CardTitle>
                  <CardDescription>
                    Share your case with colleagues and track collaboration activity
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <CaseShareDialog>
                      <Button>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share Case
                      </Button>
                    </CaseShareDialog>
                  </div>
                  
                  <CollaborationActivity />
                </CardContent>
              </Card>
              
              <LegalKnowledgeManager />
            </div>
          </TabsContent>

          <TabsContent value="consultation" className="space-y-6">
            <ConsultationRequest />
          </TabsContent>

          <TabsContent value="emergency" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Emergency Features
                </CardTitle>
                <CardDescription>
                  Configure panic button and emergency exits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Enable Panic Button</Label>
                    <p className="text-sm text-muted-foreground">
                      Show emergency exit button in navigation
                    </p>
                  </div>
                  <Switch
                    checked={settings.enablePanicButton}
                    onCheckedChange={(checked) => updateSettings({ enablePanicButton: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Quick Exit Enabled</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable keyboard shortcut for emergency exit
                    </p>
                  </div>
                  <Switch
                    checked={settings.quickExitEnabled}
                    onCheckedChange={(checked) => updateSettings({ quickExitEnabled: checked })}
                  />
                </div>

                {settings.quickExitEnabled && (
                  <div className="space-y-2">
                    <Label>Panic Key Combination</Label>
                    <Select
                      value={settings.panicKeyCombo}
                      onValueChange={(value) => updateSettings({ panicKeyCombo: value })}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Escape">Escape key</SelectItem>
                        <SelectItem value="Ctrl+Shift+X">Ctrl+Shift+X</SelectItem>
                        <SelectItem value="Alt+Shift+E">Alt+Shift+E</SelectItem>
                        <SelectItem value="F12">F12 key</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <Label>Emergency Redirect URL</Label>
                  <Input
                    value={settings.emergencyRedirectUrl}
                    onChange={(e) => updateSettings({ emergencyRedirectUrl: e.target.value })}
                    placeholder="https://www.google.com"
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Where to redirect when panic button is used
                  </p>
                </div>

                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="font-medium text-destructive">Important</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Emergency features immediately clear session data and redirect to the specified URL.
                    Test these features carefully to ensure they work as expected.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Settings Backup
                </CardTitle>
                <CardDescription>
                  Export, import, or reset your privacy settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Export Settings</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Copy your settings to transfer to another device
                    </p>
                    <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Copy Settings to Clipboard
                    </Button>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Import Settings</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Paste settings from another device
                    </p>
                    <div className="space-y-3">
                      <Input
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        placeholder="Paste settings JSON here..."
                        className="font-mono text-xs"
                      />
                      <Button 
                        onClick={handleImport} 
                        disabled={!importText.trim()}
                        variant="outline" 
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Import Settings
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Reset to Defaults</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Restore all settings to their default values
                    </p>
                    <Button 
                      onClick={handleReset} 
                      variant="destructive" 
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset All Settings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
