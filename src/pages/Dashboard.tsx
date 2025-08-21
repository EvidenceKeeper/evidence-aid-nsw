import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CaseStrengthMeter } from "@/components/case/CaseStrengthMeter";
import { Link } from "react-router-dom";
import { 
  Upload, 
  Calendar, 
  MessageSquare, 
  ArrowRight,
  Shield,
  FileText,
  TrendingUp
} from "lucide-react";

export default function Dashboard() {
  return (
    <div className="container mx-auto px-6 py-8">
      <SEO
        title="Case Dashboard | NSW Legal Evidence Manager"
        description="Organize your legal evidence with a trauma-informed approach. Built for AVO and Family Court matters in NSW."
      />
      
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Your Case Dashboard</h1>
            <p className="text-muted-foreground">You're taking important steps. Your information is secure.</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Case Strength Overview */}
        <div className="lg:col-span-2">
          <CaseStrengthMeter />
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/evidence">
                <Button className="w-full justify-start" variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Add Evidence
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
              </Link>
              
              <Link to="/timeline">
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  View Timeline
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
              </Link>
              
              <Link to="/assistant">
                <Button className="w-full justify-start" variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Ask Assistant
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-lg text-green-800">You're doing great</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-green-700 mb-4">
                Organizing your evidence is an important step in building your case. Take it one step at a time.
              </p>
              <div className="space-y-2 text-xs text-green-600">
                <div className="flex items-center gap-2">
                  <Shield className="w-3 h-3" />
                  <span>Your data is encrypted and secure</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-3 h-3" />
                  <span>Everything is organized automatically</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" />
                  <span>Get help anytime with the assistant</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Case Building Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>• Upload evidence as you find it - we'll organize everything</p>
                <p>• Include dates when possible - helps build your timeline</p>
                <p>• Medical records and messages are often very important</p>
                <p>• Screenshots and photos count as evidence too</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
