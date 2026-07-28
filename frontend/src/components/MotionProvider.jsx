import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { pageTransition } from "../animations/motion";
import { registerScrollAdapter } from "../animations/scrollManager";

export const MotionProvider = () => {
  const location = useLocation();

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return undefined;

    let context;
    let disposed = false;

    Promise.all([import("gsap")]).then(([{ gsap }]) => {
      if (disposed) return;
      context = gsap.context(() => {
        const targets = document.querySelectorAll("[data-reveal]");
        if (targets.length) pageTransition(gsap, targets);
      });
    });

    return () => {
      disposed = true;
      context?.revert();
    };
  }, [location.pathname]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return undefined;

    let locomotiveScroll;
    let ScrollTrigger;
    let disposed = false;
    let onRefresh;
    let unregisterScrollAdapter;

    Promise.all([
      import("locomotive-scroll"),
      import("gsap"),
      import("gsap/ScrollTrigger"),
    ]).then(([{ default: LocomotiveScroll }, { gsap }, scrollTriggerModule]) => {
      if (disposed) return;
      ScrollTrigger = scrollTriggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);
      locomotiveScroll = new LocomotiveScroll({
        scrollCallback: () => ScrollTrigger.update(),
        lenisOptions: {
          duration: 0.9,
          smoothWheel: true,
          syncTouch: false,
          touchMultiplier: 1,
          wheelMultiplier: 0.9,
          anchors: false,
        },
      });
      unregisterScrollAdapter = registerScrollAdapter(locomotiveScroll);
      onRefresh = () => locomotiveScroll?.resize();
      ScrollTrigger.addEventListener("refresh", onRefresh);
      ScrollTrigger.refresh();
    });

    return () => {
      disposed = true;
      if (onRefresh) ScrollTrigger?.removeEventListener("refresh", onRefresh);
      unregisterScrollAdapter?.();
      locomotiveScroll?.destroy();
    };
  }, [location.pathname]);

  return null;
};
