import { Globe, Bell, Shield, Palette, Server } from 'lucide-react'

const SECTIONS = [
  {
    icon: Globe,
    title: 'General',
    description: 'Application name, timezone, and language preferences.',
    fields: [
      { label: 'Organisation Name', placeholder: 'SmartBin Ltd.' },
      { label: 'Timezone',          placeholder: 'UTC+05:30' },
    ],
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Configure when and how alerts are delivered.',
    toggles: [
      { label: 'Email alerts for critical bins', enabled: true },
      { label: 'Push notifications',             enabled: false },
      { label: 'Daily summary digest',           enabled: true },
    ],
  },
  {
    icon: Server,
    title: 'API Connection',
    description: 'Backend connection settings.',
    fields: [
      { label: 'API Base URL', placeholder: 'http://localhost:8000/api' },
      { label: 'API Key',      placeholder: '••••••••••••••••' },
    ],
  },
]

export default function Settings() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="page-title">Settings</h2>
        <p className="page-subtitle">Manage your SmartBin dashboard preferences and integrations.</p>
      </div>

      {SECTIONS.map(({ icon: Icon, title, description, fields, toggles }) => (
        <div key={title} className="bg-white border border-slate-300 space-y-4 shadow-none p-5">
          <div className="flex items-start gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center justify-center w-10 h-10 bg-slate-100 border border-slate-300">
              <Icon className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
          </div>

          {fields && (
            <div className="space-y-3 pt-2">
              {fields.map(({ label, placeholder }) => (
                <div key={label}>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {label}
                  </label>
                  <input
                    type="text"
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-none focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors bg-white"
                  />
                </div>
              ))}
            </div>
          )}

          {toggles && (
            <div className="space-y-3 pt-2">
              {toggles.map(({ label, enabled }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{label}</span>
                  <button
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      enabled ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                    aria-label={label}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button className="px-4 py-2 rounded-none bg-primary-700 text-white text-sm font-bold uppercase tracking-wider hover:bg-primary-800 transition-colors shadow-sm">
              Save Changes
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
