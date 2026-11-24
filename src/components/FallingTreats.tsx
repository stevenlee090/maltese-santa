import { useMemo } from 'react';
import { Bone, Heart, PawPrint } from '@phosphor-icons/react';

const ICONS = [PawPrint, Heart, Bone, Heart];

/** Paw prints, hearts and bones drifting down the page. */
export function FallingTreats({ count = 18 }: { count?: number }) {
  const treats = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    Icon: ICONS[i % ICONS.length],
    left: Math.random() * 100,
    size: Math.random() * 14 + 12,
    duration: Math.random() * 14 + 14,
    delay: Math.random() * -28,
    opacity: Math.random() * 0.3 + 0.25,
  })), [count]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      {treats.map(({ id, Icon, left, size, duration, delay, opacity }) => (
        <div
          key={id}
          className="falling-treat absolute top-0 text-pink-400"
          style={{
            left: `${left}%`,
            opacity,
            animation: `fall ${duration}s linear infinite`,
            animationDelay: `${delay}s`,
          }}
        >
          <Icon size={size} weight="fill" />
        </div>
      ))}
    </div>
  );
}
