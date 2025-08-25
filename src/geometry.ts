export type Vec = { x: number; y: number }
export type Segment = { a: Vec; b: Vec }

export function add(a: Vec, b: Vec): Vec { return { x: a.x + b.x, y: a.y + b.y } }
export function sub(a: Vec, b: Vec): Vec { return { x: a.x - b.x, y: a.y - b.y } }
export function dot(a: Vec, b: Vec): number { return a.x * b.x + a.y * b.y }
export function len(a: Vec): number { return Math.hypot(a.x, a.y) }
export function clamp(n: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, n)) }
export function round(v: Vec): Vec { return { x: Math.round(v.x), y: Math.round(v.y) } }

// Segment intersection (proper, including collinear overlap check simplified to treat as intersecting)
export function segmentsIntersect(s1: Segment, s2: Segment): boolean {
  const o = (a: Vec, b: Vec, c: Vec) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x))
  const onSeg = (a: Vec, b: Vec, c: Vec) => Math.min(a.x, b.x) <= c.x && c.x <= Math.max(a.x, b.x)
    && Math.min(a.y, b.y) <= c.y && c.y <= Math.max(a.y, b.y)

  const { a: p1, b: q1 } = s1
  const { a: p2, b: q2 } = s2
  const o1 = o(p1, q1, p2)
  const o2 = o(p1, q1, q2)
  const o3 = o(p2, q2, p1)
  const o4 = o(p2, q2, q1)

  if (o1 !== o2 && o3 !== o4) return true
  if (o1 === 0 && onSeg(p1, q1, p2)) return true
  if (o2 === 0 && onSeg(p1, q1, q2)) return true
  if (o3 === 0 && onSeg(p2, q2, p1)) return true
  if (o4 === 0 && onSeg(p2, q2, q1)) return true
  return false
}

// Point in polygon (non-zero winding via ray casting)
export function pointInPolygon(p: Vec, poly: Vec[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i], pj = poly[j]
    const intersect = (pi.y > p.y) !== (pj.y > p.y) &&
      p.x < ((pj.x - pi.x) * (p.y - pi.y)) / (pj.y - pi.y + 1e-12) + pi.x
    if (intersect) inside = !inside
  }
  return inside
}

// Supercover check: sample along segment every <= 0.5 grid units to ensure path stays inside polygon
export function segmentInsidePolygon(seg: Segment, poly: Vec[]): boolean {
  const dx = seg.b.x - seg.a.x
  const dy = seg.b.y - seg.a.y
  const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 2 // sample at 0.5 increments
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const p = { x: seg.a.x + dx * t, y: seg.a.y + dy * t }
    if (!pointInPolygon(p, poly)) return false
  }
  return true
}

