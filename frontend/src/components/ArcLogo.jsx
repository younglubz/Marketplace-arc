// Arc Logo Component
// A imagem deve estar em: frontend/public/arc-logo.png

import { useState } from 'react'

function ArcLogo({ size = 24, showText = true, textSize = '1rem', uppercase = false, color = 'currentColor' }) {
  const [imageError, setImageError] = useState(false)

  return (
    <div style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '0.5rem',
      fontFamily: 'inherit'
    }}>
      {!imageError ? (
        <img 
          src="/arc-logo.svg" 
          alt="Arc Logo"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            objectFit: 'contain',
            flexShrink: 0,
            display: 'block'
          }}
          onError={(e) => {
            console.error('Erro ao carregar logo da Arc. Tentando PNG...')
            // Tenta PNG como fallback
            if (e.target.src.endsWith('.svg')) {
              e.target.src = '/arc-logo.png'
              return
            }
            console.error('Erro ao carregar logo da Arc (PNG também falhou)')
            setImageError(true)
          }}
        />
      ) : (
        // Fallback: letra A estilizada
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          style={{
            flexShrink: 0,
            display: 'block'
          }}
        >
          <path 
            d="M50 15 L75 85 L65 85 L60 70 L40 70 L35 85 L25 85 Z M45 55 L55 55 L50 40 Z" 
            fill="currentColor" 
            stroke="currentColor" 
            strokeWidth="2"
          />
        </svg>
      )}
      {showText && (
        <span style={{ 
          fontSize: textSize,
          fontWeight: '600',
          color: 'inherit',
          letterSpacing: '0.05em',
          textTransform: uppercase ? 'uppercase' : 'none'
        }}>
          Arc
        </span>
      )}
    </div>
  )
}

export default ArcLogo
