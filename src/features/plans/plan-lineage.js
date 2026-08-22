export function resolvePlanLineage(plan, plans) {
  if (!plan.previousPlanId || !plans) return null
  const predecessor = [...plans.activePlans, ...plans.proposedPlans, ...plans.history].find(({ id }) => id === plan.previousPlanId)
  if (!predecessor) return null
  const predecessorFacts = new Set(predecessor.steps.filter(({ status }) => status === 'COMPLETED').map(stepFact))
  const retainedCompletedSteps = plan.steps.filter(({ status }) => status === 'COMPLETED').filter((step) => predecessorFacts.has(stepFact(step))).length
  return { predecessor, retainedCompletedSteps }
}

function stepFact(step) {
  return [step.sequence, step.actionType, step.batch.id, step.completedAt].join(':')
}
