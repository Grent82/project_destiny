import { Navigate, NavLink, Route, Routes } from 'react-router-dom'

import './App.css'
import { GlobalStatusBar } from './GlobalStatusBar'
import { useAppSelector } from './hooks'
import { CombatScreen } from '../screens/CombatScreen'
import { ContractBoardScreen } from '../screens/ContractBoardScreen'
import { DashboardScreen } from '../screens/DashboardScreen'
import { DialogueScreen } from '../screens/DialogueScreen'
import { DistrictMapScreen } from '../screens/DistrictMapScreen'
import { DistrictInteriorScreen } from '../screens/DistrictInteriorScreen'
import { DistrictPoiScreen } from '../screens/DistrictPoiScreen'
import { EventLogScreen } from '../screens/EventLogScreen'
import { ExpeditionPrepScreen } from '../screens/ExpeditionPrepScreen'
import { ExpeditionTravelScreen } from '../screens/ExpeditionTravelScreen'
import { ExpeditionReturnScreen } from '../screens/ExpeditionReturnScreen'
import { FactionsScreen } from '../screens/FactionsScreen'
import { HouseScreen } from '../screens/HouseScreen'
import { InvestigationScreen } from '../screens/InvestigationScreen'
import { LedgerScreen } from '../screens/LedgerScreen'
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
          {screenCatalog.map((screen) => {
            const isStep = screen.path === '/contracts' || screen.path === '/missions'
            const stepNum = screen.path === '/contracts' ? '①' : screen.path === '/missions' ? '②' : null
            return (
              <NavLink
                key={screen.path}
                className={({ isActive }) => {
                  const base = isStep ? 'nav-link nav-link-step' : 'nav-link'
                  return isActive ? `${base} nav-link-active` : base
                }}
                to={screen.path}
              >
                {stepNum && <span className="step-num">{stepNum}</span>}
                {screen.title}
              </NavLink>
            )
          })}
          
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
            <Route path="/district/:districtId" element={<DistrictInteriorScreen />} />
            <Route path="/district/:districtId/poi/:poiId" element={<DistrictPoiScreen />} />
            <Route path="/factions" element={<FactionsScreen />} />
            <Route path="/contracts" element={<ContractBoardScreen />} />
            <Route path="/investigation" element={<InvestigationScreen />} />
            <Route path="/missions" element={<MissionPrepScreen />} />
            <Route path="/missions/:questId" element={<MissionPrepScreen />} />
            <Route path="/shops" element={<ShopsScreen />} />
            <Route path="/combat" element={<CombatScreen />} />
            <Route path="/event-log" element={<EventLogScreen />} />
            <Route path="/house" element={<HouseScreen />} />
            <Route path="/ledger" element={<LedgerScreen />} />
            <Route path="/expedition" element={<ExpeditionPrepScreen />} />
            <Route path="/expedition-travel" element={<ExpeditionTravelScreen />} />
            <Route path="/expedition-return" element={<ExpeditionReturnScreen />} />
            <Route path="/dialogue" element={<DialogueScreen />} />
            {screenCatalog
              .filter(
                (screen) =>
                  ![
                    '/dashboard',
                    '/roster',
                    '/recruitment',
                    '/district-map',
                    '/factions',
                    '/contracts',
                    '/investigation',
                    '/missions',
                    '/shops',
                    '/combat',
                    '/event-log',
                    '/house',
                    '/ledger',
                    '/expedition',
                    '/dialogue',
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
