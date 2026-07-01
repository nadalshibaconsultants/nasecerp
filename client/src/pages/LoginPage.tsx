/**
 * LoginPage - Entry point for the NASEC ERP
 * Design: Split layout with hero image (Dubai skyline) and login form
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, EyeOff, Building2 } from "lucide-react";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Hero */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663500474980/UvozU7YR7zEmbP9AzK9Gt6/hero-dubai-skyline-TFyde3RXRS22jshNb7cAuX.webp"
          alt="Dubai Skyline"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#000000]/90 to-[#000000]/40" />
        <div className="relative z-10 flex flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#D4A853] flex items-center justify-center">
              <Building2 className="w-6 h-6 text-[#000000]" />
            </div>
            <div>
              <h1 className="text-white text-xl font-bold tracking-tight">NASEC ERP</h1>
              <p className="text-white/60 text-xs uppercase tracking-widest">Architecture · Engineering · Construction</p>
            </div>
          </div>
          <div className="max-w-md">
            <h2 className="text-white text-3xl font-bold leading-tight mb-4">
              Precision-Built for Dubai's AEC Industry
            </h2>
            <p className="text-white/70 text-base leading-relaxed">
              A unified enterprise platform managing HR, Finance, Projects, and Compliance — fully aligned with UAE regulations including MOHRE, WPS, FTA VAT, and Dubai Municipality requirements.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                <p className="text-[#D4A853] font-mono text-2xl font-bold">8</p>
                <p className="text-white/70 text-sm">Integrated Modules</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                <p className="text-[#D4A853] font-mono text-2xl font-bold">100%</p>
                <p className="text-white/70 text-sm">UAE Compliant</p>
              </div>
            </div>
          </div>
          <p className="text-white/40 text-xs">© 2026 NASEC ERP. Dubai, UAE.</p>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded bg-primary flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold">NASEC ERP</h1>
              <p className="text-muted-foreground text-xs uppercase tracking-widest">Dubai, UAE</p>
            </div>
          </div>

          <Card className="border-0 shadow-none lg:border lg:shadow-sm">
            <CardHeader className="space-y-1 pb-4">
              <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
              <p className="text-muted-foreground text-sm">
                Sign in to your enterprise account
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.ae"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <button type="button" className="text-xs text-muted-foreground hover:text-foreground">
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 font-semibold bg-primary hover:bg-primary/90">
                  Sign In
                </Button>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or continue with</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    onClick={() => navigate("/dashboard")}
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    onClick={() => navigate("/dashboard")}
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                    UAE Pass
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Protected by AES-256 encryption · UAE PDPL Compliant
          </p>
        </div>
      </div>
    </div>
  );
}
