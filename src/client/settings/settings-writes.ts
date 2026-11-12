/** Plugin-owned state for ordered appearance-setting writes. */
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import { isTrailIntensity } from '../../settings-contract.ts'
import type { AwStudioSettings } from '../../settings-contract.ts'

/** The latest write outcome; an unknown outcome requires a fresh page load. */
export interface SettingsWriteSnapshot {
  status: 'idle' | 'pending' | 'refused' | 'unknown' | 'invalid'
}

/** Serializes user gestures and contains failures until the plugin is disposed. */
export class SettingsWrites {
  private current: SettingsWriteSnapshot = Object.freeze({ status: 'idle' })
  private readonly listeners = new Set<() => void>()
  private disposed = false

  constructor(private readonly form: Pick<ConfigForm<AwStudioSettings>, 'set'>) {}

  /** @returns The current immutable write state. */
  readonly getSnapshot = (): SettingsWriteSnapshot => this.current

  /** @param listener - Notified when write state changes. @returns The subscription disposer. */
  readonly subscribe = (listener: () => void): (() => void) => {
    if (this.disposed) return () => {}
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /**
   * Attempt one field write; concurrent gestures and writes after an unknown outcome are ignored.
   * @param field - Appearance field to update.
   * @param value - New value for the field.
   * @returns Settlement after acceptance, refusal, or an unconfirmed outcome is published.
   */
  async set<K extends keyof AwStudioSettings>(field: K, value: AwStudioSettings[K]): Promise<void> {
    if (this.disposed || this.current.status === 'pending' || this.current.status === 'unknown') return
    if (field === 'trailIntensity' && !isTrailIntensity(value)) { this.publish('invalid'); return }
    this.publish('pending')
    if (this.disposed) return
    try {
      const accepted = await this.form.set(field, value)
      this.publish(accepted ? 'idle' : 'refused')
    } catch (_error) {
      this.publish('unknown')
    }
  }

  /** Stop notifications and prevent further writes; an admitted write remains observed. */
  dispose(): void {
    this.disposed = true
    this.listeners.clear()
  }

  private publish(status: SettingsWriteSnapshot['status']): void {
    if (this.disposed) return
    this.current = Object.freeze({ status })
    for (const listener of this.listeners) listener()
  }
}
