// Componente Logo GENESIS - Design Hexagonal Futurista
function GenesisLogo({ size = 45, animate = true }) {
  return (
    <div 
      className={animate ? "genesis-logo-animated" : "genesis-logo"}
      style={{ 
        width: `${size}px`, 
        height: `${size}px`,
        position: 'relative'
      }}
    >
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Hexágono Externo com Gradiente */}
        <defs>
          <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#d4af37', stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: '#f4d03f', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#d4af37', stopOpacity: 1 }} />
          </linearGradient>
          
          <linearGradient id="innerGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#f4d03f', stopOpacity: 0.9 }} />
            <stop offset="50%" style={{ stopColor: '#ffd700', stopOpacity: 0.9 }} />
            <stop offset="100%" style={{ stopColor: '#d4af37', stopOpacity: 0.9 }} />
          </linearGradient>

          {/* Filter para glow */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Filter para inner glow */}
          <filter id="innerGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5"/>
          </filter>
        </defs>

        {/* Hexágono Externo */}
        <path
          d="M 50 5 L 85 27.5 L 85 72.5 L 50 95 L 15 72.5 L 15 27.5 Z"
          stroke="url(#hexGradient)"
          strokeWidth="3"
          fill="var(--background)"
          filter="url(#glow)"
        />

        {/* Hexágono Interno (menor) */}
        <path
          d="M 50 15 L 75 30 L 75 70 L 50 85 L 25 70 L 25 30 Z"
          stroke="url(#hexGradient)"
          strokeWidth="1.5"
          fill="none"
          opacity="0.4"
        />

        {/* Elementos de Circuito - Canto Superior Direito */}
        <g opacity="0.7">
          <circle cx="70" cy="25" r="2" fill="#d4af37"/>
          <line x1="70" y1="25" x2="78" y2="20" stroke="#d4af37" strokeWidth="1"/>
          <circle cx="78" cy="20" r="1.5" fill="#f4d03f"/>
          
          <circle cx="75" cy="32" r="2" fill="#f4d03f"/>
          <line x1="75" y1="32" x2="82" y2="28" stroke="#f4d03f" strokeWidth="1"/>
          <circle cx="82" cy="28" r="1.5" fill="#d4af37"/>
        </g>

        {/* Elementos de Circuito - Canto Inferior Esquerdo */}
        <g opacity="0.7">
          <circle cx="30" cy="75" r="2" fill="#f4d03f"/>
          <line x1="30" y1="75" x2="22" y2="80" stroke="#f4d03f" strokeWidth="1"/>
          <circle cx="22" cy="80" r="1.5" fill="#d4af37"/>
          
          <circle cx="25" cy="68" r="2" fill="#d4af37"/>
          <line x1="25" y1="68" x2="18" y2="72" stroke="#d4af37" strokeWidth="1"/>
          <circle cx="18" cy="72" r="1.5" fill="#f4d03f"/>
        </g>

        {/* Letra G Estilizada */}
        <g filter="url(#glow)">
          {/* Parte externa do G */}
          <path
            d="M 65 35 
               A 15 15 0 1 0 65 65
               L 65 50
               L 55 50"
            stroke="url(#hexGradient)"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          
          {/* Barra horizontal do G */}
          <line 
            x1="55" 
            y1="50" 
            x2="62" 
            y2="50" 
            stroke="url(#hexGradient)" 
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Detalhe interno do G */}
          <circle cx="50" cy="50" r="3" fill="url(#innerGlow)" opacity="0.8"/>
        </g>

        {/* Pontos decorativos nos vértices do hexágono */}
        <circle cx="50" cy="5" r="2" fill="#d4af37" opacity="0.9"/>
        <circle cx="85" cy="27.5" r="2" fill="#f4d03f" opacity="0.9"/>
        <circle cx="85" cy="72.5" r="2" fill="#d4af37" opacity="0.9"/>
        <circle cx="50" cy="95" r="2" fill="#f4d03f" opacity="0.9"/>
        <circle cx="15" cy="72.5" r="2" fill="#d4af37" opacity="0.9"/>
        <circle cx="15" cy="27.5" r="2" fill="#f4d03f" opacity="0.9"/>
      </svg>
    </div>
  )
}

export default GenesisLogo

