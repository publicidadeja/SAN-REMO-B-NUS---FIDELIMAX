import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'motion/react';
import { Story } from '../models/types';

const HORIZONTAL_SWIPE_THRESHOLD = 70;
const VERTICAL_CLOSE_THRESHOLD = 90;
const SWIPE_VELOCITY_THRESHOLD = 500;
const AXIS_DOMINANCE_RATIO = 1.15;

export function Stories() {
  const { stories } = useAppStore();
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [storyDuration, setStoryDuration] = useState(15);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reset loading state and set initial duration when story changes
  useEffect(() => {
    setIsReady(false);
    if (activeStory) {
      // Set a default high value for video until metadata loads or 15 for image
      setStoryDuration(activeStory.type === 'video' ? 60 : 15);
    }
  }, [activeStory]);

  // Synchronize video play/pause
  useEffect(() => {
    if (activeStory?.type === 'video' && videoRef.current) {
      if (isPaused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isPaused, activeStory]);

  if (!stories || !Array.isArray(stories) || stories.length === 0) return null;

  const closeViewer = () => {
    setActiveStory(null);
    setIsPaused(false);
  };

  const handleNext = () => {
    const index = stories.findIndex(s => s.id === activeStory?.id);
    if (index < stories.length - 1) {
      setActiveStory(stories[index + 1]);
      setIsPaused(false);
    } else {
      closeViewer();
    }
  };

  const handlePrevious = () => {
    const index = stories.findIndex((story) => story.id === activeStory?.id);
    if (index > 0) {
      setActiveStory(stories[index - 1]);
      setIsPaused(false);
    }
  };

  const handleSwipeEnd = (offsetX: number, offsetY: number, velocityX: number, velocityY: number) => {
    const absX = Math.abs(offsetX);
    const absY = Math.abs(offsetY);
    const horizontalIntent =
      absX > absY * AXIS_DOMINANCE_RATIO &&
      (absX > HORIZONTAL_SWIPE_THRESHOLD || Math.abs(velocityX) > SWIPE_VELOCITY_THRESHOLD);
    const verticalIntent =
      offsetY > 0 &&
      absY > absX * AXIS_DOMINANCE_RATIO &&
      (absY > VERTICAL_CLOSE_THRESHOLD || Math.abs(velocityY) > SWIPE_VELOCITY_THRESHOLD);

    if (verticalIntent) {
      closeViewer();
      return;
    }

    if (horizontalIntent) {
      if (offsetX < 0) {
        handleNext();
      } else {
        handlePrevious();
      }
      return;
    }

    setIsPaused(false);
  };

  return (
    <>
      {/* Stories Horizontal List */}
      <div className="-mx-6 px-6 overflow-x-auto no-scrollbar">
        <div className="flex gap-4" style={{ width: 'max-content' }}>
          {stories.map((story) => (
            <div 
              key={story.id} 
              className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl p-1"
              onClick={() => {
                setActiveStory(story);
                setIsPaused(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveStory(story);
                  setIsPaused(false);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Ver story: ${story.title}`}
            >
              <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-tr from-primary to-primary-container">
                <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-surface-container">
                  {story.type === 'video' ? (
                    <video 
                      src={story.url} 
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <img 
                      src={story.url} 
                      alt={story.title} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface truncate w-20 text-center">
                {story.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Full Screen Story Viewer */}
      <AnimatePresence>
        {activeStory && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col select-none"
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            {/* Progress Bar */}
            <div
              className="absolute top-0 left-0 w-full px-4 pb-4 flex gap-1 z-[110]"
              style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
            >
              <div className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <motion.div 
                  key={activeStory.id}
                  initial={{ width: 0 }}
                  animate={(!isPaused && isReady) ? { width: "100%" } : { width: undefined }}
                  transition={{ 
                    duration: storyDuration, 
                    ease: "linear" 
                  }}
                  onAnimationComplete={() => {
                    if (!isPaused && isReady) handleNext();
                  }}
                  className="h-full bg-white"
                />
              </div>
            </div>

            {/* Header */}
            <div
              className="absolute top-0 left-0 w-full px-4 flex justify-between items-center z-[110]"
              style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)' }}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                  {activeStory.type === 'video' ? (
                    <video src={activeStory.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={activeStory.url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <span className="text-white font-medium text-sm drop-shadow-md">{activeStory.title}</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  closeViewer();
                }}
                aria-label="Fechar stories"
                className="w-12 h-12 flex items-center justify-center rounded-full bg-black/45 backdrop-blur-md text-white touch-none shadow-lg"
                data-story-action="ignore"
              >
                <span className="material-symbols-outlined text-[28px] leading-none">close</span>
              </button>
            </div>

            {/* Media Content */}
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
              {/* Blurred Background for aspect ratio gaps */}
              <div className="absolute inset-0 z-0">
                {activeStory.type === 'video' ? (
                  <video src={activeStory.url} className="w-full h-full object-cover blur-2xl opacity-40" />
                ) : (
                  <img src={activeStory.url} alt="" className="w-full h-full object-cover blur-2xl opacity-40" />
                )}
              </div>

              {/* Main Content */}
              <motion.div
                className="relative z-10 w-full h-full flex items-center justify-center touch-none"
                drag
                dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
                dragElastic={0.18}
                dragMomentum={false}
                whileDrag={{ scale: 0.985 }}
                style={{ touchAction: 'none' }}
                onDragStart={() => setIsPaused(true)}
                onDragEnd={(_, info) => {
                  handleSwipeEnd(info.offset.x, info.offset.y, info.velocity.x, info.velocity.y);
                }}
              >
                {activeStory.type === 'video' ? (
                  <video 
                    ref={videoRef}
                    src={activeStory.url} 
                    autoPlay 
                    playsInline
                    onLoadedMetadata={(e) => {
                      const dur = Math.min(e.currentTarget.duration, 60);
                      console.log('[Stories] Video loaded, duration (capped):', dur);
                      setStoryDuration(dur);
                      setIsReady(true);
                    }}
                    onEnded={() => {
                      console.log('[Stories] Video ended naturally, moving to next');
                      handleNext();
                    }}
                    className="max-w-full max-h-full object-contain shadow-2xl"
                  />
                ) : (
                  <img 
                    src={activeStory.url} 
                    alt={activeStory.title}
                    onLoad={() => {
                      setStoryDuration(15);
                      setIsReady(true);
                    }}
                    className="max-w-full max-h-full object-contain shadow-2xl"
                    referrerPolicy="no-referrer"
                  />
                )}
              </motion.div>
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none z-20" />
               
              {/* Product Link Button */}
              {activeStory.productId && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 w-[80%] max-w-[280px]"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/rewards?tab=activations`;
                      }}
                      data-story-action="ignore"
                      className="w-full bg-white text-black font-black py-4 rounded-2xl shadow-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                      <span className="material-symbols-outlined">shopping_cart</span>
                      VER PRODUTO
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
