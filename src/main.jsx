import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Activity, AlertTriangle, ArrowUpRight, Bell, Building2, ChevronDown,
  CircleCheck, Cloud, Cpu, Gauge, Menu, MoreHorizontal, Network,
  Plus, Radio, Search, ShieldCheck, Sparkles, Thermometer, Wrench, X,
  Zap
} from 'lucide-react'
import { createProperty, createWorkOrder, loadDashboard, login, logout } from './api'
import './styles.css'
import './auth.css'

const buildings = [
  { name: 'The Ellison', location: 'New York · 43 floors', health: 98, status: 'Nominal', tonnage: '4,200 TR', units: 312, alerts: 0, color: 'mint' },
  { name: 'Riverside House', location: 'Chicago · 31 floors', health: 91, status: 'Watch', tonnage: '2,850 TR', units: 248, alerts: 2, color: 'amber' },
  { name: 'Aster Row', location: 'Miami · 38 floors', health: 84, status: 'Action needed', tonnage: '3,100 TR', units: 196, alerts: 4, color: 'coral' },
]

const alerts = [
  { level: 'critical', title: 'Chiller 02 · Compressor vibration', building: 'Aster Row', time: '12 min ago', detail: 'RMS velocity is 18% above the 14-day baseline.' },
  { level: 'warning', title: 'AHU-07 · Filter loading', building: 'Riverside House', time: '41 min ago', detail: 'Static pressure delta crossed the service threshold.' },
  { level: 'info', title: 'Gateway heartbeat restored', building: 'The Ellison', time: '2 hrs ago', detail: 'LoRaWAN gateway VP-GW-004 is reporting normally.' },
]

function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('ventpulse_user') || 'null'))
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('ventpulse_token')))
  const [dashboardError, setDashboardError] = useState('')
  const [liveBuildings, setLiveBuildings] = useState(buildings)
  const [liveAlerts, setLiveAlerts] = useState(alerts)
  const [coverage, setCoverage] = useState({ percent: 96, assets: '1,284', signals: '12.8M', uptime: '99.98%' })
  const [active, setActive] = useState('Overview')
  const [selectedBuilding, setSelectedBuilding] = useState('All properties')
  const [showAdd, setShowAdd] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [range, setRange] = useState('30 days')
  const [workOrderCreated, setWorkOrderCreated] = useState(false)
  const [connectedSources, setConnectedSources] = useState(['BMS / BAS', 'Utility meters'])

  React.useEffect(() => {
    if (!user) return
    loadDashboard()
      .then(data => {
        if (data.buildings?.length) setLiveBuildings(data.buildings)
        if (data.alerts?.length) setLiveAlerts(data.alerts)
        if (data.coverage) setCoverage(data.coverage)
      })
      .catch(error => setDashboardError(error.message))
      .finally(() => setLoading(false))
  }, [user])

  const nav = [
    { label: 'Overview', icon: Gauge },
    { label: 'Portfolio', icon: Building2 },
    { label: 'Asset health', icon: Activity },
    { label: 'Telemetry', icon: Radio },
    { label: 'Playbooks', icon: Sparkles },
  ]

  const chartPoints = useMemo(() => [31, 38, 34, 45, 41, 53, 47, 58, 61, 55, 67, 63, 72, 68, 77, 73, 82, 76, 86, 81, 89], [])

  if (!user) return <LoginScreen onLogin={async (email, password) => setUser(await login(email, password))} />
  if (loading) return <div className="loading-screen"><div className="brand-mark"><Activity size={19} /></div><strong>Loading VentPulse console…</strong></div>

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Activity size={19} strokeWidth={2.5} /></div>
          <span>vent<span>pulse</span></span>
        </div>
        <div className="workspace-label">OPERATIONS CONSOLE</div>
        <nav>
          {nav.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${active === label ? 'active' : ''}`} onClick={() => setActive(label)}>
              <Icon size={17} /><span>{label}</span>
              {label === 'Asset health' && <span className="nav-count">6</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-rule" />
        <div className="workspace-label">COMMAND CENTER</div>
        <button className={`nav-item ${active === 'Integrations' ? 'active' : ''}`} onClick={() => setActive('Integrations')}><Network size={17} /><span>Integrations</span></button>
        <button className={`nav-item ${active === 'Compliance' ? 'active' : ''}`} onClick={() => setActive('Compliance')}><ShieldCheck size={17} /><span>Compliance</span></button>
        <div className="sidebar-bottom">
          <div className="sidebar-status"><span className="live-dot" />All systems operational</div>
          <div className="user-card">
            <div className="avatar">JM</div>
            <div><strong>Jordan Mills</strong><small>Portfolio operator</small></div>
            <MoreHorizontal size={17} className="muted-icon" />
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="mobile-menu"><Menu size={20} /></button>
          <div className="crumb"><span>Portfolio</span><span className="slash">/</span><strong>{active}</strong></div>
          <div className="top-actions">
            <div className="search"><Search size={16} /><input placeholder="Search assets, alerts..." /></div>
            <button className="icon-button notification-button" onClick={() => setShowNotifications(v => !v)}><Bell size={18} /><span className="notification-dot" /></button>
            <button className="avatar avatar-top" title="Sign out" onClick={() => { logout(); setUser(null) }}>{user.name?.split(' ').map(part => part[0]).join('').slice(0, 2) || 'JM'}</button>
          </div>
          {showNotifications && <div className="notification-popover"><div className="popover-head"><strong>Notifications</strong><span>3 new</span></div>{alerts.map(a => <div className="popover-alert" key={a.title}><span className={`alert-dot ${a.level}`} /><div><strong>{a.title}</strong><small>{a.time}</small></div></div>)}</div>}
        </header>

        <section className="content">
          <div className="title-row">
            <div>
              <div className="eyebrow"><span className="pulse-line" />MONDAY, SEPTEMBER 28, 2026</div>
              <h1>Good morning, Jordan<span className="wave">✦</span></h1>
              <p className="lede">Software intelligence over your existing building data. <strong>No new hardware required.</strong></p>
            </div>
            <div className="title-actions">
              <div className="select-wrap"><Building2 size={15} /><select value={selectedBuilding} onChange={e => setSelectedBuilding(e.target.value)}><option>All properties</option>{buildings.map(b => <option key={b.name}>{b.name}</option>)}</select><ChevronDown size={14} /></div>
              <button className="primary-button" onClick={() => setShowAdd(true)}><Plus size={17} /> Add property</button>
            </div>
          </div>

          <section className="software-strip">
            <div className="software-strip-copy"><div className="software-badge"><Cloud size={13} /> SOFTWARE-FIRST</div><h2>Connect the data you already own</h2><p>VentPulse learns from BMS, utility, weather, and work-order systems before you buy a single sensor.</p></div>
            <div className="source-list">{['BMS / BAS', 'BACnet/IP', 'Modbus', 'Utility meters', 'Weather API', 'CMMS'].map((source, index) => <button key={source} className={`source-chip ${connectedSources.includes(source) ? 'connected' : ''}`} onClick={() => setConnectedSources(current => current.includes(source) ? current.filter(item => item !== source) : [...current, source])}><span className="source-status" />{source}<span className="source-action">{connectedSources.includes(source) ? 'Connected' : 'Connect'}</span></button>)}</div>
            <div className="source-summary"><strong>{connectedSources.length}/6</strong><span>data sources<br />connected</span></div>
          </section>

          <div className="metric-grid">
            <MetricCard icon={<CircleCheck />} label="Portfolio health" value="92" unit="/100" trend="+4.8%" sub="vs. prior 30 days" tone="mint" />
            <MetricCard icon={<Zap />} label="Energy intensity" value="0.61" unit="kW/ton" trend="-8.2%" sub="vs. prior 30 days" tone="blue" trendDown />
            <MetricCard icon={<Wrench />} label="Avoided downtime" value="38.4" unit="hrs" trend="+12.6%" sub="this quarter" tone="violet" />
            <MetricCard icon={<AlertTriangle />} label="Open actions" value="06" unit="" trend="2 critical" sub="across 3 properties" tone="coral" alert />
          </div>

          <div className="dashboard-grid">
            <section className="panel health-panel">
              <div className="panel-head"><div><div className="panel-kicker">ASSET RELIABILITY</div><h2>Portfolio health trend</h2></div><div className="range-tabs">{['7 days', '30 days', '90 days'].map(r => <button key={r} className={range === r ? 'selected' : ''} onClick={() => setRange(r)}>{r}</button>)}</div></div>
              <div className="chart-legend"><span><i className="legend-line green" />Health score</span><span><i className="legend-line gray" />Baseline</span><span className="chart-period">{range} · all properties</span></div>
              <div className="chart"><div className="y-axis"><span>100</span><span>80</span><span>60</span><span>40</span><span>20</span></div><div className="chart-main"><div className="grid-lines">{[0,1,2,3,4].map(i => <i key={i} />)}</div><svg viewBox="0 0 700 210" preserveAspectRatio="none" className="line-chart"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4ac79d" stopOpacity=".24"/><stop offset="100%" stopColor="#4ac79d" stopOpacity="0"/></linearGradient></defs><path d="M 0 155 C 50 145, 45 151, 75 133 S 125 149, 155 119 S 210 133, 240 105 S 300 123, 335 83 S 385 110, 420 74 S 465 85, 500 55 S 550 65, 590 43 S 650 42, 700 23 L700 210 L0 210Z" fill="url(#area)" /><path d="M 0 155 C 50 145, 45 151, 75 133 S 125 149, 155 119 S 210 133, 240 105 S 300 123, 335 83 S 385 110, 420 74 S 465 85, 500 55 S 550 65, 590 43 S 650 42, 700 23" fill="none" stroke="#39b78d" strokeWidth="3" strokeLinecap="round" /></svg><div className="x-axis"><span>Sep 1</span><span>Sep 8</span><span>Sep 15</span><span>Sep 22</span><span>Sep 28</span></div></div></div>
              <div className="chart-callout"><div className="callout-icon"><ArrowUpRight size={17} /></div><div><strong>+4.8% improvement</strong><span>Reliability is trending above your 30-day baseline.</span></div><button>View drivers <ArrowUpRight size={14} /></button></div>
            </section>

            <section className="panel alert-panel">
              <div className="panel-head"><div><div className="panel-kicker">LIVE QUEUE</div><h2>Needs attention</h2></div><button className="text-button">View all <ArrowUpRight size={14} /></button></div>
              <div className="alert-list">{liveAlerts.map(alert => <div className="alert-row" key={alert.title}><div className={`alert-symbol ${alert.level}`}>{alert.level === 'critical' ? <AlertTriangle size={15} /> : alert.level === 'warning' ? <Thermometer size={15} /> : <Cloud size={15} />}</div><div className="alert-copy"><div className="alert-title">{alert.title}</div><div className="alert-meta">{alert.building} <span>·</span> {alert.time}</div><p>{alert.detail}</p></div><button className="dots"><MoreHorizontal size={16} /></button></div>)}</div>
              <div className="alert-footer"><span className="live-dot" />Monitoring 1,284 assets in real time</div>
            </section>
          </div>

          <section className="panel properties-panel">
            <div className="panel-head"><div><div className="panel-kicker">PROPERTY PORTFOLIO</div><h2>Building performance</h2></div><button className="outline-button">Export report <ArrowUpRight size={14} /></button></div>
            <div className="table-wrap"><table><thead><tr><th>Property</th><th>Health score</th><th>Energy intensity</th><th>Cooling capacity</th><th>Last service</th><th>Status</th><th></th></tr></thead><tbody>{liveBuildings.map(b => <tr key={b.name}><td><div className="property-name"><div className={`building-icon ${b.color || 'mint'}`}><Building2 size={16} /></div><div><strong>{b.name}</strong><small>{b.location}</small></div></div></td><td><div className="health-cell"><div className="mini-bar"><i style={{width: `${b.health}%`}} className={b.color || 'mint'} /></div><strong>{b.health}</strong></div></td><td><span className="energy-value">{b.energyIntensity || (b.name === 'The Ellison' ? '0.54' : b.name === 'Riverside House' ? '0.67' : '0.73')} <small>kW/ton</small></span></td><td>{b.tonnage}</td><td>{b.lastService || 'Sep 14, 2026'}</td><td><span className={`status-pill ${b.color || 'mint'}`}><i />{b.status}</span></td><td><button className="dots"><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table></div>
          </section>

          <div className="bottom-grid">
            <section className="panel data-panel"><div className="panel-head"><div><div className="panel-kicker">DATA FABRIC</div><h2>Signal coverage</h2></div><button className="text-button">Manage <ArrowUpRight size={14} /></button></div><div className="coverage-main">            <div className="coverage-ring"><div><strong>{coverage.percent}%</strong><span>coverage</span></div></div><div className="coverage-stats"><div><span className="coverage-dot mint" /><div><strong>{coverage.assets}</strong><small>Assets connected</small></div></div><div><span className="coverage-dot blue" /><div><strong>{coverage.signals}</strong><small>Signals / day</small></div></div><div><span className="coverage-dot violet" /><div><strong>{coverage.uptime}</strong><small>Data uptime</small></div></div></div></div></section>
            <section className="panel action-panel"><div className="action-icon"><Sparkles size={19} /></div><div><div className="panel-kicker">NEXT BEST ACTION</div><h2>Schedule Chiller 02 inspection</h2><p>Our models estimate a <strong>72% probability</strong> of bearing wear within 21 days.</p><button className="primary-button small" onClick={async () => { await createWorkOrder({ title: 'Chiller 02 inspection', priority: 'high' }); setWorkOrderCreated(true) }}>{workOrderCreated ? 'Work order created' : 'Create work order'} <ArrowUpRight size={14} /></button></div></section>
          </div>
        </section>
      </main>
      {dashboardError && <div className="toast"><AlertTriangle size={14} /> API unavailable — showing cached demo telemetry</div>}
      {showAdd && <PropertyModal onClose={() => setShowAdd(false)} onCreate={async payload => { await createProperty(payload); setShowAdd(false); const data = await loadDashboard(); setLiveBuildings(data.buildings) }} />}
    </div>
  )
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('demo@ventpulse.local')
  const [password, setPassword] = useState('demo')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return <div className="login-screen"><div className="login-card"><div className="brand login-brand"><div className="brand-mark"><Activity size={19} /></div><span>vent<span>pulse</span></span></div><div className="eyebrow"><span className="pulse-line" />SECURE OPERATIONS CONSOLE</div><h1>Know before the building does.</h1><p>Sign in to monitor portfolio health, telemetry coverage, and predictive maintenance actions.</p><form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { await onLogin(email, password) } catch (err) { setError(err.message) } finally { setBusy(false) } }}><label>Work email<input value={email} onChange={e => setEmail(e.target.value)} type="email" /></label><label>Password<input value={password} onChange={e => setPassword(e.target.value)} type="password" /></label>{error && <div className="login-error">{error}</div>}<button className="primary-button full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to VentPulse'} <ArrowUpRight size={15} /></button></form><small className="demo-hint">Demo access is pre-filled for local development.</small></div></div>
}

function PropertyModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [platform, setPlatform] = useState('BACnet/IP gateway')
  return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={onClose}><X size={17} /></button><div className="modal-icon"><Building2 size={20} /></div><h2>Add a property</h2><p>Connect a luxury residential asset to start streaming its operational signals.</p><label>Property name<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. The Astoria" /></label><label>City and floors<input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Boston · 34 floors" /></label><label>Building management platform<select value={platform} onChange={e => setPlatform(e.target.value)}><option>BACnet/IP gateway</option><option>Modbus TCP gateway</option><option>LoRaWAN bridge</option></select></label><button className="primary-button full" disabled={!name || !location} onClick={() => onCreate({ name, location, platform })}>Continue setup <ArrowUpRight size={15} /></button></div></div>
}

function MetricCard({ icon, label, value, unit, trend, sub, tone, trendDown, alert }) {
  return <div className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><div className="metric-label">{label}</div><div className="metric-value">{value}<small>{unit}</small></div><div className={`metric-trend ${trendDown ? 'down' : ''} ${alert ? 'alert' : ''}`}>{!alert && <ArrowUpRight size={13} />}{trend}</div><div className="metric-sub">{sub}</div></div>
}

createRoot(document.getElementById('root')).render(<App />)
