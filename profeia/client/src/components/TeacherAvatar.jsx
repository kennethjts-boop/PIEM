/**
 * TeacherAvatar — Google flat style SVG avatar
 * Props:
 *   genero: 'maestro' | 'maestra'
 *   size: number (default 80)
 *   animated: boolean (default true) — applies float animation
 */
function TeacherAvatar({ genero = 'maestro', size = 80, animated = true }) {
  const cls = animated ? 'animate-float' : ''

  if (genero === 'maestra') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className={cls}
        aria-label="Avatar Maestra"
      >
        {/* Body — teal blouse */}
        <ellipse cx="50" cy="82" rx="28" ry="20" fill="#00BCD4" />
        <rect x="28" y="65" width="44" height="28" rx="10" fill="#00BCD4" />
        {/* Collar */}
        <path d="M 42 65 L 50 73 L 58 65" fill="white" opacity="0.6" />
        {/* Head */}
        <circle cx="50" cy="42" r="22" fill="#FFCCBC" />
        {/* Hair — dark bun */}
        <path d="M 29 38 Q 28 18 50 16 Q 72 18 71 38 Q 66 24 50 22 Q 34 24 29 38 Z" fill="#4E342E" />
        {/* Bun */}
        <circle cx="50" cy="15" r="7" fill="#4E342E" />
        {/* Bun highlight */}
        <circle cx="48" cy="13" r="2" fill="#6D4C41" opacity="0.6" />
        {/* Ear studs */}
        <circle cx="28" cy="44" r="2.5" fill="#FF6B9D" />
        <circle cx="72" cy="44" r="2.5" fill="#FF6B9D" />
        {/* Eyes */}
        <ellipse cx="41" cy="42" rx="3.5" ry="3.5" fill="#3E2723" />
        <ellipse cx="59" cy="42" rx="3.5" ry="3.5" fill="#3E2723" />
        {/* Eye shine */}
        <circle cx="42.5" cy="40.5" r="1.2" fill="white" />
        <circle cx="60.5" cy="40.5" r="1.2" fill="white" />
        {/* Lashes */}
        <path d="M 38 39 Q 41 37 44 39" stroke="#3E2723" strokeWidth="1" fill="none" />
        <path d="M 56 39 Q 59 37 62 39" stroke="#3E2723" strokeWidth="1" fill="none" />
        {/* Nose */}
        <circle cx="50" cy="47" r="1.5" fill="#FFAB91" />
        {/* Smile */}
        <path d="M 43 52 Q 50 58 57 52" stroke="#BF360C" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {/* Cheeks */}
        <ellipse cx="36" cy="50" rx="5" ry="3" fill="#FF8A65" opacity="0.35" />
        <ellipse cx="64" cy="50" rx="5" ry="3" fill="#FF8A65" opacity="0.35" />
        {/* Book */}
        <rect x="63" y="68" width="16" height="20" rx="2" fill="#4285F4" />
        <rect x="64" y="69" width="7" height="18" rx="1" fill="#3367D6" />
        <line x1="71" y1="69" x2="71" y2="87" stroke="#2a56c6" strokeWidth="1" />
        <line x1="67" y1="73" x2="78" y2="73" stroke="white" strokeWidth="1" opacity="0.5" />
        <line x1="67" y1="77" x2="78" y2="77" stroke="white" strokeWidth="1" opacity="0.5" />
      </svg>
    )
  }

  // Maestro (default)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cls}
      aria-label="Avatar Maestro"
    >
      {/* Body — blue suit */}
      <rect x="24" y="65" width="52" height="38" rx="10" fill="#3F51B5" />
      {/* Suit lapels */}
      <path d="M 50 65 L 40 78 L 50 75 L 60 78 Z" fill="#303F9F" />
      {/* White shirt */}
      <path d="M 44 65 L 50 73 L 56 65" fill="white" />
      {/* Tie */}
      <path d="M 50 73 L 47 85 L 50 83 L 53 85 Z" fill="#EA4335" />
      {/* Collar */}
      <rect x="46" y="62" width="8" height="5" rx="2" fill="white" />
      {/* Head */}
      <circle cx="50" cy="40" r="22" fill="#FFCCBC" />
      {/* Hair */}
      <path d="M 28 35 Q 29 15 50 14 Q 71 15 72 35 Q 67 22 50 20 Q 33 22 28 35 Z" fill="#3E2723" />
      {/* Sideburns */}
      <path d="M 28 35 Q 27 42 30 48" stroke="#3E2723" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 72 35 Q 73 42 70 48" stroke="#3E2723" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Eyes */}
      <ellipse cx="41" cy="40" rx="3.5" ry="3.5" fill="#3E2723" />
      <ellipse cx="59" cy="40" rx="3.5" ry="3.5" fill="#3E2723" />
      {/* Eye shine */}
      <circle cx="42.5" cy="38.5" r="1.2" fill="white" />
      <circle cx="60.5" cy="38.5" r="1.2" fill="white" />
      {/* Eyebrows */}
      <path d="M 37 35 Q 41 33 45 35" stroke="#3E2723" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M 55 35 Q 59 33 63 35" stroke="#3E2723" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Nose */}
      <circle cx="50" cy="45" r="1.5" fill="#FFAB91" />
      {/* Smile */}
      <path d="M 43 51 Q 50 57 57 51" stroke="#BF360C" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* Cheeks */}
      <ellipse cx="35" cy="48" rx="5" ry="3" fill="#FF8A65" opacity="0.3" />
      <ellipse cx="65" cy="48" rx="5" ry="3" fill="#FF8A65" opacity="0.3" />
      {/* Book in hand */}
      <rect x="63" y="70" width="16" height="20" rx="2" fill="#34A853" />
      <rect x="64" y="71" width="7" height="18" rx="1" fill="#1e8a40" />
      <line x1="71" y1="71" x2="71" y2="89" stroke="#1a7a38" strokeWidth="1" />
      <line x1="67" y1="75" x2="78" y2="75" stroke="white" strokeWidth="1" opacity="0.5" />
      <line x1="67" y1="79" x2="78" y2="79" stroke="white" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

export default TeacherAvatar
