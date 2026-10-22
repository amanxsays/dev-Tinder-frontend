import { useEffect, useId, useRef } from 'react';

// Compatible cubic paths keep the flowing glass bands continuous across each loop.
const bubble = 'M80 8C119.8 8 152 40.2 152 80S119.8 152 80 152C63.8 152 49 146.7 37 137.8L16 146L22.5 124C13.4 111.7 8 96.5 8 80C8 40.2 40.2 8 80 8Z';
const cyanA = 'M-12 56C24 12 45 112 88 70S140 16 177 52L177 78C139 42 123 122 83 95S24 38-12 83Z';
const cyanB = 'M-12 74C30 117 42 14 89 50S135 127 177 72L177 97C136 149 124 60 85 78S24 147-12 97Z';
const blueA = 'M-15 95C26 54 44 137 94 98S144 65 177 103L177 132C140 101 116 153 78 125S19 85-15 123Z';
const blueB = 'M-15 81C26 122 53 44 94 77S141 142 177 91L177 119C138 164 111 105 78 102S19 150-15 108Z';
const pearlA = 'M-7 28C38 72 55 19 85 48S130 111 169 68L169 91C130 138 103 97 76 73S28 94-7 55Z';
const pearlB = 'M-7 42C32 6 64 103 89 62S136 21 169 82L169 105C134 54 121 79 85 87S29 38-7 70Z';


export default function ChatOrb({ size = 'small', active = false, paused = false }) {
  const id = 'dt-orb-' + useId().replace(/:/g, '');
  const root = useRef(null);
  const svg = useRef(null);
  const animated = size === 'large' || size === 'launcher' || active;
  useEffect(() => {
    if (!animated) return;
    const node = root.current;
    const vector = svg.current;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = !('IntersectionObserver' in window);
    const update = () => {
      const stop = paused || !visible || document.hidden || media.matches;
      node.dataset.motion = stop ? 'paused' : 'running';
      if (stop) vector.pauseAnimations?.();
      else vector.unpauseAnimations?.();
    };
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      update();
    }) : null;
    observer?.observe(node);
    media.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      observer?.disconnect();
      media.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
      vector.pauseAnimations?.();
    };
  }, [animated, paused]);
  const wave = (from, to, duration) => animated
    ? <animate attributeName="d" values={from + ';' + to + ';' + from} dur={duration}
        calcMode="spline" keyTimes="0;0.5;1" keySplines=".42 0 .58 1;.42 0 .58 1" repeatCount="indefinite" />
    : null;
  return <span ref={root} aria-hidden="true" className={'chat-orb chat-orb--' + size + (active ? ' chat-orb--active' : '')}>
    <span className="chat-orb__aura" />
    <svg ref={svg} className="chat-orb__vector" viewBox="0 0 160 160" fill="none" focusable="false">
      <defs>
        <clipPath id={id + '-clip'}><path d={bubble} /></clipPath>
        <radialGradient id={id + '-glass'} cx=".32" cy=".15" r=".9">
          <stop stopColor="#b8deff" stopOpacity=".58" /><stop offset=".24" stopColor="#305ba5" stopOpacity=".48" />
          <stop offset=".64" stopColor="#0d2758" stopOpacity=".82" /><stop offset="1" stopColor="#243e75" stopOpacity=".65" />
        </radialGradient>
        <linearGradient id={id + '-cyan'} x1="20" y1="25" x2="130" y2="115" gradientUnits="userSpaceOnUse">
          <stop stopColor="#b3f1ff" stopOpacity=".9" /><stop offset=".42" stopColor="#38c8eb" stopOpacity=".86" /><stop offset="1" stopColor="#187ade" stopOpacity=".58" />
        </linearGradient>
        <linearGradient id={id + '-blue'} x1="20" y1="70" x2="135" y2="150" gradientUnits="userSpaceOnUse">
          <stop stopColor="#37aaff" stopOpacity=".88" /><stop offset=".45" stopColor="#2466e3" stopOpacity=".7" /><stop offset="1" stopColor="#9cd9ff" stopOpacity=".85" />
        </linearGradient>
        <linearGradient id={id + '-pearl'} x1="30" y1="10" x2="110" y2="135" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d5f1ff" stopOpacity=".75" /><stop offset=".5" stopColor="#b0bfff" stopOpacity=".65" /><stop offset="1" stopColor="#71e3f7" stopOpacity=".8" />
        </linearGradient>
        <linearGradient id={id + '-shine'} x1="80" y1="8" x2="80" y2="65" gradientUnits="userSpaceOnUse">
          <stop stopColor="#edfaff" stopOpacity=".55" /><stop offset="1" stopColor="#c5e6ff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id + '-rim'} x1="35" y1="5" x2="126" y2="150" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d8f6ff" stopOpacity=".7" /><stop offset=".52" stopColor="#92d6ff" stopOpacity=".18" /><stop offset="1" stopColor="#b6e9ff" stopOpacity=".6" />
        </linearGradient>
        <radialGradient id={id + '-depth'} cx=".48" cy=".44" r=".61">
          <stop offset=".45" stopColor="#041a3b" stopOpacity="0" /><stop offset="1" stopColor="#03132d" stopOpacity=".48" />
        </radialGradient>
        <filter id={id + '-soften'} x="-.15" y="-.15" width="1.3" height="1.3" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation=".65" />
        </filter>
      </defs>
      <path d={bubble} fill={'url(#' + id + '-glass)'} />
      <g clipPath={'url(#' + id + '-clip)'}>
        <g filter={'url(#' + id + '-soften)'}>
          <path className="chat-orb__flow" d={blueA} fill={'url(#' + id + '-blue)'}>
            {wave(blueA, blueB, active ? '4.8s' : '9s')}
          </path>
          <path className="chat-orb__flow" d={pearlA} fill={'url(#' + id + '-pearl)'}>
            {wave(pearlA, pearlB, active ? '6s' : '11s')}
          </path>
          <path className="chat-orb__flow" d={cyanA} fill={'url(#' + id + '-cyan)'}>
            {wave(cyanA, cyanB, active ? '4.6s' : '8s')}
          </path>
        </g>
        <path d={bubble} fill={'url(#' + id + '-depth)'} />
        <path d="M24 43C47 3 111 4 138 43C109 25 57 25 24 43Z" fill={'url(#' + id + '-shine)'} />
        <ellipse cx="30" cy="51" rx="4" ry="17" transform="rotate(25 30 51)" fill="#dbfaff" fillOpacity=".16" />
      </g>
      <path d={bubble} stroke={'url(#' + id + '-rim)'} strokeWidth="1.1" />
      <path d="M23 111C30 134 52 149 80 149" stroke="#d5f6ff" strokeOpacity=".18" strokeWidth=".8" />
    </svg>
  </span>;
}
