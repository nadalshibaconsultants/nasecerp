import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-lg mx-4 border border-border">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>

          <h1 className="text-4xl font-bold font-data text-foreground mb-2">404</h1>

          <h2 className="text-xl font-semibold text-foreground mb-4">
            Page Not Found
          </h2>

          <p className="text-muted-foreground mb-8 leading-relaxed">
            Sorry, the page you are looking for doesn't exist.
            <br />
            It may have been moved or deleted.
          </p>

          <Button onClick={() => setLocation("/dashboard")} className="gap-2">
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
