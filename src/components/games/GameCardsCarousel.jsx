import { useCallback, useEffect, useRef, useState } from "react";

function getScrollLeftForSlide(track, slide) {
  const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
  const target = slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2;
  return Math.max(0, Math.min(target, maxScroll));
}

export default function GameCardsCarousel({ games, renderSlide }) {
  const trackRef = useRef(null);
  const slideRefs = useRef([]);
  const scrollEndTimerRef = useRef(null);
  const scrollingToIndexRef = useRef(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    slideRefs.current = slideRefs.current.slice(0, games.length);
  }, [games.length]);

  const updateFocusedFromScroll = useCallback(() => {
    const track = trackRef.current;
    const slides = slideRefs.current.filter(Boolean);
    if (!track || slides.length === 0) return;

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

    setFocusedIndex(bestIndex);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || games.length === 0) return undefined;

    const handleScroll = () => {
      if (scrollEndTimerRef.current) {
        window.clearTimeout(scrollEndTimerRef.current);
      }
      updateFocusedFromScroll();
      scrollEndTimerRef.current = window.setTimeout(() => {
        const slides = slideRefs.current.filter(Boolean);
        if (!track || slides.length === 0) return;

        if (scrollingToIndexRef.current !== null) {
          setFocusedIndex(scrollingToIndexRef.current);
          return;
        }

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

        const slide = slides[bestIndex];
        const corrected = getScrollLeftForSlide(track, slide);
        if (Math.abs(track.scrollLeft - corrected) > 2) {
          track.style.scrollSnapType = "none";
          track.scrollLeft = corrected;
          track.style.scrollSnapType = "";
        }
        setFocusedIndex(bestIndex);
      }, 80);
    };

    track.addEventListener("scroll", handleScroll, { passive: true });
    updateFocusedFromScroll();

    return () => {
      track.removeEventListener("scroll", handleScroll);
      if (scrollEndTimerRef.current) {
        window.clearTimeout(scrollEndTimerRef.current);
      }
    };
  }, [games, updateFocusedFromScroll]);

  const scrollToSlide = useCallback((index, behavior = "smooth") => {
    const track = trackRef.current;
    const slide = slideRefs.current[index];
    if (!track || !slide) return;

    const targetLeft = getScrollLeftForSlide(track, slide);

    scrollingToIndexRef.current = index;
    track.style.scrollSnapType = "none";
    track.scrollTo({ left: targetLeft, behavior });

    const finish = () => {
      track.style.scrollSnapType = "";
      const corrected = getScrollLeftForSlide(track, slide);
      if (Math.abs(track.scrollLeft - corrected) > 1) {
        track.scrollLeft = corrected;
      }
      scrollingToIndexRef.current = null;
      setFocusedIndex(index);
    };

    if (behavior === "smooth") {
      let finished = false;
      const runFinish = () => {
        if (finished) return;
        finished = true;
        finish();
      };
      track.addEventListener("scrollend", runFinish, { once: true });
      window.setTimeout(runFinish, 450);
    } else {
      finish();
    }
  }, []);

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
              style={{ animation: `fadeUp ${0.15 + index * 0.04}s ease` }}
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
}
