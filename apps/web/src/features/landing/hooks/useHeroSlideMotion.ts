import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function useHeroSlideMotion(slideId: string, direction: 1 | -1, reducedMotion: boolean): void {
  const previousSlideId = useRef<string | null>(null);

  useEffect(() => {
    const image = document.getElementById(`hero-image-${slideId}`);
    const copy = document.getElementById("hero-copy-active");
    if (!image || !copy) return undefined;

    const previousId = previousSlideId.current;
    previousSlideId.current = slideId;
    const previousImage = previousId ? document.getElementById(`hero-image-${previousId}`) : null;
    const allImages = gsap.utils.toArray<HTMLElement>("[id^='hero-image-']");

    if (reducedMotion || !previousImage || previousImage === image) {
      gsap.set(allImages, { xPercent: 0, opacity: 0 });
      gsap.set(image, { xPercent: 0, opacity: 1 });
      gsap.set(copy, { opacity: 1, y: 0 });
      return undefined;
    }

    gsap.set(allImages.filter((candidate) => candidate !== image && candidate !== previousImage), { xPercent: 0, opacity: 0 });
    gsap.set(image, { xPercent: -direction * 100, opacity: 1 });
    gsap.set(previousImage, { xPercent: 0, opacity: 1 });

    const timeline = gsap.timeline();
    timeline.to(image, { xPercent: 0, duration: 0.85, ease: "power3.inOut" }, 0);
    timeline.to(previousImage, {
      xPercent: direction * 100,
      duration: 0.85,
      ease: "power3.inOut",
      onComplete: () => gsap.set(previousImage, { xPercent: 0, opacity: 0 }),
    }, 0);
    timeline.fromTo(copy, { opacity: 0, x: -direction * 18 }, { opacity: 1, x: 0, duration: 0.65, ease: "power3.out" }, 0.1);

    return () => { timeline.kill(); };
  }, [direction, reducedMotion, slideId]);
}
