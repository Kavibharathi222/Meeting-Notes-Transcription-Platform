"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw, RotateCw, Gauge } from "lucide-react";

interface AudioPlayerProps {
  audioUrl: string;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  seekTime: number | null;
  onSeekComplete: () => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
}

export default function AudioPlayer({
  audioUrl,
  currentTime,
  onTimeUpdate,
  isPlaying,
  setIsPlaying,
  seekTime,
  onSeekComplete,
  playbackRate,
  onPlaybackRateChange,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Handle play/pause
  useEffect(() => {
    if (!audioRef.current || !isReady) return;
    
    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        console.error("Audio playback error:", err);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, isReady, setIsPlaying]);

  // Handle external seek requests
  useEffect(() => {
    if (audioRef.current && seekTime !== null) {
      audioRef.current.currentTime = seekTime;
      onTimeUpdate(seekTime);
      onSeekComplete();
      
      // Auto-play on seek if not already playing
      if (!isPlaying) {
        setIsPlaying(true);
      }
    }
  }, [seekTime, isPlaying, onSeekComplete, onTimeUpdate, setIsPlaying]);

  // Sync volume and playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      onTimeUpdate(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsReady(true);
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      onTimeUpdate(newTime);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 transition-colors text-foreground select-none">
      
      {/* Hidden Audio Tag */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        preload="auto"
      />

      {/* Progress Timeline Slider */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-muted w-10 text-right">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentTime}
          onChange={handleScrub}
          className="flex-1 h-1 bg-muted-bg rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
        />
        <span className="text-xs font-mono text-muted w-10">
          {formatTime(duration)}
        </span>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between mt-1">
        {/* Left: Playback Rate */}
        <div className="flex items-center gap-1.5">
          <Gauge className="w-4 h-4 text-muted" />
          <select
            value={playbackRate}
            onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
            className="bg-muted-bg/40 hover:bg-muted-bg/70 border border-border text-xs font-semibold rounded px-2.5 py-1 focus:outline-none cursor-pointer text-foreground"
          >
            <option value="0.5">0.5x</option>
            <option value="1">1.0x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2.0x</option>
          </select>
        </div>

        {/* Center: Play/Pause/Skip Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={skipBackward}
            className="p-2 hover:bg-muted-bg/50 text-muted hover:text-foreground rounded-full transition-colors cursor-pointer"
            title="Rewind 10s"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          <button
            onClick={togglePlay}
            className="p-3 bg-primary hover:bg-primary-hover text-white rounded-full shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-4.5 h-4.5 fill-current" /> : <Play className="w-4.5 h-4.5 fill-current ml-0.5" />}
          </button>
          
          <button
            onClick={skipForward}
            className="p-2 hover:bg-muted-bg/50 text-muted hover:text-foreground rounded-full transition-colors cursor-pointer"
            title="Forward 10s"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Volume Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 hover:bg-muted-bg/50 text-muted hover:text-foreground rounded-full transition-colors cursor-pointer"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(parseFloat(e.target.value));
              setIsMuted(false);
            }}
            className="w-16 h-1 bg-muted-bg rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
