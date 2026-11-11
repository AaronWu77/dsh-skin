/**
 * Ambient pointer trails painted behind the Web client frame.
 *
 * The effect is the AW Studio ambience, adapted from the owner's pointer-trails canvas
 * src/components/ui/PointerTrails.jsx): a ribbon of spring-chained strands
 * drawn at very low alpha, drifting on its own while the pointer is away and
 * following it while it is over the window. It mounts one fixed, click-through
 * canvas on \`document.body\` and rebuilds nothing else, so it composes with
 * every client plugin. \`prefers-reduced-motion\` paints a single still frame.
 */
import type { Context } from '@deepseek-ai/cordis'
import { AW_STUDIO_PRESETS } from '../presets/catalog.ts'
import type { AwStudioPresetId } from '../presets/catalog.ts'

/** Cordis plugin name. */
export const name = 'dsh-pointer-trails'

/** Physics and layer constants, carried over from the source effect. */
const SETTINGS = {
  friction: 0.52,
  trails: 46,
  nodes: 34,
  dampening: 0.025,
  tension: 0.985,
} as const

/** Painted above the shell background, below the overlay surfaces. */
const LAYER_Z_INDEX = 1

/** Gaussian blur applied to the painted ribbon, in CSS pixels. */
const RIBBON_BLUR_PX = 13
/** Layer opacity after the blur: the ribbon stays a background cue. */
const LAYER_OPACITY = 0.62
/** Per-stroke alpha handed to the canvas. */
const STROKE_ALPHA = 0.027
/** Canvas backing-store scale; below 1 the browser softens the upscale too. */
const RENDER_SCALE = 0.7

/** One sine oscillator driving the ribbon hue. */
/**
 * Parse a `#rrggbb` preset stop into channels.
 * @param hex - six-digit hex color from the preset catalog.
 * @returns red, green, and blue channels.
 */
function channels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
}

/**
 * Blend the preset's three stops at a ribbon position.
 * @param preset - active palette id.
 * @param fraction - position along the ribbon, 0 to 1.
 * @param alpha - per-stroke alpha.
 * @returns a CSS rgba color.
 */
function ribbonColor(preset: AwStudioPresetId, fraction: number, alpha: number): string {
  const stops = AW_STUDIO_PRESETS[preset].trails
  const scaled = Math.min(0.999, Math.max(0, fraction)) * (stops.length - 1)
  const index = Math.floor(scaled)
  const mix = scaled - index
  const from = channels(stops[index]!)
  const to = channels(stops[Math.min(index + 1, stops.length - 1)]!)
  const channel = (offset: number) => Math.round(from[offset]! + (to[offset]! - from[offset]!) * mix)
  return `rgba(${channel(0)}, ${channel(1)}, ${channel(2)}, ${alpha})`
}

/** One physics node of a strand. */
interface TrailNode {
  x: number
  y: number
  vx: number
  vy: number
}

/** One spring-chained strand. */
class Trail {
  private readonly spring: number
  private readonly friction: number
  private readonly nodes: TrailNode[]
  /** This strand’s position in the fan, driving its hue and width weight. */
  readonly indexFraction: number

  constructor(origin: { x: number; y: number }, index: number, bounds: { width: number; height: number }) {
    this.indexFraction = index / SETTINGS.trails
    this.spring = 0.43 + this.indexFraction * 0.032 + Math.random() * 0.035 - 0.0175
    this.friction = SETTINGS.friction + Math.random() * 0.008 - 0.004
    this.nodes = Array.from({ length: SETTINGS.nodes }, (_, nodeIndex) => {
      const progress = nodeIndex / (SETTINGS.nodes - 1)
      const spread = (index - SETTINGS.trails / 2) * 0.22
      return {
        x: origin.x - progress * bounds.width * 0.58,
        y: origin.y + Math.sin(progress * Math.PI * 1.35) * bounds.height * 0.25 + spread,
        vx: 0,
        vy: 0,
      }
    })
  }

  /** Advance the strand toward one target point. */
  update(target: { x: number; y: number }): void {
    let spring = this.spring
    const first = this.nodes[0]!
    first.vx += (target.x - first.x) * spring
    first.vy += (target.y - first.y) * spring
    for (let index = 0; index < this.nodes.length; index += 1) {
      const node = this.nodes[index]!
      if (index > 0) {
        const previous = this.nodes[index - 1]!
        node.vx += (previous.x - node.x) * spring
        node.vy += (previous.y - node.y) * spring
        node.vx += previous.vx * SETTINGS.dampening
        node.vy += previous.vy * SETTINGS.dampening
      }
      node.vx *= this.friction
      node.vy *= this.friction
      node.x += node.vx
      node.y += node.vy
      spring *= SETTINGS.tension
    }
  }

  /** Stroke the strand as a quadratic ribbon. */
  draw(context: CanvasRenderingContext2D): void {
    let current = this.nodes[0]!
    context.beginPath()
    context.moveTo(current.x, current.y)
    for (let index = 1; index < this.nodes.length - 2; index += 1) {
      const point = this.nodes[index]!
      const next = this.nodes[index + 1]!
      current = point
      context.quadraticCurveTo(current.x, current.y, (current.x + next.x) * 0.5, (current.y + next.y) * 0.5)
    }
    const penultimate = this.nodes[this.nodes.length - 2]!
    const last = this.nodes[this.nodes.length - 1]!
    context.quadraticCurveTo(penultimate.x, penultimate.y, last.x, last.y)
    context.stroke()
  }
}

/** Mount the ambient canvas and return its disposer. */
/** Which palette and how strong the ribbon paints.
 * @param preset - active palette id.
 * @param intensity - layer opacity multiplier, 0.2 to 1.
 * @returns the removal callback for this layer.
 */
function mountTrails(preset: AwStudioPresetId, intensity: number): () => void {
  const layer = document.createElement('div')
  layer.dataset.pointerTrails = ''
  Object.assign(layer.style, {
    position: 'fixed',
    inset: '0',
    zIndex: String(LAYER_Z_INDEX),
    pointerEvents: 'none',
    overflow: 'hidden',
    contain: 'strict',
    opacity: String(LAYER_OPACITY * intensity),
  } satisfies Partial<CSSStyleDeclaration>)
  const canvas = document.createElement('canvas')
  Object.assign(canvas.style, {
    display: 'block',
    width: '100%',
    height: '100%',
    filter: `blur(${RIBBON_BLUR_PX}px)`,
  } satisfies Partial<CSSStyleDeclaration>)
  layer.appendChild(canvas)
  document.body.appendChild(layer)

  const context = canvas.getContext('2d')
  if (context === null) {
    layer.remove()
    return () => {}
  }

  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  let frame = 0
  let width = 0
  let height = 0
  let active = false
  let visible = !document.hidden
  let trails: Trail[] = []
  const target = { x: 0, y: 0 }

  const createTrails = (): void => {
    target.x = width * 0.56
    target.y = height * 0.48
    trails = Array.from({ length: SETTINGS.trails }, (_, index) => new Trail(target, index, { width, height }))
  }

  const resize = (): void => {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5) * RENDER_SCALE
    width = Math.max(1, layer.clientWidth)
    height = Math.max(1, layer.clientHeight)
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    createTrails()
  }

  const draw = (time = 0): void => {
    context.clearRect(0, 0, width, height)
    if (!active) {
      target.x = width * 0.54 + Math.cos(time * 0.00072) * width * 0.28
      target.y = height * 0.49 + Math.sin(time * 0.00104) * height * 0.3
    }
    context.globalCompositeOperation = 'source-over'
    context.lineCap = 'round'
    context.lineJoin = 'round'
    const drift = Math.sin(time * 0.00042) * 0.06
    for (const trail of trails) {
      const color = trail.indexFraction + drift
      const centerWeight = 1 - Math.abs(trail.indexFraction - 0.5) * 1.2
      context.lineWidth = Math.max(3.5, Math.min(7.5, width / 76)) * (0.82 + centerWeight * 0.26)
      context.strokeStyle = ribbonColor(preset, color, STROKE_ALPHA)
      trail.update(target)
      trail.draw(context)
    }
  }

  const render = (time: number): void => {
    if (visible) draw(time)
    frame = window.requestAnimationFrame(render)
  }

  const updatePointer = (event: PointerEvent): void => {
    const rect = layer.getBoundingClientRect()
    const within = event.clientX >= rect.left && event.clientX <= rect.right
      && event.clientY >= rect.top && event.clientY <= rect.bottom
    active = within
    if (within) {
      target.x = event.clientX - rect.left
      target.y = event.clientY - rect.top
    }
  }
  const releasePointer = (): void => { active = false }
  const updateVisibility = (): void => { visible = !document.hidden }

  const observer = new ResizeObserver(resize)
  observer.observe(layer)
  window.addEventListener('pointermove', updatePointer, { passive: true })
  window.addEventListener('pointerleave', releasePointer)
  document.addEventListener('visibilitychange', updateVisibility)
  resize()
  if (media.matches) draw(0)
  else frame = window.requestAnimationFrame(render)

  return () => {
    window.cancelAnimationFrame(frame)
    observer.disconnect()
    window.removeEventListener('pointermove', updatePointer)
    window.removeEventListener('pointerleave', releasePointer)
    document.removeEventListener('visibilitychange', updateVisibility)
    context.clearRect(0, 0, canvas.width, canvas.height)
    layer.remove()
  }
}

/**
 * Mount the ambience for the lifetime of this plugin fiber.
 * @param ctx - the client plugin context.
 */
/**
 * Mount the ambience for the lifetime of this plugin fiber.
 * @param ctx - the client plugin context.
 * @param options - active preset and layer intensity.
 * @returns a disposer that removes the layer and restarts it on change.
 */
export function mountPointerTrails(ctx: Context, options: () => { preset: AwStudioPresetId; intensity: number }): () => void {
  let dispose: (() => void) | undefined
  const restart = (): void => {
    dispose?.()
    dispose = ctx.effect(() => {
      const current = options()
      return mountTrails(current.preset, current.intensity)
    }, 'dsh-aw-studio: ambient canvas')
  }
  restart()
  return () => { dispose?.(); dispose = undefined }
}
