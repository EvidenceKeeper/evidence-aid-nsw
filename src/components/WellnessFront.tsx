import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Heart, Brain, Activity, BookOpen, Timer, Search } from 'lucide-react';
import { WellnessSettings } from '@/hooks/useWellnessSettings';

interface WellnessFrontProps {
  settings: WellnessSettings;
  onAccessGranted: () => void;
}

const wellnessThemes = {
  mentalhealth: {
    title: "Daily Mental Health Check-in",
    subtitle: "Building resilience through mindful practices",
    icon: Brain,
    color: "accent",
    content: [
      "5 Signs of Emotional Strength",
      "Building Daily Resilience Habits",
      "Managing Stress Naturally",
      "Creating Safe Mental Spaces"
    ]
  },
  meditation: {
    title: "Mindful Moments",
    subtitle: "Your daily meditation and mindfulness companion",
    icon: Heart,
    color: "primary",
    content: [
      "10-Minute Morning Meditation",
      "Breathing Exercises for Calm",
      "Body Scan Relaxation",
      "Evening Gratitude Practice"
    ]
  },
  fitness: {
    title: "Wellness Tracker", 
    subtitle: "Holistic health and fitness guidance",
    icon: Activity,
    color: "warm",
    content: [
      "Gentle Movement for Beginners",
      "Desk Stretches for Better Posture",
      "Walking Meditation Benefits",
      "Nutrition for Mental Clarity"
    ]
  },
  journaling: {
    title: "Daily Reflection",
    subtitle: "Express, process, and grow through writing",
    icon: BookOpen,
    color: "accent",
    content: [
      "Morning Pages Practice",
      "Gratitude Journaling Prompts",
      "Processing Difficult Emotions",
      "Self-Compassion Exercises"
    ]
  }
};

export function WellnessFront({ settings, onAccessGranted }: WellnessFrontProps) {
  const [clickCount, setClickCount] = useState(0);
  const [keywordInput, setKeywordInput] = useState('');
  const [sequenceClicks, setSequenceClicks] = useState<number[]>([]);
  const [timerHolding, setTimerHolding] = useState(false);
  const [timerCount, setTimerCount] = useState(0);

  const theme = wellnessThemes[settings.wellnessTheme];
  const IconComponent = theme.icon;

  // Reset access attempts periodically
  useEffect(() => {
    const timer = setTimeout(() => {
      setClickCount(0);
      setSequenceClicks([]);
      setTimerCount(0);
    }, 10000);
    return () => clearTimeout(timer);
  }, [clickCount, sequenceClicks, timerCount]);

  // Timer access method
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerHolding) {
      interval = setInterval(() => {
        setTimerCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 30) { // 3 seconds
            onAccessGranted();
          }
          return newCount;
        });
      }, 100);
    } else {
      setTimerCount(0);
    }
    return () => clearInterval(interval);
  }, [timerHolding, onAccessGranted]);

  const handleLogoClick = () => {
    if (settings.accessMethod === 'triple-click') {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      if (newCount >= 3) {
        onAccessGranted();
      }
    }
  };

  const handleKeywordChange = (value: string) => {
    setKeywordInput(value);
    if (settings.accessMethod === 'keyword' && value.toLowerCase() === settings.customKeyword.toLowerCase()) {
      onAccessGranted();
    }
  };

  const handleTipClick = (index: number) => {
    if (settings.accessMethod === 'sequence') {
      const newSequence = [...sequenceClicks, index];
      setSequenceClicks(newSequence);
      
      // Check for sequence: 0, 2, 1, 3 (first, third, second, fourth)
      if (newSequence.length === 4) {
        const correctSequence = [0, 2, 1, 3];
        if (JSON.stringify(newSequence) === JSON.stringify(correctSequence)) {
          onAccessGranted();
        } else {
          setSequenceClicks([]);
        }
      }
    }
  };

  const handleTimerMouseDown = () => {
    if (settings.accessMethod === 'timer') {
      setTimerHolding(true);
    }
  };

  const handleTimerMouseUp = () => {
    setTimerHolding(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <header className="text-center mb-12">
          <div 
            className="flex items-center justify-center gap-3 mb-4 cursor-pointer"
            onClick={handleLogoClick}
          >
            <div className={`p-3 rounded-full bg-${theme.color}/10 border border-${theme.color}/20`}>
              <IconComponent className={`h-8 w-8 text-${theme.color}`} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{theme.title}</h1>
              <p className="text-muted-foreground">{theme.subtitle}</p>
            </div>
          </div>
          
          {settings.accessMethod === 'keyword' && (
            <div className="max-w-md mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search wellness topics..."
                  value={keywordInput}
                  onChange={(e) => handleKeywordChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}
        </header>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconComponent className={`h-5 w-5 text-${theme.color}`} />
                Today's Focus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {theme.content.map((item, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg border border-border/50 hover:border-${theme.color}/50 transition-colors cursor-pointer ${
                      sequenceClicks.includes(index) ? `bg-${theme.color}/10` : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleTipClick(index)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item}</span>
                      <Badge variant="secondary">{index + 1}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className={`h-5 w-5 text-${theme.color}`} />
                Quick Practice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Take a moment for yourself with this guided session
                </p>
                <Button
                  size="lg"
                  className={`w-full bg-${theme.color} hover:bg-${theme.color}/90 text-${theme.color}-foreground relative overflow-hidden`}
                  onMouseDown={handleTimerMouseDown}
                  onMouseUp={handleTimerMouseUp}
                  onMouseLeave={handleTimerMouseUp}
                >
                  {settings.accessMethod === 'timer' && timerHolding ? (
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin`} />
                      Hold to begin... {Math.floor(timerCount / 10)}/3s
                    </div>
                  ) : (
                    "Start 5-Minute Session"
                  )}
                  
                  {/* Progress bar for timer */}
                  {settings.accessMethod === 'timer' && timerHolding && (
                    <div className="absolute bottom-0 left-0 h-1 bg-current/30 transition-all duration-100"
                         style={{ width: `${(timerCount / 30) * 100}%` }} />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="text-center space-y-4">
          <div className="flex justify-center gap-4 flex-wrap">
            <Badge variant="outline">Daily Tips</Badge>
            <Badge variant="outline">Progress Tracking</Badge>
            <Badge variant="outline">Community Support</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Building stronger, more resilient communities through wellness
          </p>
          
          {/* Debug indicator (only shows if clicked multiple times) */}
          {clickCount > 0 && settings.accessMethod === 'triple-click' && (
            <div className="text-xs text-muted-foreground">
              {clickCount}/3 clicks
            </div>
          )}
          
          {sequenceClicks.length > 0 && settings.accessMethod === 'sequence' && (
            <div className="text-xs text-muted-foreground">
              Sequence: {sequenceClicks.map(i => i + 1).join(', ')} / 1,3,2,4
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}