import type { ReactNode } from 'react';
import { DialTimeline, useDialTimeline, type TimelineConfig } from 'dialkit';

const ORBIT_RADIUS_PERCENT = 39;

type IconMotionState = {
  radius: number;
  opacity: number;
  scale: number;
  pulseRotation: number;
  pulseScale: number;
};

type IconSlotProps = {
  angle: number;
  className: string;
  children: ReactNode;
  motionState: IconMotionState;
  orbitRotation: number;
  tilt: number;
};

function IconSlot({ angle, className, children, motionState, orbitRotation, tilt }: IconSlotProps) {
  const angleInRadians = angle * (Math.PI / 180);
  const radius = ORBIT_RADIUS_PERCENT * motionState.radius;
  const scale = motionState.scale * motionState.pulseScale;

  return (
    <div
      className={`timeline-loading-icon ${className}`}
      style={{
        left: `${50 + Math.sin(angleInRadians) * radius}%`,
        top: `${50 - Math.cos(angleInRadians) * radius}%`,
        opacity: motionState.opacity,
        transform: `translate(-50%, -50%) rotate(${tilt + motionState.pulseRotation - orbitRotation}deg) scale(${scale})`,
      }}
    >
      {children}
    </div>
  );
}

type OrbitIconsProps = {
  rotation: number;
  states: {
    topLeft: IconMotionState;
    top: IconMotionState;
    topRight: IconMotionState;
    right: IconMotionState;
    bottomRight: IconMotionState;
    bottomLeft: IconMotionState;
    left: IconMotionState;
  };
};

function OrbitIcons({ rotation, states }: OrbitIconsProps) {
  return (
    <div className="timeline-loading-orbit" style={{ transform: `rotate(${rotation}deg)` }}>
      <IconSlot angle={-51.4286} className="timeline-loading-icon--top-left" motionState={states.topLeft} orbitRotation={rotation} tilt={-7}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 4C15.9517 3.99997 19.7906 6.27233 22.3567 10.5831C22.8762 11.4558 22.8762 12.5441 22.3567 13.4168C19.7906 17.7276 15.9517 20 12 20C8.04829 20 4.20943 17.7277 1.64329 13.4169C1.12379 12.5442 1.12379 11.4559 1.64329 10.5832C4.20943 6.27243 8.04828 4.00003 12 4ZM8.5 12C8.5 10.067 10.067 8.5 12 8.5C13.933 8.5 15.5 10.067 15.5 12C15.5 13.933 13.933 15.5 12 15.5C10.067 15.5 8.5 13.933 8.5 12Z"
            fill="currentColor"
          />
        </svg>
      </IconSlot>

      <IconSlot angle={0} className="timeline-loading-icon--top" motionState={states.top} orbitRotation={rotation} tilt={4}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.29289 18.293C4.68342 17.9025 5.31643 17.9025 5.70696 18.293C6.0974 18.6835 6.09745 19.3166 5.70696 19.7071L3.70696 21.7071C3.31646 22.0976 2.68342 22.0975 2.29289 21.7071C1.90237 21.3166 1.90237 20.6835 2.29289 20.293L4.29289 18.293Z" fill="currentColor" />
          <path d="M18.2929 18.293C18.6834 17.9025 19.3164 17.9025 19.707 18.293L21.707 20.293C22.0974 20.6835 22.0975 21.3166 21.707 21.7071C21.3165 22.0976 20.6834 22.0975 20.2929 21.7071L18.2929 19.7071C17.9024 19.3166 17.9024 18.6835 18.2929 18.293Z" fill="currentColor" />
          <path d="M11.9999 3.00005C12.7 3.00007 13.337 3.39134 13.6562 4.00591L13.7157 4.13091L15.4042 8.07036C15.5054 8.30633 15.6936 8.49461 15.9296 8.59575L19.8691 10.2842C20.5551 10.5785 20.9999 11.2535 20.9999 12C20.9999 12.7466 20.5552 13.4217 19.8691 13.7159L15.9296 15.4043C15.6936 15.5055 15.5054 15.6937 15.4042 15.9297L13.7157 19.8692C13.4215 20.5553 12.7465 21 11.9999 21C11.2534 21 10.5783 20.5553 10.2841 19.8692L8.59563 15.9297C8.49449 15.6937 8.30621 15.5055 8.07024 15.4043L4.13078 13.7159C3.44467 13.4217 2.99995 12.7466 2.99992 12C2.99992 11.2535 3.44465 10.5784 4.13078 10.2842L8.07024 8.59575C8.30622 8.4946 8.49448 8.30634 8.59563 8.07036L10.2841 4.13091C10.5783 3.44477 11.2534 3.00005 11.9999 3.00005Z" fill="currentColor" />
          <path d="M2.29289 2.29302C2.68342 1.90249 3.31643 1.90249 3.70696 2.29302L5.70696 4.29302C6.0974 4.68355 6.09745 5.31658 5.70696 5.70708C5.31646 6.09758 4.68342 6.09753 4.29289 5.70708L2.29289 3.70708C1.90237 3.31655 1.90237 2.68354 2.29289 2.29302Z" fill="currentColor" />
          <path d="M20.2929 2.29302C20.6834 1.90249 21.3164 1.90249 21.707 2.29302C22.0974 2.68355 22.0975 3.31658 21.707 3.70708L19.707 5.70708C19.3165 6.09758 18.6834 6.09753 18.2929 5.70708C17.9024 5.31655 17.9024 4.68354 18.2929 4.29302L20.2929 2.29302Z" fill="currentColor" />
        </svg>
      </IconSlot>

      <IconSlot angle={51.4286} className="timeline-loading-icon--top-right" motionState={states.topRight} orbitRotation={rotation} tilt={7}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11.928 3.3913C11.0815 2.67043 9.7857 3.33067 9.87132 4.43924L10.1493 8.03795L7.07448 9.92836C6.1273 10.5107 6.35481 11.9471 7.43558 12.2082L9.80503 12.7808L3.29289 19.2929C2.90237 19.6834 2.90237 20.3166 3.29289 20.7071C3.68342 21.0976 4.31658 21.0976 4.70711 20.7071L11.2192 14.195L11.7918 16.5644C12.0529 17.6452 13.4893 17.8727 14.0716 16.9255L15.962 13.8507L19.5608 14.1287C20.6693 14.2143 21.3296 12.9185 20.6087 12.072L18.2686 9.32392L19.645 5.98724C20.069 4.95938 19.0406 3.93103 18.0128 4.35502L14.6761 5.73142L11.928 3.3913Z" fill="currentColor" />
        </svg>
      </IconSlot>

      <IconSlot angle={102.8571} className="timeline-loading-icon--right" motionState={states.right} orbitRotation={rotation} tilt={8}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2ZM12 6.84863C11.6988 6.84863 11.4284 7.03428 11.3203 7.31543L10.4092 9.68359C10.3076 9.94769 10.0991 10.1562 9.83496 10.2578L7.4668 11.1689C7.18564 11.2771 7 11.5474 7 11.8486C7 12.1499 7.18564 12.4202 7.4668 12.5283L9.83496 13.4395C10.0991 13.541 10.3076 13.7496 10.4092 14.0137L11.3203 16.3818C11.4284 16.663 11.6988 16.8486 12 16.8486C12.3012 16.8486 12.5716 16.663 12.6797 16.3818L13.5908 14.0137C13.6924 13.7496 13.9009 13.541 14.165 13.4395L16.5332 12.5283C16.8144 12.4202 17 12.1499 17 11.8486C17 11.5474 16.8144 11.2771 16.5332 11.1689L14.165 10.2578C13.9009 10.1562 13.6924 9.94769 13.5908 9.68359L12.6797 7.31543C12.5716 7.03428 12.3012 6.84863 12 6.84863Z"
            fill="currentColor"
          />
        </svg>
      </IconSlot>

      <IconSlot angle={154.2857} className="timeline-loading-icon--bottom-right" motionState={states.bottomRight} orbitRotation={rotation} tilt={-7}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.1082 1.99862C11.2104 1.10308 12.7896 1.10308 13.8918 1.99862L19.8918 6.87362C20.5929 7.44329 21 8.29858 21 9.20197V18C21 19.6569 19.6569 21 18 21H6C4.34315 21 3 19.6569 3 18V9.20197C3 8.29858 3.40709 7.44329 4.10822 6.87362L10.1082 1.99862ZM8 15C7.44772 15 7 15.4477 7 16C7 16.5523 7.44772 17 8 17H16C16.5523 17 17 16.5523 17 16C17 15.4477 16.5523 15 16 15H8Z"
            fill="currentColor"
          />
        </svg>
      </IconSlot>

      <IconSlot angle={205.7143} className="timeline-loading-icon--bottom-left" motionState={states.bottomLeft} orbitRotation={rotation} tilt={1}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13.1181 2.04792C12.6817 1.94211 12.2504 2.20028 12.0773 2.61462C11 6.50002 8 8.55501 8 11.2699V17.7252C8 18.8717 8.66361 20.0005 9.83559 20.4273C12.4864 21.3926 14.2335 21.589 16.9595 21.3527C19.0504 21.1715 20.6221 19.5685 21.0577 17.6326L21.9024 13.8781C22.4651 11.3773 20.5633 9.00007 18 9.00007L15 9.00002C15.4693 6.18434 16.615 2.89587 13.1181 2.04792Z" fill="currentColor" />
          <path d="M2 11.5C2 10.3954 2.89543 9.5 4 9.5H5C6.10457 9.5 7 10.3954 7 11.5V18.5C7 19.6046 6.10457 20.5 5 20.5H4C2.89543 20.5 2 19.6046 2 18.5V11.5Z" fill="currentColor" />
        </svg>
      </IconSlot>

      <IconSlot angle={257.1429} className="timeline-loading-icon--left" motionState={states.left} orbitRotation={rotation} tilt={-8}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM10.9393 9.06066L9.06066 10.9393C8.47487 11.5251 8.47487 12.4749 9.06066 13.0607L10.9393 14.9393C11.5251 15.5251 12.4749 15.5251 13.0607 14.9393L14.9393 13.0607C15.5251 12.4749 15.5251 11.5251 14.9393 10.9393L13.0607 9.06066C12.4749 8.47487 11.5251 8.47487 10.9393 9.06066Z"
            fill="currentColor"
          />
        </svg>
      </IconSlot>
    </div>
  );
}

const ENTRANCE_END = 0.8;
const PULSE_TRANSITION = {
  type: 'easing' as const,
  duration: 0.8,
  ease: [0.45, 0, 0.55, 1] as [number, number, number, number],
};

const entranceTimeline = {
  duration: 10.8,
  portrait: {
    at: 0,
    duration: 0.35,
    from: { opacity: 1, scale: 0.2 },
    to: { opacity: 1, scale: 1 },
    transition: { type: 'spring', bounce: 0.3 },
  },
  icons: {
    top: {
      at: 0.08,
      duration: 0.4,
      from: { radius: 0, opacity: 0, scale: 0.6 },
      to: { radius: 1, opacity: 1, scale: 1 },
      transition: { type: 'spring', bounce: 0.35 },
    },
    topRight: {
      at: 0.2,
      duration: 0.4,
      from: { radius: 0, opacity: 0, scale: 0.6 },
      to: { radius: 1, opacity: 1, scale: 1 },
      transition: { type: 'spring', bounce: 0.35 },
    },
    right: {
      at: 0.15,
      duration: 0.4,
      from: { radius: 0, opacity: 0, scale: 0.6 },
      to: { radius: 1, opacity: 1, scale: 1 },
      transition: { type: 'spring', bounce: 0.35 },
    },
    bottomRight: {
      at: 0.28,
      duration: 0.37,
      from: { radius: 0, opacity: 0, scale: 0.6 },
      to: { radius: 1, opacity: 1, scale: 1 },
      transition: { type: 'spring', bounce: 0.35 },
    },
    bottomLeft: {
      at: 0.25,
      duration: 0.42,
      from: { radius: 0, opacity: 0, scale: 0.6 },
      to: { radius: 1, opacity: 1, scale: 1 },
      transition: { type: 'spring', bounce: 0.35 },
    },
    left: {
      at: 0.38,
      duration: 0.42,
      from: { radius: 0, opacity: 0, scale: 0.6 },
      to: { radius: 1, opacity: 1, scale: 1 },
      transition: { type: 'spring', bounce: 0.35 },
    },
    topLeft: {
      at: 0.33,
      duration: 0.42,
      from: { radius: 0, opacity: 0, scale: 0.6 },
      to: { radius: 1, opacity: 1, scale: 1 },
      transition: { type: 'spring', bounce: 0.35 },
    },
  },
  orbit: {
    at: ENTRANCE_END,
    duration: 10,
    loop: true,
    from: { rotate: 0 },
    to: { rotate: 360 },
    transition: { type: 'easing', duration: 10, ease: [0, 0, 1, 1] },
  },
  pulse: {
    groupOne: {
      at: ENTRANCE_END,
      loop: true,
      props: {
        scale: {
          from: 0.8,
          transition: PULSE_TRANSITION,
          steps: [
            { duration: 0.8, to: 1 },
            { duration: 0.8, to: 0.8 },
          ],
        },
        rotation: {
          from: -10,
          transition: PULSE_TRANSITION,
          steps: [
            { duration: 0.8, to: 10 },
            { duration: 0.8, to: -10 },
          ],
        },
      },
    },
    groupTwo: {
      at: ENTRANCE_END,
      loop: true,
      props: {
        scale: {
          from: 1,
          transition: PULSE_TRANSITION,
          steps: [
            { duration: 0.8, to: 0.8 },
            { duration: 0.8, to: 1 },
          ],
        },
        rotation: {
          from: 10,
          transition: PULSE_TRANSITION,
          steps: [
            { duration: 0.8, to: -10 },
            { duration: 0.8, to: 10 },
          ],
        },
      },
    },
  },
} satisfies TimelineConfig;

export function Timeline1() {
  // TODO(production): DialKit's clip.current values are the scrubbable authoring preview.
  // Replace them with equivalent real Motion animations using the tuned timeline
  // timings and transitions, then remove useDialTimeline and <DialTimeline />.
  const timeline = useDialTimeline(
    'Account Setup Entrance',
    entranceTimeline,
    { loop: { from: ENTRANCE_END } }
  );
  const portrait = timeline.portrait.current;
  const orbitRotation = timeline.orbit.current.rotate;
  const pulseGroupOne = timeline.pulse.groupOne.current;
  const pulseGroupTwo = timeline.pulse.groupTwo.current;
  const groupOne = {
    pulseRotation: Number(pulseGroupOne.rotation),
    pulseScale: Number(pulseGroupOne.scale),
  };
  const groupTwo = {
    pulseRotation: Number(pulseGroupTwo.rotation),
    pulseScale: Number(pulseGroupTwo.scale),
  };

  return (
    <>
      <main className="timeline-loading-page">
        <style>{timelineLoadingCss}</style>

        <section
          className="timeline-loading-content"
          aria-labelledby="timeline-loading-title"
          style={{ transform: 'translateY(0px) scale(0.75)' }}
        >
          <div className="timeline-loading-art" aria-hidden="true">
            <OrbitIcons
              rotation={orbitRotation}
              states={{
                topLeft: { ...timeline.icons.topLeft.current, ...groupOne },
                top: { ...timeline.icons.top.current, ...groupOne },
                topRight: { ...timeline.icons.topRight.current, ...groupTwo },
                right: { ...timeline.icons.right.current, ...groupOne },
                bottomRight: { ...timeline.icons.bottomRight.current, ...groupTwo },
                bottomLeft: { ...timeline.icons.bottomLeft.current, ...groupOne },
                left: { ...timeline.icons.left.current, ...groupTwo },
              }}
            />
            <div
              className="timeline-loading-center"
              style={{
                opacity: portrait.opacity,
                transform: `translate(-50%, -50%) scale(${portrait.scale})`,
              }}
            >
              <img src="/account-portrait.png" alt="" />
            </div>
          </div>

          <div className="timeline-loading-copy">
            <h1 id="timeline-loading-title">Setting up your account...</h1>
          </div>
        </section>
      </main>
      <DialTimeline theme="system" />
    </>
  );
}

const timelineLoadingCss = `
  :root {
    color-scheme: light;
  }

  html,
  body,
  #root {
    min-width: 320px;
    min-height: 100%;
    margin: 0;
  }

.timeline-loading-page {
  min-height: 100vh;
  box-sizing: border-box;
  display: grid;
  place-items: start center;
  overflow: hidden;
    padding: 120px 24px 230px;
    background: #fbf6e9;
    color: #171717;
    font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

.timeline-loading-content {
  width: min(100%, 620px);
  display: flex;
  flex-direction: column;
  align-items: center;
  transform-origin: top center;
  }

  .timeline-loading-art {
    position: relative;
    width: clamp(260px, 36vw, 344px);
    aspect-ratio: 1;
    flex: none;
  }

  .timeline-loading-center {
    position: absolute;
    display: grid;
    place-items: center;
  }

  .timeline-loading-center {
    z-index: 2;
    left: 50%;
    top: 50%;
    width: 35%;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }

  .timeline-loading-center img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .timeline-loading-orbit {
    position: absolute;
    inset: 0;
    z-index: 1;
    transform-origin: center;
  }

  .timeline-loading-icon {
    position: absolute;
    width: var(--icon-size);
    aspect-ratio: 1;
    transform-origin: center;
  }

  .timeline-loading-icon svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }

  .timeline-loading-icon--top-left {
    --icon-size: 19%;
    color: #ee76bc;
  }

  .timeline-loading-icon--top {
    --icon-size: 20%;
    color: #9e59e9;
  }

  .timeline-loading-icon--top-right {
    --icon-size: 20%;
    color: #74b4ee;
  }

  .timeline-loading-icon--right {
    --icon-size: 23%;
    color: #ffbd18;
  }

  .timeline-loading-icon--bottom-right {
    --icon-size: 20%;
    color: #8caafa;
  }

  .timeline-loading-icon--bottom-left {
    --icon-size: 20%;
    color: #f25054;
  }

  .timeline-loading-icon--left {
    --icon-size: 17%;
    color: #13ae70;
  }

  .timeline-loading-copy {
    margin-top: clamp(20px, 3.3vh, 34px);
    text-align: center;
  }

  .timeline-loading-copy h1 {
    margin: 0;
    font-family: "ABC Camera Rounded Plain Variable Unlicensed Trial", Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 42px;
    font-weight: 500;
    line-height: 1.22;
  }

  @media (max-height: 700px) {
    .timeline-loading-art {
      width: min(42vh, 300px);
    }

    .timeline-loading-copy {
      margin-top: 12px;
    }

  }

  @media (max-width: 480px) {
    .timeline-loading-page {
      padding-inline: 18px;
    }

}
`;
