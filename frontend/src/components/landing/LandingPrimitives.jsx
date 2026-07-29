import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronDown } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

gsap.registerPlugin(ScrollTrigger, CustomEase);
CustomEase.create("premium", "0.16,1,0.3,1");

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const Reveal = ({ children, className = "", delay = 0, direction = "up", variant = "fade", ...props }) => {
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const element = ref.current;
    const axis = direction === "left" ? { x: 34 } : direction === "right" ? { x: -34 } : { y: variant === "bottom" ? 52 : 28 };
    const initial = variant === "scale"
      ? { autoAlpha: 0, filter: "blur(8px)", scale: 0.94 }
      : variant === "rotate"
        ? { autoAlpha: 0, filter: "blur(10px)", scale: 0.96, rotation: 2.5, ...axis }
        : { autoAlpha: 0, filter: "blur(10px)", scale: 0.985, ...axis };
    const context = gsap.context(() => {
      gsap.fromTo(
        element,
        initial,
        {
          autoAlpha: 1,
          x: 0,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          duration: 0.8,
          delay,
          ease: "premium",
          scrollTrigger: {
            trigger: element,
            start: "top 88%",
            once: true,
          },
        },
      );
    }, element);
    return () => context.revert();
  }, [delay, direction, variant]);

  return <div ref={ref} className={className} {...props}>{children}</div>;
};

export const ScrollProgress = () => {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const tween = gsap.fromTo(ref.current, { scaleX: 0 }, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { start: 0, end: "max", scrub: 0.25 },
    });
    return () => tween.kill();
  }, []);
  return <div className="landing-scroll-progress" aria-hidden="true"><i ref={ref} /></div>;
};

export const HeroMotion = ({ children }) => {
  const ref = useRef(null);
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const context = gsap.context(() => {
      const title = ref.current.querySelector(".landing-hero h1");
      const words = title ? title.textContent.trim().split(/\s+/) : [];
      if (title && !title.querySelector(".hero-word")) {
        title.textContent = "";
        words.forEach((word, index) => {
          const span = document.createElement("span");
          span.className = "hero-word";
          span.textContent = word;
          if (word === "opens" || word === "doors.") span.classList.add("landing-gradient-text");
          title.append(span, index === words.length - 1 ? "" : " ");
        });
      }
      const timeline = gsap.timeline({ defaults: { ease: "premium" } });
      timeline
        .from(".landing-header", { autoAlpha: 0, y: -18, duration: 0.65 })
        .from(".hero-word", { autoAlpha: 0, yPercent: 105, rotateX: -35, stagger: 0.055, duration: 0.85 }, "-=.4")
        .from(".landing-hero__copy", { autoAlpha: 0, y: 20, duration: 0.7 }, "-=.45")
        .from(".landing-hero__actions > *", { autoAlpha: 0, y: 16, stagger: 0.09, duration: 0.55 }, "-=.42")
        .from(".landing-hero__note span", { autoAlpha: 0, y: 10, stagger: 0.05, duration: 0.45 }, "-=.3")
        .from(".product-window", { autoAlpha: 0, scale: 0.95, y: 25, duration: 1 }, "-=.45");
    }, ref);
    return () => context.revert();
  }, []);
  return <div ref={ref} className="landing-motion-root">{children}</div>;
};

export const Counter = ({ value, suffix = "", children }) => {
  const ref = useRef(null);
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const state = { value: 0 };
    const tween = gsap.to(state, {
      value,
      duration: 1.5,
      ease: "power2.out",
      scrollTrigger: { trigger: ref.current, start: "top 90%", once: true },
      onUpdate: () => { ref.current.textContent = `${Math.round(state.value).toLocaleString()}${suffix}`; },
    });
    return () => tween.kill();
  }, [suffix, value]);
  return <strong ref={ref}>{children ?? `${value}${suffix}`}</strong>;
};

export const DashboardMotion = ({ children }) => {
  const ref = useRef(null);
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const context = gsap.context(() => {
      gsap.from(".product-window__body > *, .product-cards > *", {
        autoAlpha: 0, y: 18, stagger: 0.12, duration: 0.7, ease: "premium",
        scrollTrigger: { trigger: ref.current, start: "top 82%", once: true },
      });
      gsap.from(".ai-panel__meter i", {
        scaleX: 0, transformOrigin: "left", duration: 1.2, ease: "premium",
        scrollTrigger: { trigger: ref.current, start: "top 82%", once: true },
      });
    }, ref);
    return () => context.revert();
  }, []);
  return <div ref={ref}>{children}</div>;
};

const useInterpolatedSpotlight = (ref) => {
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const element = ref.current;
    if (!element) return undefined;
    let frame;
    let active = false;
    let currentX = element.clientWidth / 2;
    let currentY = element.clientHeight / 2;
    let targetX = currentX;
    let targetY = currentY;

    const render = () => {
      currentX += (targetX - currentX) * 0.11;
      currentY += (targetY - currentY) * 0.11;
      element.style.setProperty("--spotlight-x", `${currentX}px`);
      element.style.setProperty("--spotlight-y", `${currentY}px`);
      if (active || Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
        frame = window.requestAnimationFrame(render);
      }
    };
    const enter = (event) => {
      const bounds = element.getBoundingClientRect();
      targetX = event.clientX - bounds.left;
      targetY = event.clientY - bounds.top;
      active = true;
      gsap.to(element, { "--spotlight-opacity": 1, duration: 0.38, ease: "power2.out" });
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(render);
    };
    const move = (event) => {
      const bounds = element.getBoundingClientRect();
      targetX = event.clientX - bounds.left;
      targetY = event.clientY - bounds.top;
    };
    const leave = () => {
      active = false;
      gsap.to(element, { "--spotlight-opacity": 0, duration: 0.5, ease: "power2.out" });
    };
    element.addEventListener("pointerenter", enter);
    element.addEventListener("pointermove", move, { passive: true });
    element.addEventListener("pointerleave", leave);
    return () => {
      window.cancelAnimationFrame(frame);
      element.removeEventListener("pointerenter", enter);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", leave);
      gsap.killTweensOf(element);
    };
  }, [ref]);
};

const useGsapTilt = (ref, { maxTilt = 6, float = true, floatDelay = 0, layered = true } = {}) => {
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const element = ref.current;
    if (!element) return undefined;
    const icon = element.querySelector("[class*='__icon'], .testimonial-avatar");
    const title = element.querySelector("h3");
    const copy = element.querySelector("p, blockquote");
    const action = element.querySelector("a, button");
    const rotateX = gsap.quickTo(element, "rotationX", { duration: 0.65, ease: "power3.out" });
    const rotateY = gsap.quickTo(element, "rotationY", { duration: 0.65, ease: "power3.out" });
    const layers = layered
      ? [
          [icon, 10],
          [title, 7],
          [copy, 4],
          [action, 2],
        ].filter(([target]) => target)
      : [];
    const layerSetters = layers.map(([target, depth]) => ({
      x: gsap.quickTo(target, "x", { duration: 0.55, ease: "power3.out" }),
      y: gsap.quickTo(target, "y", { duration: 0.55, ease: "power3.out" }),
      depth,
    }));
    const move = (event) => {
      const bounds = element.getBoundingClientRect();
      const normalizedX = (event.clientX - bounds.left) / bounds.width - 0.5;
      const normalizedY = (event.clientY - bounds.top) / bounds.height - 0.5;
      rotateY(normalizedX * maxTilt * 2);
      rotateX(normalizedY * maxTilt * -2);
      layerSetters.forEach((layer) => {
        layer.x(normalizedX * layer.depth);
        layer.y(normalizedY * layer.depth);
      });
    };
    const reset = () => {
      rotateX(0);
      rotateY(0);
      layerSetters.forEach((layer) => {
        layer.x(0);
        layer.y(0);
      });
      gsap.to(element, { scale: 1, duration: 0.55, ease: "elastic.out(1, 0.65)" });
    };
    const enter = () => gsap.to(element, { scale: 1.012, duration: 0.4, ease: "power2.out" });
    element.addEventListener("pointermove", move, { passive: true });
    element.addEventListener("pointerenter", enter);
    element.addEventListener("pointerleave", reset);
    const floatTween = float
      ? gsap.to(element, {
          y: -6,
          duration: 3.2 + floatDelay * 0.7,
          delay: floatDelay,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        })
      : null;
    return () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerenter", enter);
      element.removeEventListener("pointerleave", reset);
      floatTween?.kill();
      gsap.killTweensOf([element, ...layers.map(([target]) => target)]);
    };
  }, [float, floatDelay, layered, maxTilt, ref]);
};

export const Spotlight = () => {
  const ref = useRef(null);
  const cursorRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const container = ref.current;
    const hero = container?.parentElement;
    const cursor = cursorRef.current;
    if (!hero || !cursor) return undefined;
    let currentX = hero.clientWidth / 2;
    let currentY = 250;
    let targetX = currentX;
    let targetY = currentY;
    const tick = () => {
      currentX += (targetX - currentX) * 0.075;
      currentY += (targetY - currentY) * 0.075;
      gsap.set(cursor, { x: currentX, y: currentY });
    };
    const move = (event) => {
      const bounds = hero.getBoundingClientRect();
      targetX = event.clientX - bounds.left;
      targetY = event.clientY - bounds.top;
    };
    hero.addEventListener("pointermove", move, { passive: true });
    gsap.ticker.add(tick);
    const context = gsap.context(() => {
      gsap.to(".landing-spotlight__orb--one", { x: 42, y: 24, scale: 1.08, duration: 8, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to(".landing-spotlight__orb--two", { x: -32, y: 28, duration: 10, repeat: -1, yoyo: true, ease: "sine.inOut" });
    }, container);
    return () => {
      hero.removeEventListener("pointermove", move);
      gsap.ticker.remove(tick);
      context.revert();
    };
  }, []);

  return (
    <div ref={ref} className="landing-spotlight" aria-hidden="true">
      <div ref={cursorRef} className="landing-spotlight__cursor" />
      <div className="landing-spotlight__orb landing-spotlight__orb--one" />
      <div className="landing-spotlight__orb landing-spotlight__orb--two" />
      <div className="landing-grid" />
    </div>
  );
};

export const HoverCard = ({ children, className = "", floatDelay = 0 }) => {
  const ref = useRef(null);
  useInterpolatedSpotlight(ref);
  useGsapTilt(ref, { floatDelay });
  return <article ref={ref} className={`saas-card interactive-surface ${className}`.trim()}>{children}</article>;
};

export const TiltSurface = ({ children, className = "", maxTilt = 4 }) => {
  const ref = useRef(null);
  useInterpolatedSpotlight(ref);
  useGsapTilt(ref, {
    maxTilt,
    float: className.includes("product-window"),
    layered: false,
  });
  return <div ref={ref} className={`interactive-surface ${className}`.trim()}>{children}</div>;
};

export const Magnetic = ({ children, className = "" }) => {
  const ref = useRef(null);
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const element = ref.current;
    const moveX = gsap.quickTo(element, "x", { duration: 0.45, ease: "power3.out" });
    const moveY = gsap.quickTo(element, "y", { duration: 0.45, ease: "power3.out" });
    const move = (event) => {
      const bounds = element.getBoundingClientRect();
      moveX((event.clientX - bounds.left - bounds.width / 2) * 0.14);
      moveY((event.clientY - bounds.top - bounds.height / 2) * 0.14);
    };
    const enter = () => gsap.to(element, { scale: 1.03, duration: 0.35, ease: "power2.out" });
    const leave = () => gsap.to(element, { x: 0, y: 0, scale: 1, duration: 0.65, ease: "elastic.out(1, 0.6)" });
    element.addEventListener("pointermove", move, { passive: true });
    element.addEventListener("pointerenter", enter);
    element.addEventListener("pointerleave", leave);
    return () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerenter", enter);
      element.removeEventListener("pointerleave", leave);
      gsap.killTweensOf(element);
    };
  }, []);
  return <span ref={ref} className={`magnetic ${className}`.trim()}>{children}</span>;
};

export const AccordionItem = ({ question, answer, open, onToggle }) => {
  const ref = useRef(null);
  const panelRef = useRef(null);
  const chevronRef = useRef(null);
  useInterpolatedSpotlight(ref);
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const chevron = chevronRef.current;
    if (prefersReducedMotion()) {
      gsap.set(panel, { height: open ? "auto" : 0, opacity: open ? 1 : 0 });
      return undefined;
    }
    gsap.to(panel, { height: open ? "auto" : 0, opacity: open ? 1 : 0, duration: 0.35, ease: "power2.inOut" });
    gsap.to(chevron, { rotate: open ? 180 : 0, duration: 0.3, ease: "power2.out" });
    return () => gsap.killTweensOf([panel, chevron]);
  }, [open]);
  return (
    <div ref={ref} className={`faq-item interactive-surface ${open ? "is-open" : ""}`}>
      <button type="button" aria-expanded={open} onClick={onToggle}>
        <span>{question}</span>
        <span ref={chevronRef} aria-hidden="true"><ChevronDown size={19} /></span>
      </button>
      <div ref={panelRef} className="faq-panel" aria-hidden={!open}><p>{answer}</p></div>
    </div>
  );
};

export const Accordion = ({ items }) => {
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <div className="faq-list">
      {items.map(([question, answer], index) => (
        <AccordionItem
          key={question}
          question={question}
          answer={answer}
          open={openIndex === index}
          onToggle={() => setOpenIndex((current) => (current === index ? -1 : index))}
        />
      ))}
    </div>
  );
};
