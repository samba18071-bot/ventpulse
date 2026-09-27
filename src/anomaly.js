/** Deterministic rolling z-score detector; suitable as an explainable MVP baseline. */
export function anomalyScore(value, baseline = []) {
  const samples = baseline.map(Number).filter(Number.isFinite)
  if (samples.length < 2) return 0
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length
  const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length
  const deviation = Math.sqrt(variance) || 1
  return Math.min(1, Math.abs(Number(value) - mean) / (3 * deviation))
}
export function isAnomaly(score, threshold = 0.7) { return score >= threshold }

const requiredFields = ['asset_id', 'timestamp', 'vibration_ips', 'pressure_drop_wg', 'phase_imbalance_pct', 'motor_temp_c', 'power_draw_kw']

export function validateTelemetry(payload) {
  const errors = []
  if (!payload || typeof payload !== 'object') return ['telemetry_payload must be an object']
  for (const field of requiredFields) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') errors.push(`${field} is required`)
  }
  if (payload.asset_id !== undefined && typeof payload.asset_id !== 'string') errors.push('asset_id must be a string')
  if (payload.timestamp && Number.isNaN(Date.parse(payload.timestamp))) errors.push('timestamp must be ISO 8601')
  for (const field of requiredFields.slice(2)) {
    if (payload[field] !== undefined && !Number.isFinite(Number(payload[field]))) errors.push(`${field} must be a finite number`)
  }
  return errors
}

function mean(values) {
  const samples = values.map(Number).filter(Number.isFinite)
  return samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : null
}

export function analyzeTelemetry(payload, history = []) {
  const validationErrors = validateTelemetry(payload)
  if (validationErrors.length) return { valid: false, errors: validationErrors }
  const current = Object.fromEntries(requiredFields.slice(2).map(field => [field, Number(payload[field])]))
  const prior = history.filter(item => !validateTelemetry(item).length)
  const baselinePower = mean(prior.map(item => item.power_draw_kw))
  const ambientMotorBaseline = mean(prior.map(item => item.motor_temp_c))
  const powerRatio = baselinePower ? current.power_draw_kw / baselinePower - 1 : 0
  const motorRise = ambientMotorBaseline ? current.motor_temp_c - ambientMotorBaseline : 0
  const vibrationTrend = prior.length ? current.vibration_ips - Number(prior[prior.length - 1].vibration_ips) : 0
  const pressurePowerSignature = current.pressure_drop_wg > 0.8 && powerRatio >= 0.05
  const bearingSignature = current.vibration_ips > 1.8 && motorRise >= 5 && vibrationTrend > 0
  const misalignmentSignature = current.vibration_ips > 1.2 && vibrationTrend > 0 && prior.length >= 2
  const creepingLoadSignature = powerRatio >= 0.05
  const signals = [
    bearingSignature ? 0.9 : 0,
    pressurePowerSignature ? 0.84 : 0,
    misalignmentSignature ? 0.78 : 0,
    creepingLoadSignature ? 0.76 : 0,
  ]
  const confidence = Math.min(0.99, Math.max(...signals, 0))
  if (confidence < 0.75) return { valid: true, alert: null, confidence, signatures: { bearingSignature, pressurePowerSignature, misalignmentSignature, creepingLoadSignature } }
  let primaryIssue = 'Abnormal HVAC operating condition'
  let action = 'Inspect asset during the next planned maintenance window'
  if (bearingSignature) { primaryIssue = 'Bearing wear / lubrication failure'; action = 'Inspect lubrication, verify bearing condition, and replace the inboard bearing if clearance is out of tolerance' }
  else if (pressurePowerSignature) { primaryIssue = 'Airflow friction from loaded filters'; action = 'Replace loaded filters, verify static pressure, and rebalance the affected air-handling unit' }
  else if (misalignmentSignature) { primaryIssue = 'Motor or coupling misalignment'; action = 'Check axial alignment, coupling condition, and re-tension belts' }
  else if (creepingLoadSignature) { primaryIssue = 'Creeping electrical load'; action = 'Compare operating sequence and refrigerant/airflow performance against the commissioning baseline' }
  const days = bearingSignature ? 14 : pressurePowerSignature ? 21 : 28
  const severity = confidence >= 0.9 ? 3 : confidence >= 0.84 ? 2 : 1
  const alert = {
    ventpulse_alert: {
      timestamp: new Date(payload.timestamp).toISOString(),
      asset_id: payload.asset_id,
      severity_level: `${severity}-${severity === 3 ? 'Critical' : severity === 2 ? 'Urgent' : 'Routine'}`,
      predicted_failure_window_days: days,
      diagnosis: {
        primary_issue: primaryIssue,
        supporting_telemetry: `vibration ${current.vibration_ips.toFixed(2)} ips, pressure drop ${current.pressure_drop_wg.toFixed(2)} in.wg, phase imbalance ${current.phase_imbalance_pct.toFixed(2)}%, motor temperature rise ${motorRise.toFixed(1)}°C, and power deviation ${(powerRatio * 100).toFixed(1)}%`,
      },
      action_required: action,
      financial_impact: {
        avoided_emergency_cost: '$15,000',
        current_energy_waste_per_month: `$${Math.max(0, Math.round(powerRatio * current.power_draw_kw * 24 * 30 * 0.18))}`,
      },
    },
  }
  return { valid: true, alert, confidence, signatures: { bearingSignature, pressurePowerSignature, misalignmentSignature, creepingLoadSignature } }
}
