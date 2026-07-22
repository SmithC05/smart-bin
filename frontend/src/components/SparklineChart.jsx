import { ResponsiveContainer, LineChart, Line } from 'recharts'

export default function SparklineChart({ readings, pct }) {
  if (!readings || readings.length < 2) return null

  const color = pct >= 80 ? '#dc2626'
    : pct >= 60 ? '#d97706'
    : '#16a34a'

  const data = readings.map((r) => ({ v: r.fill_pct }))

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
