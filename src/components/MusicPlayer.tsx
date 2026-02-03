"use client";

import { useState, useEffect, useRef } from "react";

interface MusicPlayerProps {
  musicUrl?: string;
  onTimeUpdate?: (time: number) => void;
  performanceTitle?: string;
  audioRef?: React.RefObject<HTMLAudioElement>;
  onAudioReady?: (audio: HTMLAudioElement | null) => void;
}

export function MusicPlayer({
  musicUrl,
  onTimeUpdate,
  performanceTitle,
  audioRef: externalAudioRef,
  onAudioReady,
}: MusicPlayerProps) {
  const internalAudioRef = useRef<HTMLAudioElement>(null);
  const audioRef = externalAudioRef ?? internalAudioRef;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
    };

    const updateDuration = () => {
      setDuration(audio.duration);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("play", () => setIsPlaying(true));
    audio.addEventListener("pause", () => setIsPlaying(false));
    audio.addEventListener("ended", () => setIsPlaying(false));
    onAudioReady?.(audio);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("play", () => setIsPlaying(true));
      audio.removeEventListener("pause", () => setIsPlaying(false));
      audio.removeEventListener("ended", () => setIsPlaying(false));
      onAudioReady?.(null);
    };
  }, [audioRef, onTimeUpdate, onAudioReady]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-gray-900 text-white rounded-lg p-6 shadow-xl">
      <audio ref={audioRef} src={musicUrl} />

      <div className="mb-4">
        <h3 className="font-bold text-lg mb-1">
          {performanceTitle ? `Music for ${performanceTitle}` : "Music Player"}
        </h3>
        {!musicUrl && (
          <p className="text-sm text-gray-400">No music uploaded yet</p>
        )}
      </div>

      {musicUrl && (
        <>
          {/* Controls */}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={handlePlayPause}
              disabled={!musicUrl}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
            >
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">🔊</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => {
                  const vol = parseFloat(e.target.value);
                  setVolume(vol);
                  if (audioRef.current) audioRef.current.volume = vol;
                }}
                className="w-20 cursor-pointer"
              />
              <span className="text-xs text-gray-400 w-6">{Math.round(volume * 100)}%</span>
            </div>
          </div>

          {/* Timeline */}
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm text-gray-300 w-12 text-right">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="flex-1 cursor-pointer"
              />
              <span className="text-sm text-gray-300 w-12">
                {formatTime(duration)}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1">
              <div
                className="bg-blue-500 h-1 rounded-full transition-all"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
          </div>
        </>
      )}

      {!musicUrl && (
        <div className="text-center py-8 text-gray-400">
          <p>Upload music in the performance settings to enable playback</p>
        </div>
      )}
    </div>
  );
}
