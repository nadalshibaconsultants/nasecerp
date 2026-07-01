/**
 * Project Chat Tab — Per-project scoped live chat
 * Auto-membership from project team, context-aware #references, @mentions
 * Positioned after "Client Portal" in project workspace side menu
 */
import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Send,
  Paperclip,
  Mic,
  Smile,
  Pin,
  Search,
  MoreVertical,
  Reply,
  Trash2,
  Edit3,
  FileText,
  Image as ImageIcon,
  Download,
  CheckCheck,
  Clock,
  Hash,
  AtSign,
  Users,
  ChevronRight,
  X,
  Volume2,
  Bell,
  BellOff,
} from "lucide-react";
import { toast } from "sonner";
import { usersStore } from "@/lib/stores";
import { useCollection } from "@/lib/store";
import { useAuth } from "@/lib/auth/AuthContext";

// ===== TYPES =====
interface ChatMessage {
  id: string;
  sender: TeamMember;
  text: string;
  timestamp: string;
  type: "text" | "file" | "voice" | "system";
  replyTo?: string;
  reactions?: { emoji: string; users: string[] }[];
  pinned?: boolean;
  edited?: boolean;
  file?: { name: string; type: string; size: string };
  voiceDuration?: string;
  read?: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  nameAr?: string;
  initials: string;
  role: string;
  roleCode: string;
  group: "A" | "B" | "C";
  online?: boolean;
  color: string;
}

interface ProjectChatTabProps {
  project: {
    id: string;
    nameEn: string;
    nameAr?: string;
    code: string;
    stage: string;
    [key: string]: any;
  };
}

// ===== TEAM MEMBERS (auto-populated from project team) =====
const projectTeams: Record<string, TeamMember[]> = {
  "marina-heights": [
    { id: "am", name: "Ahmed Al Maktoum", nameAr: "أحمد المكتوم", initials: "AM", role: "Project Manager", roleCode: "PM", group: "A", online: true, color: "bg-blue-600" },
    { id: "sj", name: "Sarah Johnson", nameAr: "سارة جونسون", initials: "SJ", role: "Lead Architect", roleCode: "LA", group: "A", online: true, color: "bg-purple-600" },
    { id: "dc", name: "David Chen", nameAr: "ديفيد تشن", initials: "DC", role: "Lead Structural", roleCode: "LS", group: "A", online: false, color: "bg-teal-600" },
    { id: "mh", name: "Mohammed Hassan", nameAr: "محمد حسن", initials: "MH", role: "Lead MEP", roleCode: "LM", group: "A", online: true, color: "bg-orange-600" },
    { id: "jw", name: "James Wilson", nameAr: "جيمس ويلسون", initials: "JW", role: "Construction Manager", roleCode: "CM", group: "A", online: false, color: "bg-indigo-600" },
    { id: "ps", name: "Priya Sharma", nameAr: "بريا شارما", initials: "PS", role: "Arch. Engineer", roleCode: "AE", group: "A", online: true, color: "bg-pink-600" },
    { id: "le", name: "Lisa Park", nameAr: "ليزا بارك", initials: "LP", role: "Lead Electrical", roleCode: "LE", group: "A", online: false, color: "bg-cyan-600" },
    { id: "ok", name: "Omar Khalil", nameAr: "عمر خليل", initials: "OK", role: "BIM Coordinator", roleCode: "BIM", group: "B", online: true, color: "bg-amber-600" },
    { id: "tn", name: "Tariq Noor", nameAr: "طارق نور", initials: "TN", role: "QS / Cost Consultant", roleCode: "QS", group: "B", online: false, color: "bg-emerald-600" },
    { id: "ks", name: "Khalid Al Suwaidi", nameAr: "خالد السويدي", initials: "KS", role: "Arch. Technician", roleCode: "JA1", group: "C", online: true, color: "bg-slate-600" },
    { id: "fr", name: "Fatima Al Rashid", nameAr: "فاطمة الراشد", initials: "FR", role: "Graduate Architect", roleCode: "JA2", group: "C", online: false, color: "bg-rose-600" },
    { id: "yh", name: "Yara Al Hashimi", nameAr: "يارا الهاشمي", initials: "YH", role: "Arch. Intern", roleCode: "JA3", group: "C", online: false, color: "bg-violet-600" },
  ],
  "al-wasl-tower": [
    { id: "am", name: "Ahmed Al Maktoum", nameAr: "أحمد المكتوم", initials: "AM", role: "Project Manager", roleCode: "PM", group: "A", online: true, color: "bg-blue-600" },
    { id: "sj", name: "Sarah Johnson", nameAr: "سارة جونسون", initials: "SJ", role: "Lead Architect", roleCode: "LA", group: "A", online: true, color: "bg-purple-600" },
    { id: "dc", name: "David Chen", nameAr: "ديفيد تشن", initials: "DC", role: "Lead Structural", roleCode: "LS", group: "A", online: false, color: "bg-teal-600" },
    { id: "mh", name: "Mohammed Hassan", nameAr: "محمد حسن", initials: "MH", role: "Lead MEP", roleCode: "LM", group: "A", online: true, color: "bg-orange-600" },
    { id: "ps", name: "Priya Sharma", nameAr: "بريا شارما", initials: "PS", role: "Arch. Engineer", roleCode: "AE", group: "A", online: true, color: "bg-pink-600" },
    { id: "ks", name: "Khalid Al Suwaidi", nameAr: "خالد السويدي", initials: "KS", role: "Arch. Technician", roleCode: "JA1", group: "C", online: true, color: "bg-slate-600" },
  ],
  "dubai-creek": [
    { id: "am", name: "Ahmed Al Maktoum", nameAr: "أحمد المكتوم", initials: "AM", role: "Project Manager", roleCode: "PM", group: "A", online: true, color: "bg-blue-600" },
    { id: "sj", name: "Sarah Johnson", nameAr: "سارة جونسون", initials: "SJ", role: "Lead Architect", roleCode: "LA", group: "A", online: true, color: "bg-purple-600" },
    { id: "dc", name: "David Chen", nameAr: "ديفيد تشن", initials: "DC", role: "Lead Structural", roleCode: "LS", group: "A", online: false, color: "bg-teal-600" },
    { id: "ks", name: "Khalid Al Suwaidi", nameAr: "خالد السويدي", initials: "KS", role: "Arch. Technician", roleCode: "JA1", group: "C", online: true, color: "bg-slate-600" },
    { id: "ok", name: "Omar Khalil", nameAr: "عمر خليل", initials: "OK", role: "BIM Coordinator", roleCode: "BIM", group: "B", online: true, color: "bg-amber-600" },
  ],
};

// ===== SAMPLE MESSAGES PER PROJECT =====
const projectMessages: Record<string, ChatMessage[]> = {
  "marina-heights": [
    { id: "m1", sender: projectTeams["marina-heights"][0], text: "Team, we have the DM submission deadline next Thursday. Please confirm all drawings are updated to Rev C.", timestamp: "2026-05-07 09:15", type: "text", read: true },
    { id: "m2", sender: projectTeams["marina-heights"][1], text: "@Ahmed Al Maktoum Architectural set is ready — uploaded to #DWG-MHT-A-101 through A-145. All at Rev C.", timestamp: "2026-05-07 09:22", type: "text", read: true, reactions: [{ emoji: "👍", users: ["am", "dc"] }] },
    { id: "m3", sender: projectTeams["marina-heights"][2], text: "Structural drawings updated. One issue: the transfer beam at Level 14 needs coordination with MEP. @Mohammed Hassan can we sync today?", timestamp: "2026-05-07 09:30", type: "text", read: true },
    { id: "m4", sender: projectTeams["marina-heights"][3], text: "@David Chen Yes, I saw the clash in the BIM model. Let's meet at 2pm. I'll bring @Omar Khalil for the coordination.", timestamp: "2026-05-07 09:35", type: "text", read: true },
    { id: "m5", sender: projectTeams["marina-heights"][7], text: "I've run the clash detection report. 23 clashes found at Level 14, mostly HVAC vs. structural. Report attached.", timestamp: "2026-05-07 10:02", type: "file", read: true, file: { name: "Clash_Report_L14_Rev3.pdf", type: "pdf", size: "2.4 MB" } },
    { id: "m6", sender: projectTeams["marina-heights"][0], text: "Thanks Omar. Can you also check #RFI-042 — the client asked about the podium slab thickness. We need to respond by Friday.", timestamp: "2026-05-07 10:15", type: "text", read: true },
    { id: "m7", sender: projectTeams["marina-heights"][5], text: "I've reviewed the facade calculations. Wind load analysis shows we need to increase the mullion depth from 150mm to 175mm on the exposed elevations.", timestamp: "2026-05-07 11:00", type: "text", read: true },
    { id: "m8", sender: projectTeams["marina-heights"][1], text: "That will affect the elevation aesthetics. Let me revise the detail and share options. @Fatima Al Rashid can you update the 3D renders once I send the revised section?", timestamp: "2026-05-07 11:15", type: "text", read: true },
    { id: "m9", sender: projectTeams["marina-heights"][10], text: "@Sarah Johnson Sure, I'll prepare 3 render options showing the visual impact. Should have them by EOD tomorrow.", timestamp: "2026-05-07 11:20", type: "text", read: true, reactions: [{ emoji: "🙏", users: ["sj"] }] },
    { id: "m10", sender: projectTeams["marina-heights"][8], text: "Cost update: the mullion change will add approximately AED 340,000 to the facade package. I'll update the cost plan and flag it as a potential VO.", timestamp: "2026-05-07 11:45", type: "text", read: true },
    { id: "m11", sender: projectTeams["marina-heights"][0], text: "Noted. Let's discuss in tomorrow's design review. Adding it to #TSK-089 for tracking.", timestamp: "2026-05-07 12:00", type: "text", read: true, pinned: true },
    { id: "m12", sender: projectTeams["marina-heights"][3], text: "", timestamp: "2026-05-07 14:30", type: "voice", read: true, voiceDuration: "0:45" },
    { id: "m13", sender: projectTeams["marina-heights"][4], text: "Site visit report from today. Foundation work 87% complete. Basement waterproofing starting next week. Photos attached.", timestamp: "2026-05-07 15:00", type: "file", read: true, file: { name: "Site_Visit_07May_Photos.zip", type: "zip", size: "18.7 MB" } },
    { id: "m14", sender: projectTeams["marina-heights"][9], text: "Updated the coordination drawings for the podium level. All services routes confirmed with MEP team. Uploaded to BIM360.", timestamp: "2026-05-07 16:00", type: "text", read: true },
    { id: "m15", sender: projectTeams["marina-heights"][11], text: "مرحباً، أنهيت تحديث جدول المساحات للطوابق 15-20. الملف جاهز للمراجعة.\n\nHi, I've finished updating the area schedule for floors 15-20. File ready for review.", timestamp: "2026-05-07 16:30", type: "text", read: true },
    { id: "m16", sender: projectTeams["marina-heights"][0], text: "شكراً يارا. ممتاز.\nThanks Yara. Excellent work. @Sarah Johnson please review when you get a chance.", timestamp: "2026-05-07 16:35", type: "text", read: true },
    { id: "m17", sender: projectTeams["marina-heights"][1], text: "Will review first thing tomorrow. Good progress everyone! 💪", timestamp: "2026-05-07 17:00", type: "text", read: false, reactions: [{ emoji: "🔥", users: ["am", "mh", "ps"] }] },
  ],
  "al-wasl-tower": [
    { id: "aw1", sender: projectTeams["al-wasl-tower"][0], text: "Concept design presentation to client is scheduled for next Monday. @Sarah Johnson are the boards ready?", timestamp: "2026-05-07 10:00", type: "text", read: true },
    { id: "aw2", sender: projectTeams["al-wasl-tower"][1], text: "Working on them now. 2 of 3 options complete. The third (parametric facade) needs more time.", timestamp: "2026-05-07 10:15", type: "text", read: true },
    { id: "aw3", sender: projectTeams["al-wasl-tower"][3], text: "MEP preliminary layouts for Option A and B are done. Option C will follow once the form is finalized.", timestamp: "2026-05-07 11:00", type: "text", read: true },
    { id: "aw4", sender: projectTeams["al-wasl-tower"][5], text: "I've prepared the site analysis boards and context diagrams. Shared in the project folder.", timestamp: "2026-05-07 14:00", type: "text", read: true },
    { id: "aw5", sender: projectTeams["al-wasl-tower"][0], text: "Great. Let's do a dry run Thursday at 3pm. All leads please attend. #TSK-012", timestamp: "2026-05-07 14:30", type: "text", read: true, pinned: true },
  ],
  "dubai-creek": [
    { id: "dc1", sender: projectTeams["dubai-creek"][0], text: "Dubai Creek Residences — kickoff meeting notes uploaded. Key dates confirmed with Emaar.", timestamp: "2026-05-06 09:00", type: "text", read: true },
    { id: "dc2", sender: projectTeams["dubai-creek"][1], text: "Starting the massing studies today. Will have 3 options by end of week.", timestamp: "2026-05-06 10:30", type: "text", read: true },
    { id: "dc3", sender: projectTeams["dubai-creek"][4], text: "BIM template set up. Using LOD 200 for concept stage. @Khalid Al Suwaidi please start the base model.", timestamp: "2026-05-06 11:00", type: "text", read: true },
    { id: "dc4", sender: projectTeams["dubai-creek"][3], text: "Base model started. Plot boundary and site levels imported from survey.", timestamp: "2026-05-06 14:00", type: "text", read: true },
    { id: "dc5", sender: projectTeams["dubai-creek"][2], text: "Preliminary structural grid options shared. 8.4m and 9.0m spans — both feasible for residential.", timestamp: "2026-05-07 09:00", type: "text", read: false },
  ],
};

// ===== COMPONENT =====
export default function ProjectChatTab({ project }: ProjectChatTabProps) {
  const users = useCollection(usersStore);
  const { currentUser } = useAuth();
  const chatStorageKey = `nasec-project-chat::${project.id}`;
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(chatStorageKey) || "[]");
    } catch {
      return [];
    }
  });
  const [inputText, setInputText] = useState("");
  const [showMembers, setShowMembers] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [muted, setMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const teamMembers = useMemo(() => {
    const ids = new Set<string>([
      ...((project.teamUserIds || []) as string[]),
      ...(project.pmUserId ? [project.pmUserId] : []),
      ...(project.designLeadUserId ? [project.designLeadUserId] : []),
    ]);
    const palette = ["bg-blue-600", "bg-purple-600", "bg-teal-600", "bg-orange-600", "bg-pink-600", "bg-emerald-600", "bg-slate-600"];
    const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "U";
    const roleCode = (role: string) => role.split("-").map((p) => p[0]).join("").toUpperCase() || "TM";

    return users
      .filter((u) => ids.has(u.id) || u.id === currentUser?.id)
      .map((u, index) => ({
        id: u.id,
        name: u.displayName,
        initials: initials(u.displayName),
        role: u.role,
        roleCode: roleCode(u.role),
        group: index < 5 ? "A" as const : index < 10 ? "B" as const : "C" as const,
        online: u.id === currentUser?.id,
        color: u.avatarColor || palette[index % palette.length],
      }));
  }, [currentUser?.id, project.designLeadUserId, project.pmUserId, project.teamUserIds, users]);
  const currentMember = teamMembers.find((m) => m.id === currentUser?.id) || teamMembers[0] || {
    id: currentUser?.id || "current-user",
    name: currentUser?.displayName || "Current User",
    initials: "CU",
    role: currentUser?.role || "team",
    roleCode: "ME",
    group: "A" as const,
    online: true,
    color: "bg-blue-600",
  };
  const onlineCount = teamMembers.filter(m => m.online).length;
  const unreadCount = messages.filter(m => !m.read).length;

  useEffect(() => {
    try {
      setMessages(JSON.parse(localStorage.getItem(chatStorageKey) || "[]"));
    } catch {
      setMessages([]);
    }
  }, [chatStorageKey]);

  useEffect(() => {
    localStorage.setItem(chatStorageKey, JSON.stringify(messages));
  }, [chatStorageKey, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery) return messages;
    return messages.filter(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()) || m.sender.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [messages, searchQuery]);

  const pinnedMessages = useMemo(() => messages.filter(m => m.pinned), [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const newMsg: ChatMessage = {
      id: `new-${Date.now()}`,
      sender: currentMember,
      text: inputText,
      timestamp: new Date().toLocaleString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true }).replace(",", ""),
      type: "text",
      read: true,
      replyTo: replyingTo?.id,
    };
    setMessages(prev => [...prev, newMsg]);
    setInputText("");
    setReplyingTo(null);
    setShowMentions(false);
  };

  const handleInputChange = (value: string) => {
    setInputText(value);
    // Detect @mention trigger
    const lastAtIndex = value.lastIndexOf("@");
    if (lastAtIndex >= 0 && (lastAtIndex === 0 || value[lastAtIndex - 1] === " ")) {
      const query = value.slice(lastAtIndex + 1);
      setMentionFilter(query);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (member: TeamMember) => {
    const lastAtIndex = inputText.lastIndexOf("@");
    const before = inputText.slice(0, lastAtIndex);
    setInputText(`${before}@${member.name} `);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleConvertToTask = (msg: ChatMessage) => {
    toast.success(`Task created from message by ${msg.sender.name}`, { description: `Project: ${project.nameEn} | Phase: ${project.stage}` });
  };

  const handleReaction = (msgId: string, emoji: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const existing = m.reactions?.find(r => r.emoji === emoji);
      if (existing) {
        if (existing.users.includes(currentMember.id)) {
          return { ...m, reactions: m.reactions?.map(r => r.emoji === emoji ? { ...r, users: r.users.filter(u => u !== currentMember.id) } : r).filter(r => r.users.length > 0) };
        }
        return { ...m, reactions: m.reactions?.map(r => r.emoji === emoji ? { ...r, users: [...r.users, currentMember.id] } : r) };
      }
      return { ...m, reactions: [...(m.reactions || []), { emoji, users: [currentMember.id] }] };
    }));
  };

  // Render message text with #references and @mentions highlighted
  const renderMessageText = (text: string) => {
    const parts = text.split(/(#[A-Z]+-\d+|@[A-Za-z\s]+(?=[.,!?\s]|$))/g);
    return parts.map((part, i) => {
      if (part.startsWith("#")) {
        return <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono cursor-pointer hover:bg-blue-200 transition-colors"><Hash className="w-3 h-3" />{part.slice(1)}</span>;
      }
      if (part.startsWith("@")) {
        return <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium cursor-pointer hover:bg-amber-200 transition-colors"><AtSign className="w-3 h-3" />{part.slice(1)}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex h-[calc(100vh-200px)] -m-4 lg:-m-6">
      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">💬</span>
            </div>
            <div>
              <h3 className="font-semibold text-sm">{project.nameEn}</h3>
              <p className="text-xs text-muted-foreground font-mono">{project.code} • {teamMembers.length} members • {onlineCount} online</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && <Badge className="bg-red-500 text-white text-xs mr-2">{unreadCount} new</Badge>}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowSearch(!showSearch)}>
              <Search className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setMuted(!muted)}>
              {muted ? <BellOff className="w-4 h-4 text-muted-foreground" /> : <Bell className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowMembers(!showMembers)}>
              <Users className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="px-4 py-2 border-b border-border bg-muted/30">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search messages..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm" autoFocus />
              {searchQuery && <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0" onClick={() => setSearchQuery("")}><X className="w-3 h-3" /></Button>}
            </div>
          </div>
        )}

        {/* Pinned Messages */}
        {pinnedMessages.length > 0 && !showSearch && (
          <div className="px-4 py-2 border-b border-border bg-amber-50 dark:bg-amber-950/20">
            <div className="flex items-center gap-2 text-xs">
              <Pin className="w-3 h-3 text-amber-600" />
              <span className="font-medium text-amber-700">Pinned:</span>
              <span className="text-amber-600 truncate">{pinnedMessages[0].text.slice(0, 80)}...</span>
            </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-3">
          <div className="space-y-4">
            {/* System message */}
            <div className="flex justify-center">
              <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                Project chat created • {teamMembers.length} members auto-added from project team
              </span>
            </div>

            {filteredMessages.map((msg) => (
              <div key={msg.id} className={`group flex gap-3 ${msg.type === "system" ? "justify-center" : ""}`}>
                {msg.type !== "system" && (
                  <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                    <AvatarFallback className={`${msg.sender.color} text-white text-xs`}>{msg.sender.initials}</AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium">{msg.sender.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{msg.sender.roleCode}</Badge>
                    <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
                    {msg.edited && <span className="text-xs text-muted-foreground italic">(edited)</span>}
                    {msg.read && <CheckCheck className="w-3 h-3 text-blue-500" />}
                    {msg.pinned && <Pin className="w-3 h-3 text-amber-500" />}
                  </div>

                  {/* Reply indicator */}
                  {msg.replyTo && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1 pl-2 border-l-2 border-muted">
                      <Reply className="w-3 h-3" />
                      <span className="truncate">{messages.find(m => m.id === msg.replyTo)?.text?.slice(0, 50)}...</span>
                    </div>
                  )}

                  {/* Message content */}
                  {msg.type === "text" && (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{renderMessageText(msg.text)}</div>
                  )}

                  {msg.type === "file" && msg.file && (
                    <div className="mt-1 inline-flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border max-w-xs">
                      {msg.file.type === "pdf" ? <FileText className="w-5 h-5 text-red-500 shrink-0" /> : <ImageIcon className="w-5 h-5 text-blue-500 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{msg.file.name}</p>
                        <p className="text-xs text-muted-foreground">{msg.file.size}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => toast.info("Download started")}><Download className="w-3 h-3" /></Button>
                    </div>
                  )}

                  {msg.type === "voice" && (
                    <div className="mt-1 inline-flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Volume2 className="w-4 h-4 text-emerald-600" /></Button>
                      <div className="w-24 h-1.5 bg-emerald-200 rounded-full"><div className="w-1/3 h-full bg-emerald-500 rounded-full" /></div>
                      <span className="text-xs text-emerald-600 font-mono">{msg.voiceDuration}</span>
                      <Badge variant="outline" className="text-[10px] h-4">EN+AR</Badge>
                    </div>
                  )}

                  {/* Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5">
                      {msg.reactions.map((r, i) => (
                        <button key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-muted rounded-full text-xs hover:bg-accent transition-colors" onClick={() => handleReaction(msg.id, r.emoji)}>
                          <span>{r.emoji}</span><span className="text-muted-foreground">{r.users.length}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Hover actions */}
                  <div className="hidden group-hover:flex items-center gap-0.5 mt-1">
                    <Button variant="ghost" size="sm" className="h-5 px-1 text-xs" onClick={() => handleReaction(msg.id, "👍")}>👍</Button>
                    <Button variant="ghost" size="sm" className="h-5 px-1 text-xs" onClick={() => setReplyingTo(msg)}><Reply className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-5 px-1 text-xs" onClick={() => { setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, pinned: !m.pinned } : m)); toast.success(msg.pinned ? "Unpinned" : "Pinned"); }}><Pin className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-5 px-1 text-xs" onClick={() => handleConvertToTask(msg)}>→ Task</Button>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Reply indicator */}
        {replyingTo && (
          <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center gap-2">
            <Reply className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate">Replying to {replyingTo.sender.name}: {replyingTo.text.slice(0, 50)}...</span>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-auto" onClick={() => setReplyingTo(null)}><X className="w-3 h-3" /></Button>
          </div>
        )}

        {/* Mention autocomplete */}
        {showMentions && (
          <div className="px-4 pb-1">
            <div className="border border-border rounded-lg bg-card shadow-lg p-2 max-h-40 overflow-y-auto">
              {teamMembers.filter(m => m.name.toLowerCase().includes(mentionFilter.toLowerCase())).map(member => (
                <button key={member.id} className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-left transition-colors" onClick={() => insertMention(member)}>
                  <Avatar className="w-5 h-5"><AvatarFallback className={`${member.color} text-white text-[9px]`}>{member.initials}</AvatarFallback></Avatar>
                  <span className="text-sm">{member.name}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 ml-auto">{member.roleCode}</Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="px-4 py-3 border-t border-border bg-card">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => toast.info("File picker — attach images, PDFs, drawings")}><Paperclip className="w-4 h-4" /></Button>
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                placeholder="Type a message... (@ to mention, # for references)"
                value={inputText}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                className="pr-10 h-9"
              />
              <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0" onClick={() => toast.info("Emoji picker")}><Smile className="w-4 h-4" /></Button>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => toast.info("Voice note recording — auto-transcription EN+AR")}><Mic className="w-4 h-4" /></Button>
            <Button size="sm" className="h-8 px-3 gap-1" onClick={handleSend} disabled={!inputText.trim()}><Send className="w-3.5 h-3.5" /></Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 pl-10">Type @ to mention team members • # to reference tasks, RFIs, drawings • Right-click messages to convert to task</p>
        </div>
      </div>

      {/* MEMBER LIST PANEL */}
      {showMembers && (
        <div className="w-56 border-l border-border bg-card shrink-0 hidden lg:flex flex-col">
          <div className="px-3 py-3 border-b border-border">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team Members</h4>
              <Badge variant="outline" className="text-[10px]">{teamMembers.length}</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{onlineCount} online now</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {/* Group A - Core */}
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-2 pb-1">Core Roles (Group A)</p>
              {teamMembers.filter(m => m.group === "A").map(member => (
                <div key={member.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent/50 transition-colors">
                  <div className="relative">
                    <Avatar className="w-6 h-6"><AvatarFallback className={`${member.color} text-white text-[9px]`}>{member.initials}</AvatarFallback></Avatar>
                    {member.online && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-card" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{member.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{member.role}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 shrink-0">{member.roleCode}</Badge>
                </div>
              ))}

              {/* Group B - Support */}
              {teamMembers.filter(m => m.group === "B").length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-3 pb-1">Support (Group B)</p>
                  {teamMembers.filter(m => m.group === "B").map(member => (
                    <div key={member.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent/50 transition-colors">
                      <div className="relative">
                        <Avatar className="w-6 h-6"><AvatarFallback className={`${member.color} text-white text-[9px]`}>{member.initials}</AvatarFallback></Avatar>
                        {member.online && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-card" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{member.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{member.role}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 shrink-0">{member.roleCode}</Badge>
                    </div>
                  ))}
                </>
              )}

              {/* Group C - Junior */}
              {teamMembers.filter(m => m.group === "C").length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-3 pb-1">Junior Staff (Group C)</p>
                  {teamMembers.filter(m => m.group === "C").map(member => (
                    <div key={member.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent/50 transition-colors">
                      <div className="relative">
                        <Avatar className="w-6 h-6"><AvatarFallback className={`${member.color} text-white text-[9px]`}>{member.initials}</AvatarFallback></Avatar>
                        {member.online && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-card" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{member.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{member.role}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 shrink-0">{member.roleCode}</Badge>
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
          <div className="p-2 border-t border-border">
            <p className="text-[10px] text-muted-foreground text-center">Auto-synced from project team</p>
          </div>
        </div>
      )}
    </div>
  );
}
