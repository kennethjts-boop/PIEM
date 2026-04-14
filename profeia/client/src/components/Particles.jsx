import { useEffect, useState } from 'react'

function Particles() {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 15,
      duration: 10 + Math.random() * 15,
      size: 2 + Math.random() * 4,
      color: ['#00d4ff', '#b44aff', '#ff2d95', '#00ff88'][Math.floor(Math.random() * 4)],
      opacity: 0.1 + Math.random() * 0.3
    }))
    setParticles(newParticles)
  }, [])

  return (
    <div className="particles">
      {particles.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            opacity: p.opacity
          }}
        />
      ))}
    </div>
  )
}

export default Particles
