import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Check, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Appear } from '@/components/appear.jsx'
import { overviewQueryOptions } from '@/features/overview/overview-api.js'
import { getWhatsAppUrl } from '@/lib/whatsapp.js'

const qualityPresentation = {
  NORMAL: { label: 'Normal', tone: 'healthy' },
  WARNING: { label: 'Warning', tone: 'warning' },
  CRITICAL: { label: 'Critical', tone: 'critical' },
  UNKNOWN: { label: 'Unknown', tone: 'neutral' },
}

const actions = {
  STORE: 'Store',
  LOAD: 'Load',
  DISPATCH: 'Dispatch',
  HANDOVER: 'Hand over',
  INSPECT: 'Inspect',
  OTHER: 'Handle',
}

function StatusBadge({ tone, children }) {
  return <span className={`status-badge status-${tone}`}><span className="status-dot" />{children}</span>
}

function temperature(value) {
  return value === null ? 'Unknown' : `${value.toFixed(1)}°C`
}

function qualityWindow(value) {
  return value === null ? 'Unknown' : `${value.toFixed(1)} days`
}

function freshness(updatedAt) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(updatedAt).getTime()) / 1000))
  return seconds < 60 ? `${seconds} sec ago` : `${Math.floor(seconds / 60)} min ago`
}

function stepAction(step) {
  return `${actions[step.actionType]} ${step.batchCode}${step.resource ? ` ${step.actionType === 'DISPATCH' ? 'to' : step.actionType === 'LOAD' ? 'into' : 'in'} ${step.resource}` : ''}`
}

export function OverviewPage() {
  const overview = useQuery(overviewQueryOptions)

  if (overview.isPending) return <main className="dashboard"><div className="resource-state">Loading dashboard…</div></main>
  if (overview.isError) return <main className="dashboard"><div className="resource-state error-state" role="alert"><strong>Dashboard unavailable</strong><span>Check the API connection and try again.</span><button className="button button-secondary" type="button" onClick={() => overview.refetch()}>Try again</button></div></main>

  const { activePlan, alerts, priorityBatches, summary, updatedAt } = overview.data
  const nextStepId = activePlan?.steps.find((step) => step.status === 'UPCOMING')?.id

  return (
    <div className="dashboard" id="overview">
      <div className="page-heading">
        <div><h1>Overview</h1><p>{new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p></div>
        <div className="live-state"><span />Live · {freshness(updatedAt)}</div>
      </div>

      <Appear as="section" className="summary-strip" aria-label="Operation summary">
        <div><span>Active batches</span><strong>{summary.activeBatchCount}</strong></div>
        <div className="summary-warning"><span>At risk</span><strong>{summary.atRiskBatchCount}</strong></div>
        <div className="summary-critical"><span>Active alerts</span><strong>{summary.activeAlertCount}</strong></div>
        <div><span>Active plan</span><strong>{summary.activePlanVersion ? `V${summary.activePlanVersion}` : '—'}</strong></div>
      </Appear>

      <div className="overview-grid">
        <Appear as="section" className="panel batch-panel" delay={0.08}>
          <div className="panel-header"><h2>Batch priority</h2><span>Quality window</span></div>
          {priorityBatches.length ? (
            <div className="batch-table" role="table" aria-label="Active batches by priority">
              <div className="table-head" role="row"><span>Batch</span><span>Temperature</span><span>Remaining</span><span>Status</span></div>
              {priorityBatches.map((batch) => {
                const presentation = qualityPresentation[batch.qualityStatus]
                return (
                  <div className="batch-row" role="row" key={batch.code}>
                    <div><strong>{batch.code}</strong><span>{batch.sensor ? `${batch.sensor.code} · ${batch.sensor.connectivityStatus.replaceAll('_', ' ').toLowerCase()}` : 'No sensor assigned'}</span></div>
                    <strong>{temperature(batch.currentTemperatureC)}</strong>
                    <strong className={presentation.tone === 'warning' || presentation.tone === 'critical' ? 'warning-text' : ''}>{qualityWindow(batch.remainingQualityWindowDays)}</strong>
                    <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>
                  </div>
                )
              })}
            </div>
          ) : <div className="overview-empty"><strong>No active batches</strong><Link className="button button-primary" to="/fishing-trips">Start an operation here</Link></div>}
        </Appear>

        <Appear as="section" className="panel plan-panel" delay={0.14}>
          {activePlan ? (
            <>
              <div className="panel-header"><h2>Active plan · V{activePlan.version}</h2><StatusBadge tone="healthy">Active</StatusBadge></div>
              <p className="plan-reason">{activePlan.reason}</p>
              <ol className="timeline">
                {activePlan.steps.map((step) => (
                  <li className={step.status === 'COMPLETED' ? 'complete' : step.id === nextStepId ? 'next' : ''} key={step.id}>
                    <span className="timeline-marker">{step.status === 'COMPLETED' && <Check size={13} />}</span>
                    <time>{new Date(step.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                    <strong>{stepAction(step)}</strong>
                    {step.id === nextStepId && <span className="next-label">Next</span>}
                  </li>
                ))}
              </ol>
              <Link className="button button-secondary w-full" to="/plans">View full plan</Link>
            </>
          ) : <div className="overview-empty"><strong>No active plan</strong><span>Approved plans will appear here.</span></div>}
        </Appear>
      </div>

      {alerts.length ? alerts.map((alert, index) => (
        <Appear as="section" className="alert-bar" delay={0.2 + index * 0.03} key={alert.id}>
          <AlertTriangle size={20} aria-hidden="true" />
          <div><strong>{alert.title}</strong><span>{alert.description} · {new Date(alert.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
          <StatusBadge tone={alert.severity === 'CRITICAL' ? 'critical' : 'warning'}>{alert.severity === 'CRITICAL' ? 'Critical' : 'Warning'}</StatusBadge>
          {getWhatsAppUrl(`Hello SIRIP, I need help with alert "${alert.title}" (ID ${alert.id}).`) ? <a className="button button-primary" href={getWhatsAppUrl(`Hello SIRIP, I need help with alert "${alert.title}" (ID ${alert.id}).`)} target="_blank" rel="noreferrer"><MessageCircle size={17} />Open WhatsApp</a> : <button className="button button-primary" type="button" disabled title="Set VITE_WHATSAPP_URL to enable WhatsApp."><MessageCircle size={17} />Open WhatsApp</button>}
        </Appear>
      )) : <div className="overview-clear"><strong>No active alerts</strong><span>Operations currently require no exception response.</span></div>}

      <p className="quality-disclaimer">Quality windows are operational estimates, not food-safety certification.</p>
    </div>
  )
}
