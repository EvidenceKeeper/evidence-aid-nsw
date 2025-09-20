import React, { useState } from 'react';
import { Target, Lock, Edit3, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTelepathicContext } from './TelepathicContextProvider';

export function GoalLockDisplay() {
  const { currentGoal, isGoalLocked, setGoal } = useTelepathicContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editGoal, setEditGoal] = useState(currentGoal || '');

  const handleSave = async () => {
    if (editGoal.trim()) {
      await setGoal(editGoal.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditGoal(currentGoal || '');
    setIsEditing(false);
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4" />
          Case Goal
          {isGoalLocked && (
            <Badge variant="secondary" className="text-xs">
              <Lock className="h-3 w-3 mr-1" />
              Locked
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {!currentGoal && !isEditing ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              No goal set yet. I'll help you define your main legal objective.
            </p>
            <Button 
              size="sm" 
              onClick={() => setIsEditing(true)}
              className="w-full"
            >
              Set Your Goal
            </Button>
          </div>
        ) : isEditing ? (
          <div className="space-y-3">
            <Input
              value={editGoal}
              onChange={(e) => setEditGoal(e.target.value)}
              placeholder="e.g., prepare for full custody hearing"
              className="text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} className="flex-1">
                <Check className="h-3 w-3 mr-1" />
                Lock Goal
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-muted/50 rounded-md">
              <p className="text-sm font-medium">
                "{currentGoal}"
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              🧠 Telepathic Mode: Every response will build on this goal
            </div>
            {!isGoalLocked && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setIsEditing(true)}
                className="w-full"
              >
                <Edit3 className="h-3 w-3 mr-1" />
                Edit Goal
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}