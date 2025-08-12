import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, Phone, Globe } from "lucide-react";
import type { Resource } from "@/hooks/useFindHelp";

interface ResourceCardProps {
  resource: Resource;
}

export function ResourceCard({ resource }: ResourceCardProps) {
  const handleGoogleMapsClick = () => {
    if (resource.lat && resource.lng) {
      window.open(`https://www.google.com/maps?q=${resource.lat},${resource.lng}`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(resource.address)}`, '_blank');
    }
  };

  const handleWebsiteClick = () => {
    if (resource.website) {
      window.open(resource.website, '_blank');
    }
  };

  const handlePhoneClick = () => {
    if (resource.phone) {
      window.location.href = `tel:${resource.phone}`;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight">{resource.name}</CardTitle>
          <Badge 
            variant={resource.source === 'Google' ? 'default' : 'secondary'}
            className="shrink-0"
          >
            {resource.source}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="leading-relaxed">{resource.address}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleGoogleMapsClick}
            className="text-xs"
          >
            <MapPin className="h-3 w-3 mr-1" />
            View on Maps
          </Button>

          {resource.website && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleWebsiteClick}
              className="text-xs"
            >
              <Globe className="h-3 w-3 mr-1" />
              Website
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          )}

          {resource.phone && (
            <Button
              size="sm"
              variant="outline"
              onClick={handlePhoneClick}
              className="text-xs"
            >
              <Phone className="h-3 w-3 mr-1" />
              Call
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}