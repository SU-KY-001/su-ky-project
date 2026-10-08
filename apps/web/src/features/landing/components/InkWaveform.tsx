interface InkWaveformProps {
  active: boolean;
  dark: boolean;
}

export function InkWaveform({ active, dark }: InkWaveformProps) {
  return (
    <svg viewBox="0 0 720 86" width="100%" height="86" role="img" aria-label="Minh họa dạng sóng lời kể">
      <path d="M4 44 C30 42 30 19 56 22 S84 67 112 59 S144 14 176 29 S206 75 238 55 S266 18 298 31 S326 68 356 53 S386 26 414 35 S446 61 478 50 S506 20 540 32 S572 70 606 52 S642 29 716 43" fill="none" stroke={dark ? "#B58A3C" : "#5B4E44"} strokeWidth={active ? 5 : 3} strokeLinecap="round" opacity={active ? 1 : 0.62} />
      <path d="M4 50 C52 55 75 40 113 44 S170 58 214 47 S274 38 318 48 S390 56 430 45 S495 37 538 47 S613 58 716 47" fill="none" stroke="#B8322A" strokeWidth="2" strokeLinecap="round" opacity={active ? 0.82 : 0.25} />
    </svg>
  );
}
