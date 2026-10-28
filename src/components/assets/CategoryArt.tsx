// Ikon & ilustrasi kategori Asset Library (desain: https://claude.ai/artifact/X14RZaeaoT5sNTnjHxVeCF).
// Kategori dibuat bebas oleh user, jadi dicocokkan lewat nama; nama lain memakai bentuk umum (folder).

type Kind = 'icon' | 'illustration' | 'template' | 'mockup' | '3d' | 'shape' | 'generic';

const ACCENT = '#ff5e1f';

export function categoryKind(name?: string | null): Kind {
  const n = (name ?? '').trim().toLowerCase();
  if (/^(icon|ikon)/.test(n)) return 'icon';
  if (/^(ilustrasi|illustrasi|illustration)/.test(n)) return 'illustration';
  if (n.startsWith('template')) return 'template';
  if (/^mock/.test(n)) return 'mockup';
  if (/^3\s*d/.test(n)) return '3d';
  if (/^(shape|label|bentuk)/.test(n)) return 'shape';
  return 'generic';
}

/** Ikon garis 24px, mengikuti warna teks (currentColor) dengan satu aksen oranye. */
export function CategoryIcon({ name, className = 'h-4 w-4' }: { name?: string | null; className?: string }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'square' as const, className, 'aria-hidden': true };
  switch (categoryKind(name)) {
    case 'icon':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" fill={ACCENT} stroke={ACCENT} />
        </svg>
      );
    case 'illustration':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" /><circle cx="16" cy="9" r="2" fill={ACCENT} stroke={ACCENT} /><path d="M3 18l6-7 5 5 3-3 4 4" />
        </svg>
      );
    case 'template':
      return (
        <svg {...common}>
          <path d="M7 3h14v12" /><rect x="3" y="7" width="14" height="14" /><path d="M3 11h14" stroke={ACCENT} /><path d="M6 15h5M6 18h7" />
        </svg>
      );
    case 'mockup':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="14" height="10" /><path d="M1 17h18" /><rect x="17" y="9" width="6" height="11" fill={ACCENT} stroke={ACCENT} />
        </svg>
      );
    case '3d':
      return (
        <svg {...common} strokeLinejoin="round">
          <path d="M12 2l9 5v10l-9 5-9-5V7z" /><path d="M3 7l9 5 9-5M12 12v10" />
          <path d="M12 2l9 5-9 5-9-5z" fill={ACCENT} stroke={ACCENT} />
        </svg>
      );
    case 'shape':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="8" height="8" /><circle cx="17" cy="7" r="4" />
          <path d="M3 15h11l3 3-3 3H3z" fill={ACCENT} stroke={ACCENT} />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M3 5h7l2 3h9v12H3z" /><path d="M3 11h18" stroke={ACCENT} />
        </svg>
      );
  }
}

// Kelas isi netral agar ilustrasi tetap terbaca di dark mode.
const paper = 'fill-white dark:fill-[#16181d]';
const soft = 'fill-gray-100 dark:fill-[#20232b]';
const line = 'stroke-gray-200 dark:stroke-[#2b2f3a]';
const mid = 'fill-gray-300 dark:fill-[#343846]';
const dim = 'fill-gray-400 dark:fill-[#4b5160]';
const ink = 'fill-[#262626] dark:fill-gray-200';

/** Ilustrasi kategori 200×160 untuk empty state / kartu. */
export function CategoryIllustration({ name, className = 'h-32 w-40' }: { name?: string | null; className?: string }) {
  const svg = { viewBox: '0 0 200 160', className, 'aria-hidden': true };
  switch (categoryKind(name)) {
    case 'icon':
      return (
        <svg {...svg}>
          <g className={`${paper} ${line}`} strokeWidth="1.5">
            {[[34, 14], [80, 14], [126, 14], [34, 60], [126, 60], [34, 106], [80, 106], [126, 106]].map(([x, y]) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="40" height="40" />
            ))}
          </g>
          <g fill="none" className="stroke-gray-400 dark:stroke-gray-500" strokeWidth="2" strokeLinecap="square">
            <path d="M54 25l3.5 7 7.5 1-5.5 5 1.5 7.5-7-3.8-7 3.8 1.5-7.5-5.5-5 7.5-1z" />
            <circle cx="100" cy="34" r="9" />
            <path d="M138 26h16v16h-16zM138 34h16" />
            <path d="M44 72l10 16 10-16" />
            <path d="M136 80h20M146 70v20" />
            <path d="M44 118h20v16H44zM48 118v-4h12v4" />
            <path d="M92 118l16 16M108 118l-16 16" />
            <path d="M136 126a10 10 0 1 0 20 0a10 10 0 1 0-20 0M146 120v6h5" />
          </g>
          <rect x="76" y="56" width="48" height="48" fill={ACCENT} />
          <path d="M103 66l-10 16h9l-3 12 12-18h-9z" fill="#fff" />
        </svg>
      );
    case 'illustration':
      return (
        <svg {...svg}>
          <rect x="24" y="16" width="132" height="112" className={`${paper} ${line}`} strokeWidth="1.5" />
          <rect x="32" y="24" width="116" height="96" className={soft} />
          <circle cx="118" cy="52" r="14" fill={ACCENT} />
          <path d="M32 120L66 76l22 24 16-16 44 36z" className={mid} />
          <path d="M32 120L66 76l14 18-22 26z" className={dim} />
          <g transform="translate(150 70) rotate(35)">
            <rect x="-6" y="0" width="12" height="62" className={ink} />
            <rect x="-6" y="0" width="12" height="10" fill={ACCENT} />
            <path d="M-6 62L0 78l6-16z" fill="#f3e3d3" className="stroke-[#262626] dark:stroke-gray-200" strokeWidth="1.5" />
          </g>
          <path d="M40 140q20-10 40 0t40 0" fill="none" stroke={ACCENT} strokeWidth="3" strokeLinecap="square" />
        </svg>
      );
    case 'template':
      return (
        <svg {...svg}>
          <rect x="52" y="12" width="120" height="76" className={`${soft} ${line}`} strokeWidth="1.5" />
          <rect x="40" y="26" width="120" height="76" className={`${paper} ${line}`} strokeWidth="1.5" />
          <rect x="28" y="40" width="120" height="76" className={`${paper} stroke-gray-300 dark:stroke-[#343846]`} strokeWidth="1.5" />
          <rect x="28" y="40" width="120" height="14" fill={ACCENT} />
          <rect x="36" y="62" width="44" height="6" className={ink} />
          <rect x="36" y="74" width="52" height="4" className={mid} />
          <rect x="36" y="82" width="46" height="4" className={mid} />
          <rect x="36" y="90" width="50" height="4" className={mid} />
          <rect x="96" y="62" width="44" height="44" className={soft} />
          <circle cx="110" cy="76" r="5" fill={ACCENT} />
          <path d="M96 106l16-18 10 10 6-6 12 14z" className={dim} />
          <g className={`${paper} stroke-gray-300 dark:stroke-[#343846]`} strokeWidth="1.5">
            <rect x="62" y="128" width="28" height="18" /><rect x="96" y="128" width="28" height="18" />
          </g>
          <rect x="28" y="128" width="28" height="18" className={paper} stroke={ACCENT} strokeWidth="2" />
        </svg>
      );
    case 'mockup':
      return (
        <svg {...svg}>
          <rect x="22" y="22" width="122" height="80" className={ink} />
          <rect x="28" y="28" width="110" height="68" className={paper} />
          <rect x="28" y="28" width="110" height="10" className={soft} />
          <rect x="34" y="44" width="40" height="5" className={ink} />
          <rect x="34" y="54" width="48" height="4" className={mid} />
          <rect x="34" y="62" width="42" height="4" className={mid} />
          <rect x="34" y="76" width="30" height="10" fill={ACCENT} />
          <rect x="92" y="44" width="40" height="44" fill={ACCENT} fillOpacity="0.15" />
          <path d="M10 102h146l-6 10H16z" className={dim} />
          <rect x="138" y="54" width="44" height="86" className={ink} />
          <rect x="142" y="62" width="36" height="68" fill={ACCENT} />
          <rect x="146" y="68" width="22" height="4" fill="#fff" />
          <rect x="146" y="92" width="28" height="30" fill="#fff" />
        </svg>
      );
    case '3d':
      return (
        <svg {...svg}>
          <ellipse cx="100" cy="142" rx="74" ry="8" className={soft} />
          <path d="M84 40l40-20 40 20-40 20z" fill={ACCENT} />
          <path d="M84 40l40 20v48L84 88z" fill="#c2410c" />
          <path d="M164 40l-40 20v48l40-20z" fill="#ff8a5c" />
          <path d="M84 40l40-20 40 20-40 20zM124 60v48" fill="none" className="stroke-[#262626] dark:stroke-gray-200" strokeWidth="1.5" strokeLinejoin="round" />
          <ellipse cx="54" cy="96" rx="20" ry="7" className={dim} />
          <rect x="34" y="72" width="40" height="24" className={mid} />
          <rect x="34" y="72" width="12" height="24" className={dim} />
          <ellipse cx="54" cy="72" rx="20" ry="7" className={`${soft} stroke-gray-400 dark:stroke-gray-500`} strokeWidth="1.5" />
          <circle cx="132" cy="122" r="16" className={ink} />
          <circle cx="126" cy="116" r="5" className="fill-gray-500" />
          <path d="M28 132l14-24 14 24z" className={`${paper} stroke-gray-300 dark:stroke-[#343846]`} strokeWidth="1.5" />
        </svg>
      );
    case 'shape':
      return (
        <svg {...svg}>
          <path d="M100 14l9 16 18-4-4 18 16 9-16 9 4 18-18-4-9 16-9-16-18 4 4-18-16-9 16-9-4-18 18 4z" fill={ACCENT} />
          <text x="100" y="58" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="700" fill="#fff">NEW</text>
          <path d="M20 96h86l14 14-14 14H20z" className={`${paper} stroke-gray-300 dark:stroke-[#343846]`} strokeWidth="1.5" />
          <circle cx="104" cy="110" r="3.5" className={mid} />
          <rect x="30" y="104" width="44" height="6" className={ink} />
          <rect x="30" y="114" width="30" height="4" className={mid} />
          <path d="M132 100h48v26h-30l-10 10v-10h-8z" className={ink} />
          <rect x="140" y="108" width="32" height="4" className="fill-white dark:fill-[#16181d]" />
          <rect x="24" y="26" width="34" height="34" fill="none" className="stroke-gray-400 dark:stroke-gray-500" strokeWidth="2" />
          <circle cx="164" cy="44" r="16" fill="none" className="stroke-gray-400 dark:stroke-gray-500" strokeWidth="2" />
          <path d="M40 146h120" stroke={ACCENT} strokeWidth="3" />
        </svg>
      );
    default:
      return (
        <svg {...svg}>
          <path d="M30 36h52l12 16h76v84H30z" className={`${paper} ${line}`} strokeWidth="1.5" />
          <path d="M30 64h140" stroke={ACCENT} strokeWidth="3" />
          <rect x="46" y="80" width="40" height="40" className={soft} />
          <rect x="94" y="80" width="56" height="6" className={ink} />
          <rect x="94" y="94" width="48" height="4" className={mid} />
          <rect x="94" y="104" width="40" height="4" className={mid} />
          <rect x="58" y="92" width="16" height="16" fill={ACCENT} />
        </svg>
      );
  }
}
