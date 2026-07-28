export const motionDurations = Object.freeze({
  fast: 0.18,
  normal: 0.36,
  slow: 0.58,
});

export const motionEases = Object.freeze({
  enter: "power3.out",
  exit: "power2.in",
  move: "power2.inOut",
});

export const fadeIn = (gsap, targets, options = {}) =>
  gsap.fromTo(
    targets,
    { autoAlpha: 0 },
    {
      autoAlpha: 1,
      duration: motionDurations.normal,
      ease: motionEases.enter,
      clearProps: "opacity,visibility",
      ...options,
    },
  );

export const slideUp = (gsap, targets, options = {}) =>
  gsap.fromTo(
    targets,
    { autoAlpha: 0, y: 18 },
    {
      autoAlpha: 1,
      y: 0,
      duration: motionDurations.slow,
      ease: motionEases.enter,
      clearProps: "opacity,visibility,transform",
      ...options,
    },
  );

export const slideDown = (gsap, targets, options = {}) =>
  gsap.fromTo(
    targets,
    { autoAlpha: 0, y: -14 },
    {
      autoAlpha: 1,
      y: 0,
      duration: motionDurations.normal,
      ease: motionEases.enter,
      clearProps: "opacity,visibility,transform",
      ...options,
    },
  );

export const scaleIn = (gsap, targets, options = {}) =>
  gsap.fromTo(
    targets,
    { autoAlpha: 0, scale: 0.97 },
    {
      autoAlpha: 1,
      scale: 1,
      duration: motionDurations.normal,
      ease: motionEases.enter,
      clearProps: "opacity,visibility,transform",
      ...options,
    },
  );

export const stagger = (index = 0, each = 0.07) => index * each;

export const pageTransition = (gsap, targets, options = {}) =>
  slideUp(gsap, targets, { stagger: 0.07, ...options });

export const modalOpen = (gsap, target, options = {}) =>
  scaleIn(gsap, target, { duration: motionDurations.normal, ...options });

export const modalClose = (gsap, target, options = {}) =>
  gsap.to(target, {
    autoAlpha: 0,
    scale: 0.98,
    duration: motionDurations.fast,
    ease: motionEases.exit,
    ...options,
  });

export const notificationEnter = (gsap, target, options = {}) =>
  scaleIn(gsap, target, { y: 0, duration: motionDurations.normal, ...options });

export const notificationExit = (gsap, target, options = {}) =>
  gsap.to(target, {
    autoAlpha: 0,
    y: -10,
    scale: 0.98,
    duration: motionDurations.fast,
    ease: motionEases.exit,
    ...options,
  });
