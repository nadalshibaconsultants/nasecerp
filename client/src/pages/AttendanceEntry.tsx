/**
 * Mobile Attendance Entry — Clock In/Out with Geofence
 * Features: One-tap clock in, GPS verification, site selection, break tracking
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  MapPin,
  Clock,
  CheckCircle2,
  LogIn,
  LogOut,
  Coffee,
  Navigation,
  Shield,
  Wifi,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";

// Geofence zones
const sites = [
  { id: "office", name: "Head Office — Business Bay", lat: 25.1857, lng: 55.2644, radius: 100 },
  { id: "alwasl", name: "Al Wasl Tower Site", lat: 25.2048, lng: 55.2708, radius: 200 },
  { id: "marina", name: "Marina Heights Site", lat: 25.0800, lng: 55.1400, radius: 200 },
  { id: "palm", name: "Palm Villas Site", lat: 25.1120, lng: 55.1380, radius: 300 },
];

// Today's attendance log
const todayLog = [
  { time: "08:52", action: "Clock In", site: "Head Office — Business Bay", method: "GPS + WiFi" },
  { time: "12:30", action: "Break Start", site: "Head Office — Business Bay", method: "Manual" },
  { time: "13:15", action: "Break End", site: "Head Office — Business Bay", method: "Manual" },
];

export default function AttendanceEntry() {
  const [, navigate] = useLocation();
  const [clockedIn, setClockedIn] = useState(true);
  const [onBreak, setOnBreak] = useState(false);
  const [selectedSite, setSelectedSite] = useState("office");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState("08:15:32");

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClockIn = () => {
    setClockedIn(true);
    toast.success("Clocked in successfully!", {
      description: `${currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })} · ${sites.find(s => s.id === selectedSite)?.name}`,
    });
  };

  const handleClockOut = () => {
    setClockedIn(false);
    toast.success("Clocked out!", {
      description: `Total today: 8h 15m · Billable: 7h 00m`,
    });
  };

  const handleBreak = () => {
    setOnBreak(!onBreak);
    toast.info(onBreak ? "Break ended" : "Break started", {
      description: onBreak ? "Timer resumed" : "Timer paused",
    });
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/attendance")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Attendance
        </Button>
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {currentTime.toLocaleDateString("en-AE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Clock display */}
      <Card className="border border-border">
        <CardContent className="p-8 text-center">
          <p className="text-5xl font-mono font-bold tracking-tight">
            {currentTime.toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
          </p>
          {clockedIn && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Time elapsed today</p>
              <p className="text-2xl font-mono font-bold text-primary mt-1">{elapsedTime}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status card */}
      <Card className={`border-2 ${clockedIn ? "border-emerald-300 bg-emerald-50" : "border-border"}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${clockedIn ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
              <div>
                <p className="text-sm font-semibold">{clockedIn ? (onBreak ? "On Break" : "Clocked In") : "Not Clocked In"}</p>
                <p className="text-xs text-muted-foreground">
                  {clockedIn ? `Since 08:52 AM · ${sites.find(s => s.id === selectedSite)?.name}` : "Tap below to clock in"}
                </p>
              </div>
            </div>
            <Badge className={clockedIn ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}>
              {clockedIn ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Site selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Work Location
        </label>
        <Select value={selectedSite} onValueChange={setSelectedSite}>
          <SelectTrigger className="h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sites.map(site => (
              <SelectItem key={site.id} value={site.id}>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  {site.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Verification indicators */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border">
          <Navigation className="w-5 h-5 text-emerald-600" />
          <span className="text-[10px] text-muted-foreground">GPS</span>
          <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">Verified</Badge>
        </div>
        <div className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border">
          <Wifi className="w-5 h-5 text-emerald-600" />
          <span className="text-[10px] text-muted-foreground">WiFi</span>
          <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">Connected</Badge>
        </div>
        <div className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border">
          <Shield className="w-5 h-5 text-blue-600" />
          <span className="text-[10px] text-muted-foreground">Geofence</span>
          <Badge className="bg-blue-100 text-blue-700 text-[9px]">In Zone</Badge>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        {!clockedIn ? (
          <Button onClick={handleClockIn} className="w-full h-14 text-lg gap-3 bg-emerald-600 hover:bg-emerald-700">
            <LogIn className="w-6 h-6" />
            Clock In
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleBreak}
              variant="outline"
              className={`h-14 gap-2 ${onBreak ? "border-amber-400 bg-amber-50" : ""}`}
            >
              <Coffee className="w-5 h-5" />
              {onBreak ? "End Break" : "Start Break"}
            </Button>
            <Button onClick={handleClockOut} className="h-14 gap-2 bg-red-600 hover:bg-red-700">
              <LogOut className="w-5 h-5" />
              Clock Out
            </Button>
          </div>
        )}
      </div>

      {/* Today's log */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Today's Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {todayLog.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <span className="text-sm font-mono w-14">{entry.time}</span>
                <Badge variant="secondary" className="text-[10px]">{entry.action}</Badge>
                <span className="text-xs text-muted-foreground flex-1 truncate">{entry.site}</span>
                <span className="text-[10px] text-muted-foreground">{entry.method}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Approval status */}
      <Card className="border border-border bg-secondary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Mobile-First Design</p>
              <p className="text-xs text-muted-foreground">
                This screen is optimized for mobile use. GPS + WiFi dual verification ensures accurate attendance without buddy-punching.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
