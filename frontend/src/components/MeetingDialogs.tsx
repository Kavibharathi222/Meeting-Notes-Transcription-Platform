"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, Users, Plus, Trash2 } from "lucide-react";
import { useToast } from "./Providers";
import API_BASE from "@/lib/api";

interface MeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  meetingId?: number; // Provided for Edit mode
  mode: "create" | "edit" | "delete";
}

export default function MeetingDialogs({
  isOpen,
  onClose,
  onSuccess,
  meetingId,
  mode,
}: MeetingDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [participantsText, setParticipantsText] = useState("");
  const [summary, setSummary] = useState("");
  const [topicsText, setTopicsText] = useState("");
  const [actionItemsText, setActionItemsText] = useState("");
  const [transcriptRaw, setTranscriptRaw] = useState("");
  const [entryMethod, setEntryMethod] = useState<"form" | "paste">("form");

  // Fetch meeting data if editing
  useEffect(() => {
    if (isOpen && mode === "edit" && meetingId) {
      Promise.resolve().then(() => setLoading(true));
      fetch(`${API_BASE}/api/meetings/${meetingId}`)
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data) => {
          setTitle(data.title);
          setDate(data.date);
          setDurationMinutes(Math.round(data.duration / 60));
          setParticipantsText(data.participants.map((p: { name: string }) => p.name).join(", "));
          setLoading(false);
        })
        .catch(() => {
          toast("Failed to load meeting details", "error");
          onClose();
          setLoading(false);
        });
    } else if (isOpen && mode === "create") {
      // Reset form fields
      Promise.resolve().then(() => {
        setTitle("");
        setDate(new Date().toISOString().split("T")[0]);
        setDurationMinutes(30);
        setParticipantsText("");
        setSummary("");
        setTopicsText("");
        setActionItemsText("");
        setTranscriptRaw("");
        setEntryMethod("form");
      });
    }
  }, [isOpen, mode, meetingId, onClose, toast]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const participants = participantsText
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const topics = topicsText
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const actionItems = actionItemsText
      .split("\n")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    try {
      if (mode === "create") {
        const payload = {
          title,
          date,
          duration: durationMinutes * 60,
          participants,
          summary: summary || null,
          topics: topics.length > 0 ? topics : null,
          action_items: actionItems.length > 0 ? actionItems : null,
          transcript_raw: transcriptRaw || null,
        };

        const res = await fetch(`${API_BASE}/api/meetings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error();
        toast("Meeting created successfully", "success");
      } else if (mode === "edit" && meetingId) {
        const payload = {
          title,
          date,
          duration: durationMinutes * 60,
          participants,
        };

        const res = await fetch(`${API_BASE}/api/meetings/${meetingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error();
        toast("Meeting updated successfully", "success");
      } else if (mode === "delete" && meetingId) {
        const res = await fetch(`${API_BASE}/api/meetings/${meetingId}`, {
          method: "DELETE",
        });

        if (!res.ok) throw new Error();
        toast("Meeting deleted successfully", "success");
      }
      onSuccess();
      onClose();
    } catch {
      toast(`Failed to ${mode} meeting`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-foreground">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2 select-none">
            {mode === "create" && <Plus className="w-5 h-5 text-primary" />}
            {mode === "edit" && <Clock className="w-5 h-5 text-primary" />}
            {mode === "delete" && <Trash2 className="w-5 h-5 text-danger" />}
            {mode === "create" && "Create New Meeting"}
            {mode === "edit" && "Edit Meeting Metadata"}
            {mode === "delete" && "Delete Meeting"}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-muted-bg rounded-lg transition-colors text-muted hover:text-foreground cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {loading && mode !== "delete" ? (
          <div className="flex-1 py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-muted">Loading meeting details...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-col flex flex-1 overflow-hidden">
            {mode === "delete" ? (
              <div className="p-6 space-y-4">
                <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-xl text-sm flex gap-3 leading-relaxed">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <span className="font-semibold block mb-1">Warning: Permanent Deletion</span>
                    This action will permanently delete this meeting from your workspace, including its summary, transcripts, annotations, and action items. This operation cannot be undone.
                  </div>
                </div>
                <p className="text-sm text-foreground">
                  Are you absolutely sure you want to delete this meeting?
                </p>
              </div>
            ) : (
              <div className="p-6 overflow-y-auto space-y-4 text-sm max-h-[60vh]">
                
                {/* Method selector for Create */}
                {mode === "create" && (
                  <div className="flex bg-muted-bg/50 border border-border p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setEntryMethod("form")}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        entryMethod === "form" ? "bg-card text-primary shadow-sm border border-border/10" : "text-muted hover:text-foreground"
                      }`}
                    >
                      Structured Form
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryMethod("paste")}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        entryMethod === "paste" ? "bg-card text-primary shadow-sm border border-border/10" : "text-muted hover:text-foreground"
                      }`}
                    >
                      Paste Transcript
                    </button>
                  </div>
                )}

                {/* Grid Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5 select-none">Meeting Title</label>
                    <input
                      type="text"
                      required
                      placeholder="Product Launch Sync, etc."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3.5 py-2 bg-muted-bg/40 border border-border rounded-lg focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/10 transition-all text-foreground text-sm focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5 select-none">Date</label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-muted absolute left-3 top-2.5" />
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-muted-bg/40 border border-border rounded-lg focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/10 transition-all text-foreground text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5 select-none">Duration (Minutes)</label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-muted absolute left-3 top-2.5" />
                      <input
                        type="number"
                        min="1"
                        required
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                        className="w-full pl-9 pr-3 py-2 bg-muted-bg/40 border border-border rounded-lg focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/10 transition-all text-foreground text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5 select-none">Participants (Comma separated)</label>
                    <div className="relative">
                      <Users className="w-4 h-4 text-muted absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="John Doe, Sarah Smith, Dave Jones"
                        value={participantsText}
                        onChange={(e) => setParticipantsText(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-muted-bg/40 border border-border rounded-lg focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/10 transition-all text-foreground text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional form sections if Create (Form Method) */}
                {mode === "create" && entryMethod === "form" && (
                  <div className="space-y-4 border-t border-border pt-4">
                    <div>
                      <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5 select-none">AI Summary Notes</label>
                      <textarea
                        placeholder="Provide a general summary of the meeting..."
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        rows={3}
                        className="w-full px-3.5 py-2 bg-muted-bg/40 border border-border rounded-lg focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/10 transition-all text-foreground text-sm focus:outline-none resize-none leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5 select-none">Key Topics (Comma separated)</label>
                      <input
                        type="text"
                        placeholder="Design Layout, Tech Stack, Roadmap"
                        value={topicsText}
                        onChange={(e) => setTopicsText(e.target.value)}
                        className="w-full px-3.5 py-2 bg-muted-bg/40 border border-border rounded-lg focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/10 transition-all text-foreground text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5 select-none">Action Items (One task per line)</label>
                      <textarea
                        placeholder="Complete dashboard integration&#10;Verify stripe webhook endpoints&#10;Deploy code to staging"
                        value={actionItemsText}
                        onChange={(e) => setActionItemsText(e.target.value)}
                        rows={3}
                        className="w-full px-3.5 py-2 bg-muted-bg/40 border border-border rounded-lg focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/10 transition-all text-foreground text-sm focus:outline-none resize-none leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center justify-between select-none">
                        <span>Pasted Transcript Text</span>
                        <span className="text-[10px] text-primary font-bold lowercase tracking-normal bg-primary/10 px-1.5 py-0.5 rounded">
                          auto-detects timestamps & speakers
                        </span>
                      </label>
                      <textarea
                        placeholder="John: Welcome everyone.&#10;[00:15] Sarah: Thanks for coming."
                        value={transcriptRaw}
                        onChange={(e) => setTranscriptRaw(e.target.value)}
                        rows={4}
                        className="w-full px-3.5 py-2 bg-muted-bg/40 border border-border rounded-lg focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/10 transition-all text-foreground font-mono text-xs focus:outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                {/* Paste Transcript Area if Create (Paste Method) */}
                {mode === "create" && entryMethod === "paste" && (
                  <div className="space-y-4 border-t border-border pt-4">
                    <div>
                      <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center justify-between select-none">
                        <span>Pasted Transcript Text</span>
                        <span className="text-[10px] text-primary font-bold lowercase tracking-normal bg-primary/10 px-1.5 py-0.5 rounded">
                          auto-detects timestamps & speakers
                        </span>
                      </label>
                      <textarea
                        required
                        placeholder="John: Welcome everyone.&#10;[00:15] Sarah: Thanks for coming.&#10;John: Let's discuss launch details."
                        value={transcriptRaw}
                        onChange={(e) => setTranscriptRaw(e.target.value)}
                        rows={8}
                        className="w-full px-3.5 py-2 bg-muted-bg/40 border border-border rounded-lg focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/10 transition-all text-foreground font-mono text-xs focus:outline-none resize-none leading-relaxed"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5 select-none">AI Summary Notes (Optional)</label>
                      <textarea
                        placeholder="Provide a general summary of the meeting..."
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        rows={2}
                        className="w-full px-3.5 py-2 bg-muted-bg/40 border border-border rounded-lg focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/10 transition-all text-foreground text-sm focus:outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-muted-bg/20">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 border border-border bg-card hover:bg-muted-bg/50 text-foreground text-sm font-semibold rounded-full transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-5 py-2 text-white text-sm font-semibold rounded-full shadow-sm transition-colors cursor-pointer flex items-center gap-2 ${
                  mode === "delete"
                    ? "bg-danger hover:bg-red-600"
                    : "bg-primary hover:bg-primary-hover"
                }`}
              >
                {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <span>
                  {mode === "create" && "Create Meeting"}
                  {mode === "edit" && "Save Changes"}
                  {mode === "delete" && "Delete Meeting"}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
