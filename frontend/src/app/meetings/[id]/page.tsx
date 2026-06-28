"use client";

import React, { useState, useEffect, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import API_BASE from "@/lib/api";
import { 
  ArrowLeft, 
  Sparkles, 
  CheckSquare, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  BookOpen, 
  Tag, 
  Download,
  Volume2
} from "lucide-react";
import AudioPlayer from "@/components/AudioPlayer";
import TranscriptPanel from "@/components/TranscriptPanel";
import { useToast } from "@/components/Providers";

interface Participant {
  id: number;
  name: string;
  email?: string;
}

interface ActionItem {
  id: number;
  meeting_id: number;
  task: string;
  completed: boolean;
}

interface Topic {
  id: number;
  meeting_id: number;
  topic: string;
}

interface TranscriptSegment {
  id: number;
  meeting_id: number;
  speaker: string;
  timestamp: number;
  content: string;
}

interface Comment {
  id: number;
  meeting_id: number;
  segment_id: number;
  author: string;
  text: string;
  created_at: string;
}

interface Highlight {
  id: number;
  meeting_id: number;
  segment_id: number;
  color: string;
}

interface MeetingDetailData {
  id: number;
  title: string;
  date: string;
  duration: number;
  summary: string;
  created_at: string;
  participants: Participant[];
  transcript_segments: TranscriptSegment[];
  action_items: ActionItem[];
  topics: Topic[];
  comments: Comment[];
  highlights: Highlight[];
}

export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const meetingId = parseInt(resolvedParams.id);
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Shared Media States
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [seekTime, setSeekTime] = useState<number | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Active Tab on Right Side
  const [activeTab, setActiveTab] = useState<"summary" | "actions" | "topics" | "ai">("summary");

  // Action Items State
  const [newActionText, setNewActionText] = useState("");
  const [editingActionId, setEditingActionId] = useState<number | null>(null);
  const [editingActionText, setEditingActionText] = useState("");

  // Ask AI Chat State
  const [aiQuery, setAiQuery] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // TTS Toggle State
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // Fetch meeting details
  const { data: meeting, isLoading, error, refetch } = useQuery<MeetingDetailData>({
    queryKey: ["meeting", meetingId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/meetings/${meetingId}`);
      if (!res.ok) throw new Error("Failed to fetch meeting");
      return res.json();
    }
  });

  // Find the active segment based on current audio time
  const activeSegment = React.useMemo(() => {
    if (!meeting || !meeting.transcript_segments.length) return null;
    let active = meeting.transcript_segments[0];
    for (const segment of meeting.transcript_segments) {
      if (segment.timestamp <= currentTime) {
        active = segment;
      } else {
        break;
      }
    }
    return active;
  }, [currentTime, meeting]);

  const lastSpokenId = React.useRef<number | null>(null);

  // Web Speech Synthesis (TTS) Controller
  React.useEffect(() => {
    if (!isPlaying || !ttsEnabled) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      lastSpokenId.current = null;
      return;
    }

    if (activeSegment && activeSegment.id !== lastSpokenId.current) {
      lastSpokenId.current = activeSegment.id;
      
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(activeSegment.content);
        
        // Select custom voices for dialogue speakers (male vs female)
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const speakerLower = activeSegment.speaker.toLowerCase();
          if (speakerLower.includes("sarah") || speakerLower.includes("alice")) {
            const femaleVoice = voices.find(v => 
              v.name.toLowerCase().includes("female") || 
              v.name.toLowerCase().includes("zira") || 
              v.name.toLowerCase().includes("samantha") ||
              v.name.toLowerCase().includes("google us english")
            );
            if (femaleVoice) utterance.voice = femaleVoice;
          } else {
            const maleVoice = voices.find(v => 
              v.name.toLowerCase().includes("male") || 
              v.name.toLowerCase().includes("david") || 
              v.name.toLowerCase().includes("google uk english male")
            );
            if (maleVoice) utterance.voice = maleVoice;
          }
        }
        
        utterance.rate = playbackRate;
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [activeSegment, isPlaying, playbackRate, ttsEnabled]);

  // Clean up speech on page transition
  React.useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Handle URL timestamp param seek on mount
  useEffect(() => {
    if (meeting && searchParams) {
      const timeParam = searchParams.get("t");
      if (timeParam) {
        const parsedTime = parseInt(timeParam);
        if (!isNaN(parsedTime)) {
          // Delay briefly to allow audio ref to connect
          setTimeout(() => {
            setSeekTime(parsedTime);
          }, 300);
        }
      }
    }
  }, [meeting, searchParams]);

  // ----------------- Action Items Mutations -----------------
  
  // Create Action Item
  const createActionMutation = useMutation({
    mutationFn: async (task: string) => {
      const res = await fetch(`${API_BASE}/api/action-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id: meetingId, task }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting", meetingId] });
      setNewActionText("");
      toast("Action item added", "success");
    },
    onError: () => toast("Failed to add action item", "error"),
  });

  // Update Action Item Status/Text
  const updateActionMutation = useMutation({
    mutationFn: async ({ id, task, completed }: { id: number; task?: string; completed?: boolean }) => {
      const res = await fetch(`${API_BASE}/api/action-items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, completed }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting", meetingId] });
      setEditingActionId(null);
    },
    onError: () => toast("Failed to update action item", "error"),
  });

  // Delete Action Item
  const deleteActionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_BASE}/api/action-items/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting", meetingId] });
      toast("Action item deleted", "success");
    },
    onError: () => toast("Failed to delete action item", "error"),
  });

  // ----------------- Helper Actions -----------------

  const handleAddActionItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionText.trim()) return;
    createActionMutation.mutate(newActionText);
  };

  const handleToggleComplete = (item: ActionItem) => {
    updateActionMutation.mutate({ id: item.id, completed: !item.completed });
  };

  const startEditAction = (item: ActionItem) => {
    setEditingActionId(item.id);
    setEditingActionText(item.task);
  };

  const saveEditAction = (id: number) => {
    if (!editingActionText.trim()) return;
    updateActionMutation.mutate({ id, task: editingActionText });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // Ask AI response generator (RAG simulator)
  const handleAskAi = (e?: React.FormEvent, presetQuery?: string) => {
    if (e) e.preventDefault();
    const query = presetQuery || aiQuery;
    if (!query.trim()) return;

    // Add User Message
    setChatMessages((prev) => [...prev, { sender: "user", text: query }]);
    setAiQuery("");
    setAiLoading(true);

    // Simulate AI response delay
    setTimeout(() => {
      let answer = "";
      const lower = query.toLowerCase();
      const summaryText = meeting?.summary || "";
      const actionItemsStr = meeting?.action_items.map((ai) => `- ${ai.task}`).join("\n") || "None";
      const topicsStr = meeting?.topics.map((t) => t.topic).join(", ") || "None";

      if (lower.includes("action") || lower.includes("task") || lower.includes("todo")) {
        answer = `Here are the action items extracted from the meeting:\n\n${actionItemsStr}\n\nIs there a specific task you want me to write details for?`;
      } else if (lower.includes("summary") || lower.includes("overview") || lower.includes("about")) {
        answer = `Sure! Based on our transcript, here is a summary of what was discussed:\n\n"${summaryText}"\n\nKey topics covered included: ${topicsStr}.`;
      } else if (lower.includes("participant") || lower.includes("who was")) {
        const names = meeting?.participants.map((p) => p.name).join(", ") || "No participants logged";
        answer = `The meeting was attended by: ${names}. Let me know if you want to know what anyone in particular contributed.`;
      } else {
        answer = `That is an interesting question! Based on the context of this "${meeting?.title}" meeting, we focused heavily on: ${topicsStr}.\n\nThe overall summary is:\n"${summaryText}"\n\nLet me know if you would like me to clarify anything about the action items!`;
      }

      setChatMessages((prev) => [...prev, { sender: "ai", text: answer }]);
      setAiLoading(false);
    }, 1200);
  };

  const handlePresetClick = (q: string) => {
    handleAskAi(undefined, q);
  };

  // Export Summary as Text File
  const exportSummaryText = () => {
    try {
      const text = `MEETING SUMMARY & DETAILS\n=========================\n\n` +
        `Title: ${meeting?.title}\n` +
        `Date: ${meeting?.date}\n` +
        `Duration: ${formatDuration(meeting?.duration || 0)}\n\n` +
        `Summary:\n${meeting?.summary || "None"}\n\n` +
        `Key Topics: ${meeting?.topics.map(t => t.topic).join(", ")}\n\n` +
        `Action Items:\n${meeting?.action_items.map(ai => `[${ai.completed ? 'X' : ' '}] ${ai.task}`).join("\n")}\n`;

      const blob = new Blob([text], { type: "text/plain;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `meeting_summary_${meetingId}.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast("Summary exported successfully", "success");
    } catch {
      toast("Failed to export summary", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20 bg-background text-foreground animate-pulse">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-muted font-medium">Retrieving meeting data...</p>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background text-foreground gap-4">
        <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500">
          <X className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold">Failed to load meeting</h3>
        <p className="text-sm text-muted max-w-sm">
          There was an error connecting to the backend server. Make sure the FastAPI service is running.
        </p>
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg shadow-md transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden text-foreground">
      {/* Detail View Sub-Header Navbar */}
      <div className="h-16 px-8 flex items-center justify-between flex-shrink-0 transition-colors"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/"
            className="p-2 rounded-xl transition-all group"
            style={{ color: "var(--muted)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--primary-light)"; (e.currentTarget as HTMLElement).style.color = "var(--primary)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--muted)"; }}
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </Link>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold tracking-tight truncate gradient-text pr-4">
              {meeting.title}
            </h2>
            <p className="text-xs text-muted font-medium flex items-center gap-2 mt-0.5">
              <span>{meeting.date}</span>
              <span>•</span>
              <span>{formatDuration(meeting.duration)}</span>
              <span>•</span>
              <span className="truncate">
                {meeting.participants.map((p) => p.name).join(", ")}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Text-to-speech button */}
          <button
            onClick={() => {
              setTtsEnabled(!ttsEnabled);
              toast(ttsEnabled ? "Text-to-speech disabled" : "Text-to-speech enabled", "info");
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer"
            style={ttsEnabled ? {
              background: "var(--grad-btn)",
              color: "white",
              border: "none",
              boxShadow: "var(--shadow-md)"
            } : {
              background: "var(--muted-bg)",
              color: "var(--muted)",
              border: "1px solid var(--border)"
            }}
            title="Toggle Text-to-Speech"
          >
            <Volume2 className="w-4 h-4" />
            <span className="hidden sm:inline">{ttsEnabled ? "TTS On" : "TTS Off"}</span>
          </button>

          {/* Quick export summary */}
          <button
            onClick={exportSummaryText}
            className="flex items-center gap-2 px-3 py-1.5 bg-muted-bg hover:bg-border text-muted hover:text-foreground text-xs font-semibold rounded-lg border border-transparent hover:border-border transition-colors cursor-pointer"
            title="Download Notes Text"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Notes</span>
          </button>
        </div>
      </div>

      {/* Main Splits Area */}
      <div className="flex-1 flex flex-col lg:flex-row h-full overflow-auto lg:overflow-hidden">
        
        {/* Left Side: Media Player & Transcript (65% width) */}
        <div className="w-full lg:w-[65%] border-b lg:border-b-0 lg:border-r border-border p-4 lg:p-6 flex flex-col gap-5 h-[65vh] lg:h-full overflow-hidden bg-background flex-shrink-0">
          {/* Media Player block */}
          <AudioPlayer
            audioUrl="/sample.mp3"
            currentTime={currentTime}
            onTimeUpdate={setCurrentTime}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            seekTime={seekTime}
            onSeekComplete={() => setSeekTime(null)}
            playbackRate={playbackRate}
            onPlaybackRateChange={setPlaybackRate}
          />

          {/* Interactive Transcript Panel */}
          <TranscriptPanel
            meetingId={meetingId}
            segments={meeting.transcript_segments}
            currentTime={currentTime}
            onSeek={(t) => setSeekTime(t)}
            comments={meeting.comments}
            highlights={meeting.highlights}
            onRefreshMeeting={refetch}
          />
        </div>

        {/* Right Side: Tab Panel (35% width) */}
        <div className="w-full lg:w-[35%] flex flex-col h-[65vh] lg:h-full bg-card overflow-hidden lg:border-l border-border transition-colors flex-shrink-0">
          {/* Tabs header selector */}
          <div className="flex border border-border bg-muted-bg/30 p-1 m-4 rounded-lg flex-shrink-0">
            {[
              { id: "summary", label: "Summary", icon: BookOpen },
              { id: "actions", label: "Tasks", icon: CheckSquare },
              { id: "topics", label: "Topics", icon: Tag },
              { id: "ai", label: "Ask AI", icon: Sparkles }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as "summary" | "actions" | "topics" | "ai")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-card text-primary shadow-sm font-bold border border-border/10"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab content area */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 text-sm leading-relaxed">
            
            {/* Tab: Summary */}
            {activeTab === "summary" && (
              <div className="space-y-4">
                <div className="bg-primary/5 border border-primary/10 p-5 rounded-xl space-y-3">
                  <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Summary Notes
                  </h4>
                  <p className="text-muted leading-relaxed font-light text-sm">
                    {meeting.summary || "No automated summary has been loaded for this meeting yet. Try editing the meeting profile or typing an action plan."}
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-muted uppercase tracking-wider">Quick Meeting Stats</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted-bg/30 border border-border/40 p-3 rounded-lg">
                      <span className="text-[10px] text-muted font-bold block uppercase tracking-wider">Participants</span>
                      <span className="text-base font-bold text-foreground block mt-0.5">{meeting.participants.length}</span>
                    </div>
                    <div className="bg-muted-bg/30 border border-border/40 p-3 rounded-lg">
                      <span className="text-[10px] text-muted font-bold block uppercase tracking-wider">Dialogue Blocks</span>
                      <span className="text-base font-bold text-foreground block mt-0.5">{meeting.transcript_segments.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Action Items */}
            {activeTab === "actions" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-bold text-sm">Tasks checklist</h4>
                  <span className="text-xs bg-muted-bg text-muted px-2 py-0.5 rounded-full font-semibold">
                    {meeting.action_items.filter(a => a.completed).length}/{meeting.action_items.length} done
                  </span>
                </div>

                {/* Add new action item form */}
                <form onSubmit={handleAddActionItem} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a new task..."
                    value={newActionText}
                    onChange={(e) => setNewActionText(e.target.value)}
                    className="flex-1 px-3 py-2 bg-muted-bg text-xs rounded-lg border border-transparent focus:border-primary focus:outline-none text-foreground"
                  />
                  <button
                    type="submit"
                    className="px-3 bg-primary hover:bg-primary-hover text-white rounded-lg flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>

                {/* Tasks List */}
                <div className="space-y-2 mt-4">
                  {meeting.action_items.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted">No action items logged.</div>
                  ) : (
                    meeting.action_items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-150 ${
                          item.completed 
                            ? "bg-muted-bg/20 border-border/40 text-muted" 
                            : "bg-muted-bg/5 border-border text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                          <button
                            onClick={() => handleToggleComplete(item)}
                            className={`w-5 h-5 rounded flex items-center justify-center border flex-shrink-0 transition-all ${
                              item.completed
                                ? "bg-emerald-500 border-emerald-600 text-white"
                                : "border-border hover:border-primary"
                            }`}
                          >
                            {item.completed && <Check className="w-3.5 h-3.5" />}
                          </button>

                          {editingActionId === item.id ? (
                            <input
                              type="text"
                              value={editingActionText}
                              onChange={(e) => setEditingActionText(e.target.value)}
                              onBlur={() => saveEditAction(item.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEditAction(item.id);
                                if (e.key === "Escape") setEditingActionId(null);
                              }}
                              autoFocus
                              className="w-full bg-card border-b border-primary focus:outline-none text-sm text-foreground py-0.5"
                            />
                          ) : (
                            <span
                              onClick={() => handleToggleComplete(item)}
                              className={`text-sm select-none cursor-pointer truncate font-light ${
                                item.completed ? "line-through" : ""
                              }`}
                            >
                              {item.task}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {editingActionId !== item.id && (
                            <button
                              onClick={() => startEditAction(item)}
                              className="p-1 hover:bg-muted-bg text-muted hover:text-indigo-400 rounded transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteActionMutation.mutate(item.id)}
                            className="p-1 hover:bg-muted-bg text-muted hover:text-rose-500 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab: Topics */}
            {activeTab === "topics" && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm">Key Chapters & Topics</h4>
                <div className="flex flex-wrap gap-2.5">
                  {meeting.topics.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted w-full">No topics assigned.</div>
                  ) : (
                    meeting.topics.map((t) => (
                      <span
                        key={t.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold rounded-lg shadow-sm"
                      >
                        <Tag className="w-3.5 h-3.5" />
                        {t.topic}
                      </span>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab: Ask AI (RAG interface) */}
            {activeTab === "ai" && (
              <div className="flex flex-col h-[480px] border border-border rounded-xl bg-muted-bg/5 overflow-hidden">
                {/* Chat window */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 font-light text-xs">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-4">
                      <div className="bg-primary/10 p-3 rounded-full text-primary">
                        <Sparkles className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <h5 className="font-bold text-sm text-foreground">Ask AI about the call</h5>
                        <p className="text-muted text-[11px] max-w-[240px] mx-auto mt-1">
                          Query summary, deadlines, attendees, or decisions. Ask key facts to get instant answers.
                        </p>
                      </div>
                      
                      {/* Suggestion tags */}
                      <div className="flex flex-col gap-2 w-full max-w-[260px] pt-2">
                        {[
                          "What is the meeting summary?",
                          "What are the key action items?",
                          "Who attended this meeting?"
                        ].map((q) => (
                          <button
                            key={q}
                            onClick={() => handlePresetClick(q)}
                            className="text-[10px] text-left p-2 border border-border bg-card rounded-lg hover:border-primary/40 hover:bg-primary/5 transition-all text-muted hover:text-foreground"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-xl p-3 shadow-sm leading-relaxed whitespace-pre-line border ${
                            msg.sender === "user"
                              ? "bg-primary text-white border-transparent"
                              : "bg-card text-foreground border-border"
                          }`}
                        >
                          <span className="font-semibold block text-[10px] mb-1 opacity-70">
                            {msg.sender === "user" ? "You" : "Fireflies AI Assistant"}
                          </span>
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}

                  {aiLoading && (
                    <div className="flex justify-start">
                      <div className="bg-card text-foreground border border-border rounded-xl p-3 flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce"></span>
                          <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce [animation-delay:0.2s]"></span>
                          <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        </div>
                        <span className="text-[10px] text-muted">AI is thinking...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input box */}
                <form
                  onSubmit={(e) => handleAskAi(e)}
                  className="p-3 border-t border-border bg-card flex gap-2 flex-shrink-0"
                >
                  <input
                    type="text"
                    placeholder="Ask about this meeting..."
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-muted-bg text-xs rounded-lg border border-transparent focus:border-primary focus:outline-none text-foreground"
                  />
                  <button
                    type="submit"
                    disabled={aiLoading}
                    className="px-3 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
