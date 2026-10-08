import type { BezierPoints } from '../easing-geometry';
import type { SpringConfig } from './DialStore';
import type { CustomSpring, EasingCurve, SpringMode } from '../transition-presets';

type Listener = () => void;

/** "Custom N", with the first number not in `names`. */
function nextCustomName(names: Iterable<string>): string {
  const taken = new Set(names);
  let n = 1;
  while (taken.has(`Custom ${n}`)) n++;
  return `Custom ${n}`;
}

/**
 * The user's saved custom curves and springs, shared by every transition
 * control. Saved curves and springs live
 * here for the session; a host that stores them calls setCustomCurves and
 * setCustomSprings on load and listens with subscribe to save changes.
 */
class TransitionLibraryClass {
  private curves: EasingCurve[] = [];
  private springs: CustomSpring[] = [];
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  getCustomCurves = (): EasingCurve[] => this.curves;

  setCustomCurves(curves: EasingCurve[]): void {
    this.curves = curves.map((curve) => ({ name: curve.name, ease: [...curve.ease] as BezierPoints }));
    this.notify();
  }

  /** Saves `ease` as "Custom N", the first free number, and returns it. */
  saveCustomCurve(ease: BezierPoints): EasingCurve {
    const curve: EasingCurve = { name: nextCustomName(this.curves.map((saved) => saved.name)), ease: [...ease] as BezierPoints };
    this.curves = [...this.curves, curve];
    this.notify();
    return curve;
  }

  removeCustomCurve(name: string): void {
    this.curves = this.curves.filter((curve) => curve.name !== name);
    this.notify();
  }

  getCustomSprings = (): CustomSpring[] => this.springs;

  setCustomSprings(springs: CustomSpring[]): void {
    this.springs = springs.map((saved) => ({ ...saved, spring: { ...saved.spring } }));
    this.notify();
  }

  /** Saves a Time or Physics spring as "Custom N", numbered per mode. */
  saveCustomSpring(spring: SpringConfig, mode: SpringMode): CustomSpring {
    const values: SpringConfig = mode === 'simple'
      ? { type: 'spring', visualDuration: spring.visualDuration, bounce: spring.bounce }
      : { type: 'spring', stiffness: spring.stiffness, damping: spring.damping, mass: spring.mass };
    const name = nextCustomName(this.springs.filter((saved) => saved.mode === mode).map((saved) => saved.name));
    const saved: CustomSpring = { name, mode, spring: values };
    this.springs = [...this.springs, saved];
    this.notify();
    return saved;
  }

  removeCustomSpring(name: string, mode: SpringMode): void {
    this.springs = this.springs.filter((saved) => !(saved.mode === mode && saved.name === name));
    this.notify();
  }
}

export const TransitionLibrary = new TransitionLibraryClass();
