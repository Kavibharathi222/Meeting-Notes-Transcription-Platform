"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Bell, Plus, Video, MessageSquare, CheckSquare, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

interface SearchResultMeeting {
  id: number;
  title: string;
  date: string;
}

interface SearchResultSegment {
  id: number;
  meeting_id: number;
  speaker: string;
  timestamp: number;
  content: string;
}

interface SearchResultActionItem {
  id: number;
  meeting_id: number;
  task: string;
  completed: boolean;
}

export default function Navbar({ onAddMeeting }: { onAddMeeting?: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    meetings: SearchResultMeeting[];
    segments: SearchResultSegment[];
    action_items: SearchResultActionItem[];
  }>({ meetings: [], segments: [], action_items: [] });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search query
  useEffect(() => {
    if (!query.trim()) {
      Promise.resolve().then(() => {
        setResults({ meetings: [], segments: [], action_items: [] });
        setLoading(false);
      });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:8000/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error("Error searching:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleResultClick = (meetingId: number, timestamp?: number) => {
    setIsOpen(false);
    setQuery("");
    if (timestamp !== undefined) {
      router.push(`/meetings/${meetingId}?t=${timestamp}`);
    } else {
      router.push(`/meetings/${meetingId}`);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const hasResults = results.meetings.length > 0 || results.segments.length > 0 || results.action_items.length > 0;

  return (
    <header className="h-16 flex items-center justify-between px-8 sticky top-0 z-40 transition-all duration-300 glass"
      style={{ borderBottom: "1px solid var(--border)" }}>
      {/* Left: Path/Workspace Name */}
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-bold tracking-widest uppercase ff-gradient-text">Workspace Library</h1>
      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-xl mx-8 relative" ref={dropdownRef}>
        <div className="relative flex items-center w-full">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search meetings, transcripts, and tasks..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="ff-input w-full pl-10 pr-12 py-2 text-sm rounded-full focus:outline-none transition-all"
            style={{ color: "var(--foreground)" }}
          />
          {loading ? (
            <div className="absolute right-3.5 top-2.5 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <kbd className="absolute right-3.5 top-2.5 flex items-center h-5 select-none rounded border border-border bg-card px-1.5 font-mono text-[10px] font-medium text-muted pointer-events-none">
              /
            </kbd>
          )}
        </div>

        {/* Dropdown Results */}
        {isOpen && query.trim() && (
          <div className="absolute top-12 left-0 right-0 max-h-[450px] overflow-y-auto rounded-2xl z-50 p-4 animate-fade-in-up glass"
            style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
            {!hasResults && !loading && (
              <div className="text-center py-6 text-sm text-muted">
                No matching results found for <span className="font-semibold text-foreground">&ldquo;{query}&rdquo;</span>
              </div>
            )}

            {/* Meetings Section */}
            {results.meetings.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-muted tracking-wider uppercase mb-2 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-primary" />
                  Meetings ({results.meetings.length})
                </h3>
                <div className="space-y-1">
                  {results.meetings.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleResultClick(m.id)}
                      className="w-full text-left p-2 hover:bg-muted-bg rounded-md text-sm transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-medium text-foreground">{m.title}</span>
                      <span className="text-xs text-muted">{m.date}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Transcript Segments Section */}
            {results.segments.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-muted tracking-wider uppercase mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                  Transcripts ({results.segments.length})
                </h3>
                <div className="space-y-1">
                  {results.segments.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleResultClick(s.meeting_id, s.timestamp)}
                      className="w-full text-left p-2 hover:bg-muted-bg rounded-md text-sm transition-colors cursor-pointer"
                    >
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-semibold text-xs text-primary">{s.speaker}</span>
                        <span className="text-[10px] bg-muted-bg px-1.5 py-0.5 rounded font-mono text-muted flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {formatTime(s.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-muted line-clamp-2 italic font-light">
                        &ldquo;{s.content}&rdquo;
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Items Section */}
            {results.action_items.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted tracking-wider uppercase mb-2 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-success" />
                  Action Items ({results.action_items.length})
                </h3>
                <div className="space-y-1">
                  {results.action_items.map((ai) => (
                    <button
                      key={ai.id}
                      onClick={() => handleResultClick(ai.meeting_id)}
                      className="w-full text-left p-2 hover:bg-muted-bg rounded-md text-sm transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className={`font-medium text-xs flex-1 ${ai.completed ? 'line-through text-muted' : 'text-foreground'}`}>
                        {ai.task}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ml-2 font-semibold ${
                        ai.completed ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                      }`}>
                        {ai.completed ? "Completed" : "Todo"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Actions & User */}
      <div className="flex items-center gap-4">
        {onAddMeeting && (
          <button
            onClick={onAddMeeting}
            className="ff-btn flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-full cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Meeting</span>
          </button>
        )}

        {/* Notifications Icon */}
        <button className="p-2 rounded-full relative transition-all cursor-pointer hover:scale-110"
          style={{ color: "var(--muted)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--primary-light)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full animate-pulse-glow"
            style={{ background: "var(--primary)" }}></span>
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white cursor-pointer hover:scale-105 transition-transform"
          style={{ background: "var(--grad-btn)", boxShadow: "var(--shadow-glow)" }}>
          U
        </div>
      </div>
    </header>
  );
}
