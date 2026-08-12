import { useAuth } from '../context/AuthContext'
import SystemAdminDashboard from './SystemAdminDashboard'
import MunicipalAdminDashboard from './MunicipalAdminDashboard'
import MunicipalOfficerDashboard from './MunicipalOfficerDashboard'
import ZoneSupervisorDashboard from './ZoneSupervisorDashboard'
import AuditorDashboard from './AuditorDashboard'

export default function Dashboard() {
  const { user } = useAuth()

  if (user?.role === 'zone_supervisor') {
    return <ZoneSupervisorDashboard />
  }

  if (user?.role === 'auditor') {
    return <AuditorDashboard />
  }

  if (user?.role === 'municipal_officer') {
    return <MunicipalOfficerDashboard />
  }

  if (user?.role === 'municipal_admin') {
    return <MunicipalAdminDashboard />
  }
  if (user?.role === 'driver') {
    window.location.href = '/driver'
    return null
  }

  if (user?.role === 'field_worker') {
    window.location.href = '/field-worker'
    return null
  }

  // Default to System Admin view
  return <SystemAdminDashboard />
}
