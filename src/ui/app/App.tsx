import { Navigate, NavLink, Route, Routes } from 'react-router-dom'

import './App.css'
import { GlobalStatusBar } from './GlobalStatusBar'
import { useAppSelector } from './hooks'
import { CombatScreen } from '../screens/CombatScreen'
import { ContractBoardScreen } from '../screens/ContractBoardScreen'
import { DashboardScreen } from '../screens/DashboardScreen'
import { DistrictMapScreen } from '../screens/DistrictMapScreen'
import { DistrictsScreen } from '../screens/DistrictsScreen'
import { EventLogScreen } from '../screens/EventLogScreen'
import { FactionsScreen } from '../screens/FactionsScreen'
import { MissionPrepScreen } from '../screens/MissionPrepScreen'
import { OpeningScreen } from '../screens/OpeningScreen'
import { RecruitmentScreen } from '../screens/RecruitmentScreen'
import { RosterScreen } from '../screens/RosterScreen'
import { ShopsScreen } from '../screens/ShopsScreen'
import { screenCatalog } from '../screens/screenCatalog'
import { EventModal } from '../components/EventModal'
import { selectHasSeenOpening } from '../../application'

function ScreenPlaceholder(props: { title: string; summary: string }) {
  const { summary, title } = props

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdric</p>
      <h1>{title}</h1>
      <p className="summary">{summary}</p>
      <div className="placeholder-grid">
        <article>
          <h2>Purpose</h2>
          <p>This screen exists to lock the feature boundary and future UI route.</p>
        </article>
        <article>
          <h2>Next step</h2>
          <p>Attach application selectors and use cases without moving business rules into the UI layer.</p>
        </article>
      </div>
    </section>
  )
}

export function App() {
  const hasSeenOpening = useAppSelector(selectHasSeenOpening)

  if (!hasSeenOpening) {
    return <OpeningScreen />
  }

  return (
    <div className="app-shell">
      <EventModal />
      <aside className="sidebar">
        <p className="sidebar-brand">House Valdric</p>

        <nav aria-label="Primary" className="nav-list">
          {screenCatalog.map((screen) => (
            <NavLink
              key={screen.path}
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link-active' : 'nav-link'
              }
              to={screen.path}
            >
              {screen.title}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main-column">
        <GlobalStatusBar />
        <main className="content">
          <Routes>
            <Route path="/" element={<Navigate replace to="/dashboard" />} />
            <Route path="/dashboard" element={<DashboardScreen />} />
            <Route path="/roster" element={<RosterScreen />} />
            <Route path="/recruitment" element={<RecruitmentScreen />} />
            <Route path="/district-map" element={<DistrictMapScreen />} />
            <Route path="/districts" element={<DistrictsScreen />} />
            <Route path="/factions" element={<FactionsScreen />} />
            <Route path="/contracts" element={<ContractBoardScreen />} />
            <Route path="/missions" element={<MissionPrepScreen />} />
            <Route path="/shops" element={<ShopsScreen />} />
            <Route path="/combat" element={<CombatScreen />} />
            <Route path="/event-log" element={<EventLogScreen />} />
            {screenCatalog
              .filter(
                (screen) =>
                  ![
                    '/dashboard',
                    '/roster',
                    '/recruitment',
                    '/district-map',
                    '/districts',
                    '/factions',
                    '/contracts',
                    '/missions',
                    '/shops',
                    '/combat',
                    '/event-log',
                  ].includes(screen.path),
              )
              .map((screen) => (
                <Route
                  key={screen.path}
                  path={screen.path}
                  element={<ScreenPlaceholder {...screen} />}
                />
              ))}
          </Routes>
        </main>
      </div>
    </div>
  )
}
