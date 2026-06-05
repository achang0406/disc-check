import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

function getFocusedIndexFromScroll(track, slides) {
  const trackCenter = track.scrollLeft + track.clientWidth / 2;
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  slides.forEach((slide, index) => {
    const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
    const distance = Math.abs(slideCenter - trackCenter);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

const GameCardsCarousel = forwardRef(function GameCardsCarousel(
  { games, renderSlide, onFocusedIndexChange },
  ref,
) {
  const trackRef = useRef(null);
  const slideRefs = useRef([]);
  const programmaticScrollIndexRef = useRef(null);
  const scrollEndTimerRef = useRef(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    onFocusedIndexChange?.(focusedIndex);
  }, [focusedIndex, onFocusedIndexChange]);

  useEffect(() => {
    slideRefs.current = slideRefs.current.slice(0, games.length);
  }, [games.length]);

  const syncFocusedFromScroll = useCallback(() => {
    const track = trackRef.current;
    const slides = slideRefs.current.filter(Boolean);
    if (!track || slides.length === 0) return;

    setFocusedIndex(getFocusedIndexFromScroll(track, slides));
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || games.length === 0) return undefined;

    const handleScroll = () => {
      if (programmaticScrollIndexRef.current !== null) return;

      if (scrollEndTimerRef.current) {
        window.clearTimeout(scrollEndTimerRef.current);
      }

      syncFocusedFromScroll();

      scrollEndTimerRef.current = window.setTimeout(() => {
        scrollEndTimerRef.current = null;
        if (programmaticScrollIndexRef.current !== null) return;
        syncFocusedFromScroll();
      }, 100);
    };

    const handleScrollEnd = () => {
      if (programmaticScrollIndexRef.current !== null) {
        const index = programmaticScrollIndexRef.current;
        programmaticScrollIndexRef.current = null;
        setFocusedIndex(index);
        return;
      }
      syncFocusedFromScroll();
    };

    track.addEventListener("scroll", handleScroll, { passive: true });
    track.addEventListener("scrollend", handleScrollEnd);
    syncFocusedFromScroll();

    return () => {
      track.removeEventListener("scroll", handleScroll);
      track.removeEventListener("scrollend", handleScrollEnd);
      if (scrollEndTimerRef.current) {
        window.clearTimeout(scrollEndTimerRef.current);
      }
    };
  }, [games, syncFocusedFromScroll]);

  const scrollToSlide = useCallback((index, behavior = "smooth") => {
    const track = trackRef.current;
    const slide = slideRefs.current[index];
    if (!track || !slide) return;

    programmaticScrollIndexRef.current = index;

    slide.scrollIntoView({
      behavior,
      inline: "center",
      block: "nearest",
    });

    if (behavior !== "smooth") {
      programmaticScrollIndexRef.current = null;
      setFocusedIndex(index);
      return;
    }

    window.setTimeout(() => {
      if (programmaticScrollIndexRef.current !== index) return;
      programmaticScrollIndexRef.current = null;
      setFocusedIndex(index);
    }, 500);
  }, []);

  useImperativeHandle(ref, () => ({ scrollToSlide }), [scrollToSlide]);

  const showDots = games.length > 1;

  return (
    <div className="game-cards-carousel" role="region" aria-label="Games">
      {showDots && (
        <div className="game-cards-carousel__dots" role="tablist" aria-label="Select game">
          {games.map((game, index) => (
            <button
              key={game.id}
              type="button"
              role="tab"
              aria-selected={index === focusedIndex}
              aria-label={game.name}
              className={`game-cards-carousel__dot${
                index === focusedIndex ? " game-cards-carousel__dot--active" : ""
              }`}
              onClick={() => scrollToSlide(index)}
            />
          ))}
        </div>
      )}

      <div ref={trackRef} className="game-cards-carousel__track">
        {games.map((game, index) => {
          const isPeek = index !== focusedIndex;

          return (
            <div
              key={game.id}
              ref={(node) => {
                slideRefs.current[index] = node;
              }}
              className={`game-cards-carousel__slide${isPeek ? " game-cards-carousel__slide--peek" : ""}`}
            >
              {renderSlide(game, index)}
              {isPeek && (
                <button
                  type="button"
                  className="game-cards-carousel__focus-hit"
                  aria-label={`Show ${game.name}`}
                  onClick={() => scrollToSlide(index)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default GameCardsCarousel;
