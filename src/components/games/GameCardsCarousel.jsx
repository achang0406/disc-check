import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

const PEEK_CLASS = "game-cards-carousel__slide--peek";
const PROGRAMMATIC_SCROLL_FALLBACK_MS = 500;
const SCROLL_SYNC_DEBOUNCE_MS = 100;

/** Viewport coordinates — offsetLeft breaks when the track breaks out to 100vw. */
function getFocusedIndexFromScroll(track, slides) {
  const trackRect = track.getBoundingClientRect();
  const trackCenter = trackRect.left + trackRect.width / 2;
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const [index, slide] of slides.entries()) {
    const slideRect = slide.getBoundingClientRect();
    const slideCenter = slideRect.left + slideRect.width / 2;
    const distance = Math.abs(slideCenter - trackCenter);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

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

  useLayoutEffect(() => {
    syncFocusedFromScroll();
  }, [games, syncFocusedFromScroll]);

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
      }, SCROLL_SYNC_DEBOUNCE_MS);
    };

    const handleScrollEnd = () => {
      if (programmaticScrollIndexRef.current !== null) {
        programmaticScrollIndexRef.current = null;
        return;
      }
      syncFocusedFromScroll();
    };

    track.addEventListener("scroll", handleScroll, { passive: true });
    track.addEventListener("scrollend", handleScrollEnd);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(syncFocusedFromScroll)
        : null;
    resizeObserver?.observe(track);

    return () => {
      track.removeEventListener("scroll", handleScroll);
      track.removeEventListener("scrollend", handleScrollEnd);
      resizeObserver?.disconnect();
      if (scrollEndTimerRef.current) {
        window.clearTimeout(scrollEndTimerRef.current);
      }
    };
  }, [games.length, syncFocusedFromScroll]);

  const scrollToSlide = useCallback((index, behavior = "smooth") => {
    const track = trackRef.current;
    const slide = slideRefs.current[index];
    if (!track || !slide) return;

    setFocusedIndex(index);
    programmaticScrollIndexRef.current = index;

    slide.scrollIntoView({
      behavior,
      inline: "center",
      block: "nearest",
    });

    if (behavior !== "smooth") {
      programmaticScrollIndexRef.current = null;
      return;
    }

    window.setTimeout(() => {
      if (programmaticScrollIndexRef.current !== index) return;
      programmaticScrollIndexRef.current = null;
    }, PROGRAMMATIC_SCROLL_FALLBACK_MS);
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
              className={`game-cards-carousel__slide${isPeek ? ` ${PEEK_CLASS}` : ""}`}
            >
              {renderSlide(game, index)}
              <button
                type="button"
                className="game-cards-carousel__focus-hit"
                tabIndex={isPeek ? 0 : -1}
                aria-hidden={!isPeek}
                aria-label={`Show ${game.name}`}
                onClick={() => scrollToSlide(index)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default GameCardsCarousel;
