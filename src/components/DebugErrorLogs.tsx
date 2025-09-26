import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Trash, Bug, AlertTriangle, Info } from 'lucide-react';
import { errorHandler, ErrorLogEntry } from '@/utils/errorHandler';

export function DebugErrorLogs() {
  const [logs, setLogs] = useState<ErrorLogEntry[]>(errorHandler.getLogs());
  const [isVisible, setIsVisible] = useState(false);

  const refreshLogs = () => {
    setLogs(errorHandler.getLogs());
  };

  const clearLogs = () => {
    errorHandler.clearLogs();
    setLogs([]);
  };

  const getIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Bug className="w-4 h-4" />;
    }
  };

  const getBadgeVariant = (level: string) => {
    switch (level) {
      case 'error':
        return 'destructive';
      case 'warn':
        return 'secondary';
      case 'info':
        return 'default';
      default:
        return 'outline';
    }
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(!isVisible)}
          className="gap-2"
        >
          <Bug className="w-4 h-4" />
          Debug Logs {logs.length > 0 && `(${logs.length})`}
        </Button>
      </div>

      {isVisible && (
        <div className="fixed inset-4 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-4xl max-h-[80vh]">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Debug Error Logs</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={refreshLogs}>
                  Refresh
                </Button>
                <Button size="sm" variant="outline" onClick={clearLogs}>
                  <Trash className="w-4 h-4 mr-2" />
                  Clear
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsVisible(false)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {logs.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No logs recorded
                  </div>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 border rounded-lg bg-muted/50"
                      >
                        <div className="flex items-start gap-3">
                          {getIcon(log.level)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={getBadgeVariant(log.level) as any}>
                                {log.level.toUpperCase()}
                              </Badge>
                              <Badge variant="outline">
                                {log.source}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {log.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm font-medium mb-1">
                              {log.message}
                            </p>
                            {log.metadata && (
                              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                                <strong>Metadata:</strong>{' '}
                                {JSON.stringify(log.metadata, null, 2)}
                              </div>
                            )}
                            {log.stack && (
                              <details className="mt-2">
                                <summary className="text-xs cursor-pointer text-muted-foreground">
                                  Stack trace
                                </summary>
                                <pre className="text-xs text-muted-foreground bg-muted p-2 rounded mt-1 overflow-x-auto">
                                  {log.stack}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}