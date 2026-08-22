import React, { useEffect, useRef, useState } from 'react';

export type FoxState =
  | 'walk'
  | 'sit'
  | 'sleep'
  | 'look'
  | 'jump'
  | 'hide'
  | 'celebrate';

interface FoxCompanionProps {
  state: FoxState;
}

interface Fox {
  id: number;
  x: number;
  direction: 1 | -1;
  speed: number;
}

const FoxCompanion: React.FC<FoxCompanionProps> = ({ state }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const foxesRef = useRef<Fox[]>([]);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  const [renderReady, setRenderReady] = useState(false);
  const [displayState, setDisplayState] = useState<FoxState>('walk');

  // --------------------------------------------------
  // CREATE FOXES
  // --------------------------------------------------

  useEffect(() => {
    foxesRef.current = Array.from({ length: 3 }, (_, index) => ({
      id: index,
      x: Math.random() * Math.max(window.innerWidth - 100, 100),
      direction: Math.random() > 0.5 ? 1 : -1,
      speed: 35 + Math.random() * 35,
    }));

    setRenderReady(true);
  }, []);

  // --------------------------------------------------
  // REACTIONS
  // After every reaction, return to WALK
  // --------------------------------------------------

  useEffect(() => {
    // Normal/default state
    if (state === 'walk' || state === 'sit') {
      setDisplayState('walk');
      return;
    }

    // Reaction state
    setDisplayState(state);

    let duration = 1000;

    if (state === 'look') {
      duration = 3000;
    }

    if (state === 'jump') {
      duration = 700;
    }

    if (state === 'celebrate') {
      duration = 2500;
    }

    if (state === 'hide') {
      duration = 1500;
    }

    if (state === 'sleep') {
      duration = 2000;
    }

    const timer = setTimeout(() => {
      setDisplayState('walk');
    }, duration);

    return () => clearTimeout(timer);
  }, [state]);

  // --------------------------------------------------
  // WALKING ANIMATION
  // --------------------------------------------------

  useEffect(() => {
    const animate = (time: number) => {
      const dt = Math.min(
        time - lastTimeRef.current,
        100
      );

      lastTimeRef.current = time;

      foxesRef.current.forEach((fox) => {
        // Foxes walk whenever we're in the normal state
        if (displayState === 'walk') {
          fox.x +=
            fox.speed *
            (dt / 1000) *
            fox.direction;

          const maxX =
            window.innerWidth - 80;

          if (fox.x <= 0) {
            fox.x = 0;
            fox.direction = 1;
          }

          if (fox.x >= maxX) {
            fox.x = maxX;
            fox.direction = -1;
          }
        }
      });

      if (containerRef.current) {
        const foxElements =
          containerRef.current.querySelectorAll<HTMLDivElement>(
            '[data-fox]'
          );

        foxElements.forEach((element, index) => {
          const fox = foxesRef.current[index];

          if (!fox) return;

          element.style.transform =
            `translateX(${fox.x}px)`;

          const flip =
            element.querySelector<HTMLDivElement>(
              '.fox-flip'
            );

          if (flip) {
            flip.style.transform =
              `scaleX(${fox.direction})`;
          }
        });
      }

      animationRef.current =
        requestAnimationFrame(animate);
    };

    animationRef.current =
      requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(
          animationRef.current
        );
      }
    };
  }, [displayState]);

  return (
    <>
      <style>{`
        .fox-container {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 120px;
          pointer-events: none;
          z-index: 9999;
          overflow: hidden;
        }

        .fox {
          position: absolute;
          bottom: 15px;
          left: 0;
          width: 60px;
          height: 60px;
          transform-origin: bottom center;
        }

        .fox-flip {
          position: absolute;
          width: 100%;
          height: 100%;
          transform-origin: center center;
        }

        .fox-anim {
          position: absolute;
          width: 100%;
          height: 100%;
          transform-origin: bottom center;
        }

        .fox-shadow {
          position: absolute;
          bottom: -5px;
          left: 10px;
          width: 40px;
          height: 8px;
          background: rgba(0, 0, 0, 0.15);
          border-radius: 50%;
          filter: blur(2px);
        }

        .fox-body {
          position: absolute;
          bottom: 12px;
          left: 10px;
          width: 36px;
          height: 22px;
          background: linear-gradient(
            135deg,
            #ff7b00,
            #e05a00
          );
          border-radius: 18px 18px 10px 10px;
          box-shadow:
            inset -3px -3px 5px
            rgba(0,0,0,0.2);
          z-index: 2;
        }

        .fox-body::after {
          content: '';
          position: absolute;
          bottom: 0;
          right: 0;
          width: 20px;
          height: 10px;
          background: white;
          border-radius: 10px 0 0 0;
        }

        .fox-head {
          position: absolute;
          bottom: 22px;
          right: -2px;
          width: 28px;
          height: 24px;
          background: #ff7b00;
          border-radius: 50%;
          box-shadow:
            inset -2px -2px 4px
            rgba(0,0,0,0.2);
          z-index: 3;
          transition: all 0.3s ease;
        }

        .fox-head::after {
          content: '';
          position: absolute;
          bottom: 2px;
          right: -4px;
          width: 16px;
          height: 12px;
          background: white;
          border-radius: 50%;
        }

        .fox-eye {
          position: absolute;
          width: 4px;
          height: 4px;
          background: #111;
          border-radius: 50%;
          top: 10px;
          z-index: 4;
        }

        .fox-eye.front {
          right: 4px;
        }

        .fox-eye.back {
          right: 14px;
        }

        .fox-ear {
          position: absolute;
          top: -6px;
          width: 12px;
          height: 14px;
          background: #ff7b00;
          border-radius: 2px 8px 0 0;
          z-index: 2;
          transition: transform 0.3s;
        }

        .fox-ear::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 6px;
          height: 6px;
          background: #222;
          border-radius: 0 8px 0 0;
        }

        .fox-ear.back {
          left: 2px;
          transform: rotate(-20deg);
          filter: brightness(0.8);
        }

        .fox-ear.front {
          right: 6px;
          transform: rotate(10deg);
        }

        .fox-tail {
          position: absolute;
          bottom: 12px;
          left: -8px;
          width: 14px;
          height: 26px;
          background: linear-gradient(
            to bottom,
            #ff7b00 60%,
            white 60%
          );
          border-radius: 12px;
          transform-origin: bottom center;
          transform: rotate(-40deg);
          z-index: 1;
          box-shadow:
            inset -2px 0 4px
            rgba(0,0,0,0.2);
        }

        .fox-leg {
          position: absolute;
          bottom: 4px;
          width: 6px;
          height: 12px;
          background: #222;
          border-radius: 3px;
          transform-origin: top center;
          z-index: 1;
        }

        .fox-leg.front {
          right: 15px;
          z-index: 3;
        }

        .fox-leg.back {
          left: 18px;
          filter: brightness(0.8);
        }

        /* WALK */

        .fox.state-walk .fox-anim {
          animation:
            fox-walk-bob
            0.4s
            linear
            infinite;
        }

        .fox.state-walk .fox-leg.front {
          animation:
            fox-leg-swing
            0.4s
            ease-in-out
            infinite
            alternate;
        }

        .fox.state-walk .fox-leg.back {
          animation:
            fox-leg-swing
            0.4s
            ease-in-out
            infinite
            alternate-reverse;
        }

        .fox.state-walk .fox-tail {
          animation:
            fox-tail-wag
            0.5s
            ease-in-out
            infinite;
        }

        /* LOOK */

        .fox.state-look .fox-head {
          transform: rotate(-15deg);
          bottom: 26px;
        }

        .fox.state-look .fox-eye {
          width: 6px;
          height: 6px;
          top: 8px;
        }

        .fox.state-look .fox-tail {
          animation:
            fox-tail-idle
            2s
            ease-in-out
            infinite;
        }

        /* JUMP */

        .fox.state-jump .fox-anim {
          animation:
            fox-jump
            0.6s
            ease-out;
        }

        .fox.state-jump .fox-shadow {
          animation:
            fox-shadow
            0.6s
            ease-out;
        }

        .fox.state-jump .fox-tail {
          transform: rotate(-10deg);
        }

        /* CELEBRATE */

        .fox.state-celebrate .fox-anim {
          animation:
            fox-celebrate
            0.4s
            ease-in-out
            infinite;
        }

        .fox.state-celebrate .fox-tail {
          animation:
            fox-tail-wag
            0.2s
            infinite;
        }

        .fox.state-celebrate .fox-head {
          transform: rotate(-10deg);
        }

        /* HIDE */

        .fox.state-hide .fox-anim {
          transform:
            scale(0.7)
            translateY(10px);
          animation:
            fox-shiver
            0.1s
            linear
            infinite;
        }

        /* ANIMATIONS */

        @keyframes fox-walk-bob {
          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-4px);
          }
        }

        @keyframes fox-leg-swing {
          0% {
            transform: rotate(-30deg);
          }

          100% {
            transform: rotate(30deg);
          }
        }

        @keyframes fox-tail-wag {
          0%, 100% {
            transform: rotate(-40deg);
          }

          50% {
            transform: rotate(-15deg);
          }
        }

        @keyframes fox-tail-idle {
          0%, 100% {
            transform: rotate(-60deg);
          }

          50% {
            transform: rotate(-75deg);
          }
        }

        @keyframes fox-jump {
          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform:
              translateY(-50px)
              scale(0.95, 1.05);
          }
        }

        @keyframes fox-shadow {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }

          50% {
            transform: scale(0.4);
            opacity: 0.3;
          }
        }

        @keyframes fox-celebrate {
          0%, 100% {
            transform:
              translateY(0)
              scale(1.05, 0.95);
          }

          50% {
            transform:
              translateY(-15px)
              scale(0.95, 1.05);
          }
        }

        @keyframes fox-shiver {
          0% {
            transform:
              scale(0.7)
              translateY(10px)
              translateX(-1px);
          }

          50% {
            transform:
              scale(0.7)
              translateY(10px)
              translateX(1px);
          }

          100% {
            transform:
              scale(0.7)
              translateY(10px)
              translateX(-1px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .fox,
          .fox * {
            animation-duration:
              0.001ms !important;
            animation-iteration-count:
              1 !important;
          }
        }
      `}</style>

      <div
        ref={containerRef}
        className="fox-container"
        aria-hidden="true"
      >
        {renderReady &&
          foxesRef.current.map((fox) => (
            <div
              key={fox.id}
              data-fox
              className={`fox state-${displayState}`}
            >
              <div className="fox-shadow" />

              <div className="fox-flip">
                <div className="fox-anim">

                  <div className="fox-tail" />

                  <div className="fox-leg back" />

                  <div className="fox-leg front" />

                  <div className="fox-body" />

                  <div className="fox-head">

                    <div className="fox-ear back" />

                    <div className="fox-ear front" />

                    <div className="fox-eye back" />

                    <div className="fox-eye front" />

                  </div>

                </div>
              </div>
            </div>
          ))}
      </div>
    </>
  );
};

export default FoxCompanion;
