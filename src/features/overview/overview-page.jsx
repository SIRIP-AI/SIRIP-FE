import { AlertTriangle, Check, MessageCircle } from 'lucide-react'

import { Appear } from '@/components/appear.jsx'

const batches = [
  { id: 'B-017', temp: '8.0°C', window: '4.2 days', sensor: 'S-003', status: 'Warning', tone: 'warning' },
  { id: 'B-021', temp: '2.8°C', window: '7.6 days', sensor: 'S-005', status: 'Normal', tone: 'healthy' },
  { id: 'B-024', temp: '1.9°C', window: '9.1 days', sensor: 'S-008', status: 'Normal', tone: 'healthy' },
]

const steps = [
  { time: '09:00', action: 'Store B-017 in Cold Room 1', complete: true },
  { time: '10:30', action: 'Load B-017 into TR-01', next: true },
  { time: '11:00', action: 'Dispatch B-017 to Processor B' },
]

function StatusBadge({ tone, children }) {
  return <span className={`status-badge status-${tone}`}><span className="status-dot" />{children}</span>
}

export function OverviewPage() {
  return (
    <div className="dashboard" id="overview">
      <div className="page-heading">
        <div><h1>Overview</h1><p>Tanjung Perak · Friday, 14 August</p></div>
        <div className="live-state"><span />Live · 14 sec ago</div>
      </div>

      <Appear as="section" className="summary-strip" aria-label="Operation summary">
        <div><span>Active batches</span><strong>8</strong></div>
        <div className="summary-warning"><span>At risk</span><strong>2</strong></div>
        <div className="summary-critical"><span>Active alerts</span><strong>1</strong></div>
        <div><span>Active plan</span><strong>V3</strong></div>
      </Appear>

      <div className="overview-grid">
        <Appear as="section" className="panel batch-panel" delay={0.08}>
          <div className="panel-header"><h2>Batch priority</h2><span>Quality window</span></div>
          <div className="batch-table" role="table" aria-label="Active batches by priority">
            <div className="table-head" role="row"><span>Batch</span><span>Temperature</span><span>Remaining</span><span>Status</span></div>
            {batches.map((batch) => (
              <div className="batch-row" role="row" key={batch.id}>
                <div><strong>{batch.id}</strong><span>{batch.sensor} · Online</span></div>
                <strong>{batch.temp}</strong>
                <strong className={batch.tone === 'warning' ? 'warning-text' : ''}>{batch.window}</strong>
                <StatusBadge tone={batch.tone}>{batch.status}</StatusBadge>
              </div>
            ))}
          </div>
        </Appear>

        <Appear as="section" className="panel plan-panel" delay={0.14}>
          <div className="panel-header"><h2>Active plan · V3</h2><StatusBadge tone="healthy">Active</StatusBadge></div>
          <p className="plan-reason"><strong>B-017 first:</strong> reduced quality margin after a temperature excursion.</p>
          <ol className="timeline">
            {steps.map((step) => (
              <li className={step.complete ? 'complete' : step.next ? 'next' : ''} key={step.time}>
                <span className="timeline-marker">{step.complete && <Check size={13} />}</span>
                <time>{step.time}</time>
                <strong>{step.action}</strong>
                {step.next && <span className="next-label">Next</span>}
              </li>
            ))}
          </ol>
        </Appear>
      </div>

      <Appear as="section" className="alert-bar" delay={0.2}>
        <AlertTriangle size={20} aria-hidden="true" />
        <div><strong>B-017 temperature excursion</strong><span>8.0°C for 42 min · 4.2 days remaining · 10:08</span></div>
        <StatusBadge tone="critical">Critical</StatusBadge>
        <a className="button button-primary" href="https://wa.me/" target="_blank" rel="noreferrer"><MessageCircle size={17} />Open WhatsApp</a>
      </Appear>

      <p className="quality-disclaimer">Quality windows are operational estimates, not food-safety certification.</p>
    </div>
  )
}
