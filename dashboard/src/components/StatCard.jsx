import { TrendingUp, TrendingDown } from 'lucide-react'

const StatCard = ({ title, value, change, icon: Icon, color = 'primary' }) => {
  const isPositive = change >= 0

  const colorClasses = {
    primary: { bg: 'bg-neon-gold/10 border-neon-gold/30',   icon: 'text-neon-gold' },
    green:   { bg: 'bg-green-900/30 border-green-700/40',   icon: 'text-green-400' },
    blue:    { bg: 'bg-blue-900/30 border-blue-700/40',     icon: 'text-neon-blue' },
    orange:  { bg: 'bg-orange-900/30 border-orange-700/40', icon: 'text-orange-400' },
    purple:  { bg: 'bg-purple-900/30 border-purple-700/40', icon: 'text-purple-400' },
  }

  const colors = colorClasses[color] || colorClasses.primary

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-100">{value}</h3>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
              <span className={`text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {Math.abs(change)}%
              </span>
              <span className="text-sm text-gray-500">vs last month</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${colors.bg}`}>
            <Icon className={`w-6 h-6 ${colors.icon}`} />
          </div>
        )}
      </div>
    </div>
  )
}

export default StatCard
