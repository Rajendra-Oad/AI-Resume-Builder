import { motion, useMotionValue, useSpring } from "motion/react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

const spring = { stiffness: 145, damping: 22, mass: 0.8 };

const TiltedCard = memo(function TiltedCard({ children, className = "", rotateAmplitude = 9, scaleOnHover = 1.03, spotlightStrength = 1 }) {
  const cardRef = useRef(null);
  const [canTilt, setCanTilt] = useState(false);
  const rotateX = useSpring(useMotionValue(0), spring);
  const rotateY = useSpring(useMotionValue(0), spring);
  const scale = useSpring(useMotionValue(1), spring);

  useEffect(() => {
    const finePointer = window.matchMedia("(min-width: 681px) and (hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setCanTilt(finePointer.matches && !reduced.matches);
    update();
    finePointer.addEventListener("change", update);
    reduced.addEventListener("change", update);
    return () => {
      finePointer.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
    };
  }, []);

  const handlePointerMove = useCallback((event) => {
    const card = cardRef.current;
    if (!card) return;
    const bounds = card.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
    card.style.setProperty("--premium-x", `${x * 100}%`);
    card.style.setProperty("--premium-y", `${y * 100}%`);
    card.style.setProperty("--pointer-x", String(x - 0.5));
    card.style.setProperty("--pointer-y", String(y - 0.5));
    if (canTilt) {
      const factor = window.innerWidth <= 900 ? 0.55 : 1;
      rotateY.set((x - 0.5) * rotateAmplitude * 2 * factor);
      rotateX.set((0.5 - y) * rotateAmplitude * 2 * factor);
    }
  }, [canTilt, rotateAmplitude, rotateX, rotateY]);

  const handlePointerEnter = useCallback(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) scale.set(scaleOnHover);
  }, [scale, scaleOnHover]);

  const handlePointerLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
    scale.set(1);
    cardRef.current?.style.setProperty("--pointer-x", "0");
    cardRef.current?.style.setProperty("--pointer-y", "0");
  }, [rotateX, rotateY, scale]);

  return (
    <motion.article
      ref={cardRef}
      className={`tilted-card ${className}`.trim()}
      style={{ rotateX, rotateY, scale, "--spotlight-strength": spotlightStrength }}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {children}
    </motion.article>
  );
});

export default TiltedCard;
