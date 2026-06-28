"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Download, MessageSquare, Highlighter, Send, X } from "lucide-react";
import { useToast } from "./Providers";
import API_BASE from "@/lib/api";

interface Comment {
  id: number;
  segment_id: number;
  author: string;
  text: string;
  created_at: string;
}

interface Highlight {
  id: number;
  segment_id: number;
  color: string;
}

interface Segment {
  id: number;
  speaker: string;
  timestamp: number;
  content: string;
}

interface TranscriptPanelProps {
  meetingId: number;
  segments: Segment[];
  currentTime: number;
  onSeek: (time: number) => void;
  comments: Comment[];
  highlights: Highlight[];
  onRefreshMeeting: () => void;
}

export default function TranscriptPanel({
  meetingId,
  segments = [],
  currentTime,
  onSeek,
  comments = [],
  highlights = [],
  onRefreshMeeting,
}: TranscriptPanelProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  // Comment & Highlight panel states
  const [activeCommentBox, setActiveCommentBox] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [activeHighlightPicker, setActiveHighlightPicker] = useState<number | null>(null);

  const segmentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const listContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollEnabled = useRef(true);

  // Derive active segment based on current audio time
  const activeSegmentId = React.useMemo(() => {
    if (!segments || !segments.length) return null;
    let active = segments[0];
    for (const segment of segments) {
      if (segment.timestamp <= currentTime) {
        active = segment;
      } else {
        break;
      }
    }
    return active ? active.id : null;
  }, [currentTime, segments]);

  // Auto-scroll to the active segment
  useEffect(() => {
    if (activeSegmentId !== null && autoScrollEnabled.current) {
      const el = segmentRefs.current.get(activeSegmentId);
      if (el && listContainerRef.current) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [activeSegmentId]);

  const handleSegmentClick = (timestamp: number) => {
    onSeek(timestamp);
  };

  // Format timestamp (seconds to MM:SS)
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  // Download Transcript as Markdown
  const exportToMarkdown = () => {
    try {
      const header = `# Transcript - Meeting ID: ${meetingId}\nGenerated on ${new Date().toLocaleDateString()}\n\n`;
      const body = segments
        .map((s) => `**${s.speaker}** _(${formatTime(s.timestamp)})_\n${s.content}\n`)
        .join("\n");

      const blob = new Blob([header + body], { type: "text/markdown;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `transcript_meeting_${meetingId}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast("Transcript exported successfully", "success");
    } catch {
      toast("Failed to export transcript", "error");
    }
  };

  // Add Comment API call
  const handleAddComment = async (segmentId: number) => {
    if (!commentText.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/meetings/${meetingId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment_id: segmentId,
          text: commentText,
          author: "User",
        }),
      });

      if (!res.ok) throw new Error();

      setCommentText("");
      setActiveCommentBox(null);
      onRefreshMeeting();
      toast("Comment added", "success");
    } catch {
      toast("Failed to add comment", "error");
    }
  };

  // Toggle Highlight API call
  const handleToggleHighlight = async (segmentId: number, color: string) => {
    try {
      await fetch(`${API_BASE}/api/meetings/${meetingId}/highlights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment_id: segmentId,
          color,
        }),
      });

      setActiveHighlightPicker(null);
      onRefreshMeeting();
      toast("Highlight toggled", "success");
    } catch {
      toast("Failed to update highlight", "error");
    }
  };

  // Helper function to render text with search highlights
  const renderHighlightedContent = (content: string, search: string) => {
    if (!search.trim()) return content;

    const regex = new RegExp(`(${escapeRegExp(search)})`, "gi");
    const parts = content.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark
          key={index}
          className="bg-amber-300 text-black dark:bg-amber-500/90 dark:text-white px-0.5 rounded font-semibold transition-colors"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Helper to escape regex special characters
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  // Get segment background highlighting color
  const getHighlightClass = (segmentId: number) => {
    const hl = highlights.find((h) => h.segment_id === segmentId);
    if (!hl) return "";

    switch (hl.color) {
      case "yellow":
        return "bg-yellow-500/10 border-l-2 border-yellow-500";
      case "blue":
        return "bg-blue-500/10 border-l-2 border-blue-500";
      case "green":
        return "bg-emerald-500/10 border-l-2 border-emerald-500";
      case "pink":
        return "bg-rose-500/10 border-l-2 border-rose-500";
      default:
        return "";
    }
  };

  const getSpeakerTheme = (speaker: string) => {
    const s = speaker.toLowerCase();
    if (s.includes("sarah") || s.includes("alice")) {
      return {
        bg: "bg-rose-500/10 dark:bg-rose-500/20",
        text: "text-rose-600 dark:text-rose-400",
        border: "border-rose-200 dark:border-rose-950",
      };
    } else if (s.includes("john") || s.includes("dave") || s.includes("default")) {
      return {
        bg: "bg-blue-500/10 dark:bg-blue-500/20",
        text: "text-blue-600 dark:text-blue-400",
        border: "border-blue-200 dark:border-blue-950",
      };
    }
    return {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-950",
    };
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-card border border-border rounded-xl shadow-sm overflow-hidden transition-colors">

      {/* Panel Toolbar Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0 bg-muted-bg/10">
        <h3 className="font-bold text-base flex items-center gap-2">
          Transcript
          <span className="text-xs bg-muted-bg text-muted px-2 py-0.5 rounded-full font-semibold">
            {segments.length} segments
          </span>
        </h3>

        <div className="flex items-center gap-2">
          {/* Search Transcript */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search transcript..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 bg-muted-bg/50 border border-border text-xs rounded-full focus:border-primary focus:bg-card focus:outline-none transition-all w-48 text-foreground"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-2 hover:bg-muted-bg rounded text-muted hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Export Button */}
          <button
            onClick={exportToMarkdown}
            className="p-1.5 bg-muted-bg hover:bg-border text-muted hover:text-foreground rounded-lg transition-colors border border-transparent hover:border-border cursor-pointer"
            title="Export to Markdown"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Transcript Scroll Area */}
      <div
        ref={listContainerRef}
        onWheel={() => {
          autoScrollEnabled.current = false;
        }}
        onMouseEnter={() => {
          autoScrollEnabled.current = false;
        }}
        onMouseLeave={() => {
          autoScrollEnabled.current = true;
        }}
        className="flex-1 overflow-y-auto p-6 space-y-5"
      >
        {segments.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted">No transcript segments available.</div>
        ) : (
          segments.map((s) => {
            const isHighlighted = getHighlightClass(s.id);
            const isActive = s.id === activeSegmentId;
            const segmentComments = comments.filter((c) => c.segment_id === s.id);
            const segmentHighlight = highlights.find((h) => h.segment_id === s.id);
            const speakerTheme = getSpeakerTheme(s.speaker);

            return (
              <div
                key={s.id}
                ref={(el) => {
                  if (el) segmentRefs.current.set(s.id, el);
                  else segmentRefs.current.delete(s.id);
                }}
                className={`group/item relative flex gap-4 p-4 rounded-xl border transition-all duration-200 ${isActive
                    ? "bg-primary/5 dark:bg-primary/10 border border-primary/20 border-l-4 border-l-primary"
                    : "border-transparent hover:bg-muted-bg/20 hover:border-border"
                  } ${isHighlighted}`}
              >
                {/* Speaker Avatar Bubble */}
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${speakerTheme.bg} ${speakerTheme.text} border ${speakerTheme.border} select-none`}>
                    {s.speaker.charAt(0).toUpperCase()}
                  </div>
                </div>

                {/* Content Block */}
                <div className="flex-1 min-w-0">
                  {/* Speaker & Timestamp header */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        onClick={() => handleSegmentClick(s.timestamp)}
                        className={`font-bold text-xs cursor-pointer ${speakerTheme.text} hover:opacity-85 transition-opacity`}
                      >
                        {s.speaker}
                      </span>
                      <button
                        onClick={() => handleSegmentClick(s.timestamp)}
                        className="text-[10px] text-muted hover:text-primary font-mono cursor-pointer transition-colors"
                        title="Click to seek"
                      >
                        {formatTime(s.timestamp)}
                      </button>
                    </div>

                    {/* Inline annotations toolbar (Visible on hover) */}
                    <div className="opacity-0 group-hover/item:opacity-100 flex items-center gap-1.5 transition-all">
                      {/* Highlight icon */}
                      <button
                        onClick={() => setActiveHighlightPicker(activeHighlightPicker === s.id ? null : s.id)}
                        className={`p-1 rounded text-muted hover:text-primary hover:bg-muted-bg transition-colors ${segmentHighlight ? "text-primary bg-primary/10" : ""
                          }`}
                        title="Highlight Segment"
                      >
                        <Highlighter className="w-3.5 h-3.5" />
                      </button>

                      {/* Comment icon */}
                      <button
                        onClick={() => {
                          setActiveCommentBox(activeCommentBox === s.id ? null : s.id);
                          setCommentText("");
                        }}
                        className="p-1 rounded text-muted hover:text-primary hover:bg-muted-bg transition-colors"
                        title="Add Comment"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Content Text */}
                  <p
                    onClick={() => handleSegmentClick(s.timestamp)}
                    className={`text-sm leading-relaxed cursor-pointer font-light transition-colors ${isActive ? "text-foreground font-normal" : "text-muted hover:text-foreground"
                      }`}
                  >
                    {renderHighlightedContent(s.content, searchTerm)}
                  </p>

                  {/* Multi-color Highlight Picker Overlay */}
                  {activeHighlightPicker === s.id && (
                    <div className="absolute right-6 top-6 bg-card border border-border rounded-lg shadow-xl p-2 flex gap-1.5 z-10 animate-in fade-in zoom-in-95 duration-100">
                      {["yellow", "blue", "green", "pink"].map((color) => (
                        <button
                          key={color}
                          onClick={() => handleToggleHighlight(s.id, color)}
                          className={`w-5 h-5 rounded-full ring-offset-2 hover:scale-110 transition-transform ${color === "yellow"
                              ? "bg-yellow-400"
                              : color === "blue"
                                ? "bg-blue-400"
                                : color === "green"
                                  ? "bg-emerald-400"
                                  : "bg-rose-400"
                            } ${segmentHighlight?.color === color
                              ? "ring-2 ring-primary"
                              : ""
                            }`}
                        />
                      ))}
                      {segmentHighlight && (
                        <button
                          onClick={() => handleToggleHighlight(s.id, segmentHighlight.color)}
                          className="text-[10px] text-rose-500 font-semibold px-1 py-0.5 rounded hover:bg-rose-500/10 ml-1 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}

                  {/* Inline Comments list */}
                  {segmentComments.length > 0 && (
                    <div className="mt-3 pl-3 border-l-2 border-primary/20 space-y-2">
                      {segmentComments.map((c) => (
                        <div key={c.id} className="text-xs bg-muted-bg/25 border border-border/40 p-2.5 rounded-lg">
                          <div className="flex justify-between items-center mb-1 text-muted">
                            <span className="font-semibold text-primary">{c.author}</span>
                            <span className="text-[9px]">{new Date(c.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-foreground leading-normal font-light italic">
                            &ldquo;{c.text}&rdquo;
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline Add Comment Input box */}
                  {activeCommentBox === s.id && (
                    <div className="mt-3 flex gap-2 animate-in slide-in-from-top-1 duration-150">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddComment(s.id);
                        }}
                        className="flex-1 px-3 py-1.5 bg-muted-bg text-xs rounded-lg border border-transparent focus:border-primary focus:outline-none text-foreground"
                      />
                      <button
                        onClick={() => handleAddComment(s.id)}
                        className="px-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg flex items-center justify-center transition-colors"
                      >
                        <Send className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setActiveCommentBox(null)}
                        className="p-1.5 hover:bg-muted-bg rounded-lg border border-transparent text-muted hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
