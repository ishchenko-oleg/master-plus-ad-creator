import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Download, Maximize } from 'lucide-react';

interface ResultPlayerProps {
  videoUrl: string;
  audioFile: File | null;
}

export const ResultPlayer: React.FC<ResultPlayerProps> = ({ videoUrl, audioFile }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioFile]);

  // Sync play/pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
    } else {
      videoRef.current.play();
      if (audioRef.current) {
        audioRef.current.currentTime = videoRef.current.currentTime % audioRef.current.duration;
        audioRef.current.play();
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleVideoEnded = () => {
    // Loop effect: when video ends, restart both
    if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    } else if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };
  
  const handleFullscreen = () => {
      if (videoRef.current) {
          if (videoRef.current.requestFullscreen) {
              videoRef.current.requestFullscreen();
          } else if ((videoRef.current as any).webkitRequestFullscreen) {
              (videoRef.current as any).webkitRequestFullscreen();
          }
      }
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 mt-8">
      <div className="relative group">
        <video 
          ref={videoRef}
          src={videoUrl}
          className="w-full aspect-video object-contain bg-black"
          onEnded={handleVideoEnded}
          playsInline
          loop
        />
        {audioUrl && (
          <audio ref={audioRef} src={audioUrl} loop />
        )}

        {/* Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex gap-4">
                <button 
                    onClick={togglePlay}
                    className="p-2 bg-white text-black rounded-full hover:bg-gray-200 transition-colors"
                >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                </button>
                <button 
                    onClick={toggleMute}
                    className="p-2 text-white hover:text-brand-400 transition-colors"
                >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
            </div>
            
            <div className="flex gap-3">
                <button 
                    onClick={handleFullscreen}
                    className="p-2 text-white hover:text-brand-400 transition-colors"
                >
                    <Maximize className="w-5 h-5" />
                </button>
                <a 
                    href={videoUrl} 
                    download="master-plus-ad.mp4"
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    <Download className="w-4 h-4" />
                    <span>Завантажити</span>
                </a>
            </div>
        </div>
      </div>
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <h3 className="text-brand-600 dark:text-brand-400 font-semibold mb-1">Готово!</h3>
        <p className="text-xs text-gray-500">
          Відео згенеровано Майстер Плюс AD.
        </p>
      </div>
    </div>
  );
};