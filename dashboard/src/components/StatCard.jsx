import { TrendingUp, TrendingDown } from 'lucide-react'

const StatCard = ({ title, value, change, icon: Icon, color = 'primary' }) => {
  const isPositive = change >= 0

  // Icon color — functional meaning only, no background box
  const iconColor = {
    primary: 'text-neon-gold',
    green:   'text-green-400',
    blue:    'text-neon-blue',
    orange:  'text-orange-400',
    purple:  'text-purple-400',
  }[color] || 'text-gray-400'

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{title}</p>
          <h3 className="text-2xl font-bold text-gray-100">{value}</h3>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {isPositive
                ? <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
              <span className={`text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {Math.abs(change)}%
              </span>
              <span className="text-xs text-gray-600">vs last month</span>
            </div>
          )}
        </div>
        {Icon && <Icon className={`w-8 h-8 ${iconColor} flex-shrink-0 opacity-80`} />}
      </div>
    </div>
  )
}

export default StatCard
