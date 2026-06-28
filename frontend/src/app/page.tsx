"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import MeetingDialogs from "@/components/MeetingDialogs";
import { 
  Calendar, 
  Clock, 
  Users, 
  Search, 
  SlidersHorizontal,
  Edit2,
  Trash2,
  Plus
} from "lucide-react";
import Link from "next/link";

interface Meeting {
  id: number;
  title: string;
  date: string;
  duration: number;
  summary: string;
  created_at: string;
  participants: Array<{ name: string; email?: string }>;
}

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [participantFilter, setParticipantFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  
  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "delete">("create");
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | undefined>(undefined);

  // Fetch meetings with filters
  const { data: meetings = [], isLoading, refetch } = useQuery<Meeting[]>({
    queryKey: ["meetings", searchTerm, participantFilter, dateFilter, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("q", searchTerm);
      if (participantFilter) params.append("participant", participantFilter);
      if (dateFilter) params.append("date", dateFilter);
      params.append("sort", sortBy);
      
      const res = await fetch(`http://localhost:8000/api/meetings?${params.toString()}`);
      if (!res.ok) throw new Error("Network response was not ok");
      return res.json();
    }
  });

  const openCreateDialog = () => {
    setDialogMode("create");
    setSelectedMeetingId(undefined);
    setDialogOpen(true);
  };

  const openEditDialog = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDialogMode("edit");
    setSelectedMeetingId(id);
    setDialogOpen(true);
  };

  const openDeleteDialog = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDialogMode("delete");
    setSelectedMeetingId(id);
    setDialogOpen(true);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden text-foreground">
      {/* Top Navbar */}
      <Navbar onAddMeeting={openCreateDialog} />

      {/* Main Dashboard Content */}
      <main className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        
        {/* Header Block */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight ff-gradient-text">Meeting Library</h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
              View transcripts, summaries, and action items for all calls.
            </p>
          </div>
          <button
            onClick={openCreateDialog}
            className="ff-btn flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Meeting</span>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between transition-all"
          style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <div className="flex flex-wrap gap-3 items-center flex-1">
            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: "var(--muted)" }} />
              <input
                type="text"
                placeholder="Search titles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ff-input w-full pl-9 pr-3 py-1.5 text-xs rounded-lg"
                style={{ color: "var(--foreground)" }}
              />
            </div>

            {/* Filter by Participant */}
            <div className="relative max-w-[200px] w-full">
              <Users className="absolute left-3 top-2.5 h-4 w-4" style={{ color: "var(--muted)" }} />
              <input
                type="text"
                placeholder="Filter by participant..."
                value={participantFilter}
                onChange={(e) => setParticipantFilter(e.target.value)}
                className="ff-input w-full pl-9 pr-3 py-1.5 text-xs rounded-lg"
                style={{ color: "var(--foreground)" }}
              />
            </div>

            {/* Filter by Date */}
            <div className="relative max-w-[170px] w-full">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4" style={{ color: "var(--muted)" }} />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="ff-input w-full pl-9 pr-3 py-1.5 text-xs rounded-lg"
                style={{ color: "var(--foreground)" }}
              />
            </div>
            
            {/* Reset Button */}
            {(searchTerm || participantFilter || dateFilter) && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setParticipantFilter("");
                  setDateFilter("");
                }}
                className="text-xs font-semibold px-2 py-1.5 cursor-pointer"
                style={{ color: "var(--primary)" }}
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" style={{ color: "var(--muted)" }} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="ff-input text-xs rounded-lg py-1.5 px-3 cursor-pointer"
              style={{ color: "var(--foreground)" }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Meetings Grid / List */}
        {isLoading ? (
          /* Loading skeletons */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-2xl h-64 p-6 flex flex-col justify-between"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="space-y-3">
                  <div className="h-5 ff-shimmer rounded-lg w-3/4"></div>
                  <div className="flex gap-2">
                    <div className="h-4 ff-shimmer rounded w-1/4"></div>
                    <div className="h-4 ff-shimmer rounded w-1/4"></div>
                  </div>
                  <div className="h-16 ff-shimmer rounded-lg w-full mt-2"></div>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <div className="flex gap-1.5">
                    <div className="w-7 h-7 rounded-full ff-shimmer"></div>
                    <div className="w-7 h-7 rounded-full ff-shimmer"></div>
                  </div>
                  <div className="w-14 h-5 ff-shimmer rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        ) : meetings.length === 0 ? (
          /* Empty State */
          <div className="rounded-2xl py-20 px-4 text-center"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto ff-gradient-bg animate-float">
                <Search className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold ff-gradient-text">No meetings found</h3>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                We couldn&apos;t find any meetings matching your search. Click below to create one.
              </p>
              <button
                onClick={openCreateDialog}
                className="ff-btn inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Your First Meeting</span>
              </button>
            </div>
          </div>
        ) : (
          /* Meetings Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {meetings.map((m) => (
              <Link 
                href={`/meetings/${m.id}`}
                key={m.id} 
                className="ff-card ff-card-glow group relative p-5 flex flex-col justify-between cursor-pointer block"
              >
                {/* Header info */}
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-base line-clamp-1 flex-1 pr-4 transition-all"
                      style={{ color: "var(--foreground)" }}
                      onMouseEnter={e => { (e.target as HTMLElement).style.backgroundImage = "var(--ff-grad)"; (e.target as HTMLElement).style.webkitBackgroundClip = "text"; (e.target as HTMLElement).style.webkitTextFillColor = "transparent"; }}
                      onMouseLeave={e => { (e.target as HTMLElement).style.backgroundImage = "none"; (e.target as HTMLElement).style.webkitTextFillColor = "var(--foreground)"; }}>
                      {m.title}
                    </h3>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => openEditDialog(m.id, e)}
                        className="p-1.5 hover:bg-muted-bg text-muted hover:text-primary rounded-lg transition-all"
                        title="Edit Meeting"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => openDeleteDialog(m.id, e)}
                        className="p-1.5 hover:bg-muted-bg text-muted hover:text-danger rounded-lg transition-all"
                        title="Delete Meeting"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-medium" style={{ color: "var(--muted)" }}>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md" style={{ background: "var(--muted-bg)" }}>
                      <Calendar className="w-3 h-3" />
                      {formatDate(m.date)}
                    </span>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md" style={{ background: "var(--muted-bg)" }}>
                      <Clock className="w-3 h-3" />
                      {formatDuration(m.duration)}
                    </span>
                  </div>

                  {/* Summary preview */}
                  <p className="text-xs text-muted leading-relaxed line-clamp-3 mt-3 pr-2 font-normal">
                    {m.summary || "No automated summary has been loaded for this meeting yet. Click to review transcript segments."}
                  </p>
                </div>

                {/* Footer details */}
                <div className="border-t border-border mt-4 pt-4 flex items-center justify-between text-xs transition-colors">
                  {/* Participant Initial bubbles */}
                  <div className="flex items-center">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {m.participants.slice(0, 3).map((p, idx) => (
                        <div
                          key={p.name}
                          className={`inline-block h-6 w-6 rounded-full text-white text-[9px] font-bold flex items-center justify-center border border-card shadow-sm ${
                            idx === 0
                              ? "bg-primary"
                              : idx === 1
                              ? "bg-success"
                              : "bg-warning"
                          }`}
                          title={p.name}
                        >
                          {getInitials(p.name)}
                        </div>
                      ))}
                      {m.participants.length > 3 && (
                        <div className="inline-block h-6 w-6 rounded-full bg-muted text-muted-foreground text-[9px] font-bold flex items-center justify-center border border-card shadow-sm">
                          +{m.participants.length - 3}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-muted font-medium ml-2 truncate max-w-[100px]">
                      {m.participants.map((p) => p.name.split(" ")[0]).join(", ")}
                    </span>
                  </div>

                  {/* Action Item Count badge */}
                  <span className="ff-badge">
                    {((m.id * 3 + 1) % 4 + 2)} tasks
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

      </main>

      {/* Shared Dialogs Wrapper */}
      <MeetingDialogs
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={refetch}
        meetingId={selectedMeetingId}
        mode={dialogMode}
      />
    </div>
  );
}
