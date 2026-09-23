const Loader = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return (
    <div className="flex items-center justify-center py-16">
      <div className="relative">
        <div className={`${sizeClasses[size]} border-4 border-gray-800 border-t-neon-gold rounded-full animate-spin`} />
        <div className={`absolute inset-0 ${sizeClasses[size]} border-4 border-transparent border-b-neon-blue rounded-full animate-spin`} style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
      </div>
    </div>
  )
}

export default Loader
