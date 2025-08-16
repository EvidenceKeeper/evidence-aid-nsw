import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChatInterface } from "./ChatInterface";
import { cn } from "@/lib/utils";

export function ChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className={cn(
            "h-14 w-14 rounded-full shadow-lg transition-all duration-200",
            "bg-primary hover:bg-primary/90",
            "border-2 border-primary-foreground/20",
            isOpen && "hidden"
          )}
        >
          <MessageCircle className="h-6 w-6" />
          <span className="sr-only">Chat with Veronica</span>
        </Button>
      </div>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-4xl h-[80vh] shadow-2xl border-0 overflow-hidden">
            <ChatInterface isModal onClose={() => setIsOpen(false)} />
          </Card>
        </div>
      )}
    </>
  );
}