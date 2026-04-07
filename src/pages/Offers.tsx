import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { cn } from '../utils/cn';

export function Offers() {
  const { pamphletImages, fetchPamphletImages } = useAppStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [direction, setDirection] = useState(0);
  const [lastTap, setLastTap] = useState(0);
  
  useEffect(() => {
    fetchPamphletImages();
  }, [fetchPamphletImages]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.5, 1));
  const handleReset = () => setScale(1);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      if (scale > 1) handleReset();
      else setScale(2);
    }
    setLastTap(now);
  };

  const paginate = (newDirection: number) => {
    const nextIndex = currentIndex + newDirection;
    if (nextIndex >= 0 && nextIndex < pamphletImages.length) {
      setDirection(newDirection);
      setCurrentIndex(nextIndex);
      handleReset();
    }
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  if (pamphletImages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 min-h-[70vh]">
        <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center text-stone-300">
          <span className="material-symbols-outlined text-4xl">upcoming</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-on-surface">Nenhum panfleto disponível</h2>
          <p className="text-secondary text-sm mt-2">Fique de olho! Novas ofertas chegam em breve.</p>
        </div>
      </div>
    );
  }

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  return (
    <div className="flex flex-col h-full bg-surface-container-lowest">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-outline-variant/10 pt-safe">
        <div className="px-6 h-16 flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-lg font-black tracking-tight text-on-surface">Ofertas</h1>
            <p className="text-[10px] text-primary font-black uppercase tracking-widest">Página {currentIndex + 1} de {pamphletImages.length}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleZoomOut} className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface active-scale shadow-sm">
              <span className="material-symbols-outlined text-[20px]">zoom_out</span>
            </button>
            <button onClick={handleZoomIn} className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20 active-scale">
              <span className="material-symbols-outlined text-[20px]">zoom_in</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative bg-stone-100 flex items-center justify-center touch-none">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = swipePower(offset.x, velocity.x);

              if (swipe < -swipeConfidenceThreshold) {
                paginate(1);
              } else if (swipe > swipeConfidenceThreshold) {
                paginate(-1);
              }
            }}
            transition={{
              x: { type: "spring", stiffness: 350, damping: 40 },
              opacity: { duration: 0.2 }
            }}
            onPointerDown={handleDoubleTap}
            className="absolute w-full h-full flex items-center justify-center p-4 cursor-grab active:cursor-grabbing"
          >
            <motion.div
              animate={{ scale }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative shadow-2xl rounded-2xl overflow-hidden origin-center max-w-full max-h-full"
            >
              <img 
                src={pamphletImages[currentIndex].url} 
                alt={`Página ${currentIndex + 1}`} 
                className="max-w-full max-h-[75vh] object-contain pointer-events-none select-none"
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {currentIndex > 0 && (
          <button 
            onClick={() => paginate(-1)}
            className="absolute left-4 z-10 w-12 h-12 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-premium active-scale transition-all border border-outline-variant/5"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
        )}
        
        {currentIndex < pamphletImages.length - 1 && (
          <button 
            onClick={() => paginate(1)}
            className="absolute right-4 z-10 w-12 h-12 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-premium active-scale transition-all border border-outline-variant/5"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        )}

        {/* Indicators */}
        <div className="absolute bottom-8 flex gap-2 items-center px-4 py-2 bg-black/5 backdrop-blur-md rounded-full border border-white/20">
          {pamphletImages.map((_, i) => (
            <motion.div 
              key={i} 
              animate={{
                width: i === currentIndex ? 24 : 6,
                backgroundColor: i === currentIndex ? "var(--color-primary)" : "rgba(var(--color-primary-rgb), 0.2)"
              }}
              className="h-1.5 rounded-full transition-colors duration-300"
              style={{
                backgroundColor: i === currentIndex ? "var(--primary)" : "rgba(var(--color-primary-rgb), 0.2)"
              }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
