import { useState, useEffect, useRef } from "react";

// ---------- split-flap clock (signature element) ----------
// Digits that change at a human-perceivable rate (seconds and up) get a real
// 3D card-flip, hinged at the seam, like a mechanical timing-tower display.
// The fastest-changing digit (tenths) updates instantly — a physical flap
// can't flip 10x/second, and animating it would just look broken.
export default function FlapClock({ text, size = "lg" }) {
  const chars = text.split("");
  return (
    <div className={"pn-flapclock pn-flapclock-" + size}>
      {chars.map((c, i) => {
        const isPunct = !/[0-9]/.test(c);
        const isTenths = !isPunct && i === chars.length - 1;
        if (isPunct) {
          return (
            <span key={i} className="pn-flap pn-flap-punct">
              <span className="pn-flap-char">{c}</span>
            </span>
          );
        }
        if (isTenths) {
          return (
            <span key={i} className="pn-flap">
              <span className="pn-flap-char">{c}</span>
              <span className="pn-flap-seam" />
            </span>
          );
        }
        return <FlapDigit key={i} char={c} />;
      })}
    </div>
  );
}

function FlapDigit({ char }) {
  const [front, setFront] = useState(char);
  const [back, setBack] = useState(char);
  const [flipped, setFlipped] = useState(false);
  const [animate, setAnimate] = useState(true);
  const prevChar = useRef(char);

  useEffect(() => {
    if (char === prevChar.current) return;
    prevChar.current = char;
    setBack(char);
    setAnimate(true);
    setFlipped(true);
  }, [char]);

  const handleTransitionEnd = (e) => {
    if (e.propertyName !== "transform" || !flipped) return;
    setAnimate(false);
    setFront(char);
    setFlipped(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
  };

  return (
    <span className="pn-flap">
      <span
        className={"pn-flap-card" + (flipped ? " pn-flap-flipped" : "") + (animate ? "" : " pn-flap-noanim")}
        onTransitionEnd={handleTransitionEnd}
      >
        <span className="pn-flap-face pn-flap-face-front">{front}</span>
        <span className="pn-flap-face pn-flap-face-back">{back}</span>
      </span>
      <span className="pn-flap-seam" />
    </span>
  );
}
