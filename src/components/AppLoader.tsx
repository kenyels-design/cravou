import { useMemo } from 'react';
import ballGeometrySvg from '../assets/loaders/ball-geometry.svg?raw';
import jerseyPulseSvg from '../assets/loaders/jersey-pulse.svg?raw';
import trophyRevealSvg from '../assets/loaders/trophy-reveal.svg?raw';

const loaders = [
  {
    label: 'Carregando com animacao de trofeu',
    svg: trophyRevealSvg,
  },
  {
    label: 'Carregando com animacao de camisa',
    svg: jerseyPulseSvg,
  },
  {
    label: 'Carregando com animacao de bola',
    svg: ballGeometrySvg,
  },
];

export default function AppLoader() {
  const selectedLoader = useMemo(
    () => loaders[Math.floor(Math.random() * loaders.length)],
    [],
  );

  return (
    <div className="flex w-full items-center justify-center py-2">
      <div
        aria-label={selectedLoader.label}
        aria-live="polite"
        className="h-[190px] w-[190px] max-w-full md:h-[220px] md:w-[220px] [&_svg]:h-full [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: selectedLoader.svg }}
        role="status"
      />
    </div>
  );
}
