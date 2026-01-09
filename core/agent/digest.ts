
function buildObservationDigest(obs?: { emits: Array<{content:string, at:string}>, facts?: Record<string, unknown> }) {
  if (!obs) return "";
  return JSON.stringify({
    lastEmits: obs.emits.slice(-3).map(e => e.content),
    factsKeys: obs.facts ? Object.keys(obs.facts).slice(0, 20) : [],
  });
}
