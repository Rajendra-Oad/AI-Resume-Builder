import { memo } from "react";

import TiltedCard from "./TiltedCard";

const PremiumTiltCard = memo(function PremiumTiltCard({ children, className = "", featured = false, index = 0 }) {
  const duration = [4, 5.2, 6, 7.1][index % 4];
  return (
    <div className="premium-tilt-float" style={{ "--float-duration": `${duration}s`, "--float-delay": `${index * -0.43}s` }}>
      <TiltedCard
        className={`premium-tilt-card ${featured ? "premium-tilt-card--featured" : ""} ${className}`.trim()}
        rotateAmplitude={featured ? 10 : 9}
        spotlightStrength={featured ? 1.35 : 1}
      >
        <span className="premium-tilt-card__spotlight" aria-hidden="true" />
        <span className="premium-tilt-card__decoration" aria-hidden="true" />
        {children}
      </TiltedCard>
    </div>
  );
});

export default PremiumTiltCard;
