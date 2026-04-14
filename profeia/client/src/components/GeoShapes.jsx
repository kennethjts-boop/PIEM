import { useMemo } from 'react'

function GeoShapes() {
  const shapes = useMemo(() => {
    const colors = ['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#A142F4', '#FF6B9D']
    const types = ['circle', 'square', 'triangle', 'diamond']

    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      type: types[i % types.length],
      size: 20 + Math.random() * 40,
      left: Math.random() * 100,
      top: Math.random() * 100,
      color: colors[i % colors.length],
      delay: Math.random() * 10,
      duration: 15 + Math.random() * 15,
      opacity: 0.04 + Math.random() * 0.06
    }))
  }, [])

  return (
    <div className="geo-shapes">
      {shapes.map(s => (
        <div
          key={s.id}
          style={{
            width: `${s.size}px`,
            height: `${s.size}px`,
            left: `${s.left}%`,
            top: `${s.top}%`,
            opacity: s.opacity,
            background: s.color,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
            borderRadius: s.type === 'circle' ? '50%' : s.type === 'square' ? '4px' : '0',
            clipPath: s.type === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' :
                      s.type === 'diamond' ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' : undefined,
            transform: `rotate(${Math.random() * 360}deg)`
          }}
        />
      ))}
    </div>
  )
}

export default GeoShapes
