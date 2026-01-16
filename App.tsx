
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateSilhouetteImage, generateRandomMelody } from './services/geminiService';
import { NoteData, PlacedNote } from './types';
import { audioPlayer } from './utils/audioPlayer';
import { NOTE_NAMES } from './constants';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [placedNotes, setPlacedNotes] = useState<PlacedNote[]>([]);
  const [currentNoteIndex, setCurrentNoteIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playbackRef = useRef<boolean>(false);

  const processSilhouette = useCallback(async (imgUrl: string, melody: NoteData[]) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imgUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 500;
      canvas.height = 500;
      ctx.drawImage(img, 0, 0, 500, 500);

      const imageData = ctx.getImageData(0, 0, 500, 500);
      const data = imageData.data;
      const validSpots: { x: number, y: number }[] = [];

      const step = 15;
      for (let y = step; y < 500 - step; y += step) {
        for (let x = step; x < 500 - step; x += step) {
          const index = (y * 500 + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          
          if (r < 248 || g < 248 || b < 248) {
            validSpots.push({ x, y });
          }
        }
      }

      if (validSpots.length === 0) {
        setError("Could not trace the silk shape clearly. Please try a simpler object.");
        return;
      }

      const newPlacedNotes: PlacedNote[] = melody.map((note, idx) => {
        const spotIndex = Math.floor(Math.random() * validSpots.length);
        const spot = validSpots[spotIndex];
        if (validSpots.length > melody.length) validSpots.splice(spotIndex, 1);
        
        return {
          ...note,
          id: `note-${idx}-${Math.random()}`,
          x: spot.x,
          y: spot.y
        };
      });

      setPlacedNotes(newPlacedNotes);
    };
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    setPlacedNotes([]);
    setCurrentNoteIndex(null);
    setIsPlaying(false);
    playbackRef.current = false;

    try {
      const [imgUrl, melody] = await Promise.all([
        generateSilhouetteImage(prompt),
        generateRandomMelody(prompt)
      ]);

      if (imgUrl) {
        setImageSrc(imgUrl);
        await processSilhouette(imgUrl, melody);
      } else {
        setError("Failed to generate silk silhouette.");
      }
    } catch (err) {
      setError("An error occurred during generation.");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayback = async () => {
    if (isPlaying) {
      playbackRef.current = false;
      setIsPlaying(false);
      return;
    }

    if (placedNotes.length === 0) return;

    setIsPlaying(true);
    playbackRef.current = true;

    for (let i = 0; i < placedNotes.length; i++) {
      if (!playbackRef.current) break;
      
      setCurrentNoteIndex(i);
      const note = placedNotes[i];
      await audioPlayer.playNote(note.frequency, note.duration, note.value);
    }

    setCurrentNoteIndex(null);
    setIsPlaying(false);
    playbackRef.current = false;
  };

  return (
    <div className="container mx-auto px-4 py-12 flex flex-col items-center min-h-screen relative silk-container">
      <div className="max-w-3xl w-full text-center mb-12 relative z-10">
        <h1 className="text-6xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-orange-400 tracking-tight drop-shadow-xl">
          Prismatic Silk
        </h1>
        <p className="text-white/30 text-lg font-medium tracking-wide">
          Ethereal patterns woven with vibrant soundscapes.
        </p>
      </div>

      <div className="w-full max-w-xl bg-white/[0.03] backdrop-blur-3xl p-6 rounded-[32px] border border-white/5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] mb-8 relative z-10">
        <div className="flex gap-4">
          <input
            type="text"
            className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all placeholder:text-white/10 shadow-inner"
            placeholder="Type an object (e.g. flower, bird, dancer)..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            disabled={isLoading}
          />
          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="bg-gradient-to-tr from-cyan-600 via-purple-600 to-orange-600 hover:brightness-110 text-white px-8 py-4 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl active:scale-95"
          >
            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : "Weave"}
          </button>
        </div>
        {error && <p className="text-rose-500/60 mt-3 text-sm px-2 font-medium tracking-wide"><i className="fas fa-wind mr-2"></i>{error}</p>}
      </div>

      <div className="relative w-full max-w-[520px] aspect-square bg-white/[0.01] rounded-[100px] overflow-hidden shadow-[0_0_120px_rgba(0,0,0,0.4)] border border-white/5 flex items-center justify-center group relative z-10">
        {imageSrc ? (
          <>
            {/* Subtle atmosphere glow behind fabric */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-orange-500/10 animate-slow-glow blur-3xl"></div>

            {/* Prismatic Silk Overlay (60% opacity) with beat animation */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4 overflow-visible">
              <img 
                key={`silk-${currentNoteIndex}`}
                src={imageSrc} 
                alt="Silk Silhouette" 
                className={`w-full h-full object-contain mix-blend-screen opacity-60 scale-110 ${currentNoteIndex !== null ? 'animate-fabric-beat' : ''}`}
                style={{ 
                  filter: 'contrast(1.1) saturate(1.2) brightness(1.2)',
                }}
              />
            </div>
            
            {/* Interactive Notes - Soft glowing orbs */}
            <div className="absolute inset-0 pointer-events-none">
              {placedNotes.map((note, idx) => (
                <div
                  key={note.id}
                  style={{ 
                    left: `${note.x}px`, 
                    top: `${note.y}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute flex items-center justify-center w-8 h-8 rounded-full border border-white/20 backdrop-blur-xl transition-all duration-700
                    ${currentNoteIndex === idx 
                      ? 'bg-white text-black scale-150 z-20 shadow-[0_0_50px_rgba(255,255,255,1)] animate-jump' 
                      : 'bg-white/5 text-white/40 z-10'
                    }`}
                >
                  <span className="text-[10px] font-black">{note.value}</span>
                </div>
              ))}
            </div>
            
            <button
              onClick={togglePlayback}
              className="absolute bottom-12 bg-white/5 hover:bg-white/10 backdrop-blur-2xl text-white border border-white/10 px-14 py-4 rounded-full font-black tracking-[0.2em] uppercase text-[10px] flex items-center gap-3 transition-all z-30 shadow-2xl active:scale-90"
            >
              <i className={`fas ${isPlaying ? 'fa-stop' : 'fa-play'} ${isPlaying ? 'text-white' : 'text-cyan-400'}`}></i>
              {isPlaying ? 'Release' : 'Unveil Melody'}
            </button>
          </>
        ) : (
          <div className="text-white/10 text-center flex flex-col items-center gap-10 p-12">
            {isLoading ? (
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                   <div className="w-24 h-24 border border-white/5 border-t-purple-500/50 rounded-full animate-spin"></div>
                   <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 bg-gradient-to-tr from-cyan-500/10 to-orange-500/10 rounded-full animate-pulse"></div>
                   </div>
                </div>
                <p className="animate-pulse tracking-[0.3em] uppercase text-[9px] font-black text-purple-400/50">Warping Silk...</p>
              </div>
            ) : (
              <>
                <div className="w-32 h-32 rounded-full bg-white/[0.02] flex items-center justify-center border border-white/[0.02] group-hover:scale-105 transition-transform duration-1000">
                  <i className="fas fa-wind text-6xl opacity-20"></i>
                </div>
                <p className="max-w-[280px] leading-relaxed text-[9px] font-black text-white/20 tracking-[0.3em] uppercase">Enter words to weave prismatic form.</p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-20 w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-12 px-4 relative z-10 opacity-60">
        <div className="text-center group">
          <h3 className="text-white/80 font-black mb-3 text-sm tracking-widest uppercase">Ethereal Form</h3>
          <p className="text-[10px] text-white/30 leading-loose font-medium tracking-wider">
            Silk-inspired chiffon patterns traced from your imagination.
          </p>
        </div>
        <div className="text-center group">
          <h3 className="text-white/80 font-black mb-3 text-sm tracking-widest uppercase">Prismatic core</h3>
          <p className="text-[10px] text-white/30 leading-loose font-medium tracking-wider">
            Deep gradients of cyan and violet emerging from the void.
          </p>
        </div>
        <div className="text-center group">
          <h3 className="text-white/80 font-black mb-3 text-sm tracking-widest uppercase">Fluid Sound</h3>
          <p className="text-[10px] text-white/30 leading-loose font-medium tracking-wider">
            Melodic sequences embedded within digital silk folds.
          </p>
        </div>
      </div>

      <footer className="mt-32 pb-16 text-white/5 text-[9px] tracking-[0.8em] uppercase font-black text-center">
        Fluid Audio-Visual Narratives
      </footer>
    </div>
  );
};

export default App;
