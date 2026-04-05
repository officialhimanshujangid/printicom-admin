// Printicom Brand Logo SVG Component
// Use size prop to control dimensions, showText to show/hide brand name

export default function PrinticomLogo({ size = 36, showText = false, textColor = '#fff' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Icon */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="ptc-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="ptc-photo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        {/* Background */}
        <circle cx="100" cy="100" r="96" fill="url(#ptc-bg)" />
        {/* Shine overlay */}
        <circle cx="100" cy="100" r="96" fill="white" fillOpacity="0.06" />

        {/* Printer top paper tray */}
        <rect x="60" y="62" width="80" height="30" rx="7" fill="white" fillOpacity="0.85" />
        <rect x="68" y="68" width="64" height="6" rx="3" fill="white" fillOpacity="0.3" />

        {/* Printer body */}
        <rect x="44" y="84" width="112" height="54" rx="10" fill="white" fillOpacity="0.95" />
        {/* Body shadow band */}
        <rect x="44" y="98" width="112" height="14" rx="0" fill="black" fillOpacity="0.07" />

        {/* Indicator dots */}
        <circle cx="140" cy="106" r="5" fill="#a855f7" />
        <circle cx="153" cy="106" r="5" fill="#6366f1" />
        <rect x="56" y="103" width="60" height="6" rx="3" fill="#6366f1" fillOpacity="0.2" />

        {/* Photo output / paper */}
        <rect x="66" y="110" width="68" height="54" rx="5" fill="url(#ptc-photo)" />
        {/* Sky on photo */}
        <rect x="66" y="110" width="68" height="22" rx="5" fill="#fbbf24" />
        {/* Mountain shape on photo */}
        <polygon points="66,148 88,118 104,134 118,116 134,148" fill="white" fillOpacity="0.25" />
        {/* Sun on photo */}
        <circle cx="122" cy="122" r="8" fill="white" fillOpacity="0.35" />
      </svg>

      {/* Brand text */}
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{
            fontSize: 18, fontWeight: 800, color: textColor,
            letterSpacing: '-0.5px', fontFamily: 'Inter, sans-serif',
          }}>
            Printi<span style={{ color: '#a5b4fc' }}>com</span>
          </span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Admin Panel
          </span>
        </div>
      )}
    </div>
  )
}
