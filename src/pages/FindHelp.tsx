import { useState } from "react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ResourceCard } from "@/components/ResourceCard";
import { useFindHelp, useHealthCheck } from "@/hooks/useFindHelp";
import { Search, AlertCircle, MapPin, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function FindHelp() {
  const [postcode, setPostcode] = useState("");
  const [searchPostcode, setSearchPostcode] = useState("");

  const { data: healthData } = useHealthCheck();
  const { 
    data: searchResults, 
    isLoading, 
    error, 
    refetch 
  } = useFindHelp(searchPostcode);

  const handleSearch = () => {
    const trimmedPostcode = postcode.trim();
    
    if (!trimmedPostcode) {
      toast.error("Please enter a postcode");
      return;
    }
    
    if (!/^\d{4}$/.test(trimmedPostcode)) {
      toast.error("Please enter a valid 4-digit Australian postcode");
      return;
    }

    if (!healthData?.configured.googlePlaces) {
      toast.error("Google Places API is not configured. Please check server setup.");
      return;
    }

    setSearchPostcode(trimmedPostcode);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      <SEO 
        title="Find Help (NSW) | NSW Legal Evidence Manager" 
        description="Find NSW resources: legal aid, community legal centres, domestic violence support, courts, housing assistance, and police stations near you." 
      />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-3">Find Help (NSW)</h1>
        <p className="text-muted-foreground text-lg">
          Search for legal aid, community legal centres, domestic violence support, courts, and police stations near your postcode.
        </p>
      </div>

      {/* Service Status */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Service Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant={healthData?.configured.googlePlaces ? "default" : "destructive"}>
              Google Places: {healthData?.configured.googlePlaces ? "Connected" : "Not Configured"}
            </Badge>
            <Badge variant={healthData?.configured.supabase ? "default" : "secondary"}>
              Local Database: {healthData?.configured.supabase ? "Connected" : "Not Available"}
            </Badge>
          </div>
          {!healthData?.configured.googlePlaces && (
            <Alert className="mt-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Google Places API is required for resource search. Please configure the API key in your .env file.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Search Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Resources by Postcode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              type="text"
              placeholder="Enter NSW postcode (e.g., 2000)"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
              maxLength={4}
            />
            <Button 
              onClick={handleSearch}
              disabled={isLoading || !healthData?.configured.googlePlaces}
              className="shrink-0"
            >
              {isLoading ? "Searching..." : "Search"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {error && (
        <Alert className="mb-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.message || "An error occurred while searching for resources"}
          </AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold">Searching for resources...</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {searchResults && !isLoading && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Results for postcode {searchResults.postcode}
            </h2>
            <div className="flex gap-2 text-sm text-muted-foreground">
              <span>{searchResults.total} total results</span>
              {searchResults.sources.google > 0 && (
                <span>• {searchResults.sources.google} from Google</span>
              )}
              {searchResults.sources.local > 0 && (
                <span>• {searchResults.sources.local} local</span>
              )}
            </div>
          </div>

          {searchResults.results.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No resources found</h3>
                <p className="text-muted-foreground mb-4">
                  No legal aid or support services were found near postcode {searchResults.postcode}.
                </p>
                <Button variant="outline" onClick={() => refetch()}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {searchResults.results.map((resource, index) => (
                <ResourceCard key={index} resource={resource} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Static Resources Section */}
      <div className="mt-12 pt-8 border-t">
        <h2 className="text-xl font-semibold mb-6">Always Available Resources</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">National Legal Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <a 
                href="https://www.justiceconnect.org.au/" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                Justice Connect <ExternalLink className="h-3 w-3" />
              </a>
              <a 
                href="https://www.lawaccess.nsw.gov.au/" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                LawAccess NSW <ExternalLink className="h-3 w-3" />
              </a>
              <a 
                href="https://www.legalaid.nsw.gov.au/" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                Legal Aid NSW <ExternalLink className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Emergency Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <a 
                href="tel:1800737732" 
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                1800RESPECT (1800 737 732)
              </a>
              <a 
                href="tel:131114" 
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                Lifeline (13 11 14)
              </a>
              <a 
                href="tel:000" 
                className="flex items-center gap-2 text-sm text-primary hover:underline font-semibold"
              >
                Emergency Services (000)
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Court Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <a 
                href="https://www.courts.justice.nsw.gov.au/" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                NSW Courts <ExternalLink className="h-3 w-3" />
              </a>
              <a 
                href="https://www.fedcourt.gov.au/" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                Federal Court <ExternalLink className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
