export interface HudApi {
  setHealth(value: number): void;
  setAmmo(current: number, reserve: number): void;
  setScore(value: number, total: number): void;
  setFps(value: number): void;
  showHit(): void;
  toast(message: string): void;
}

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`HUD element #${id} is missing`);
  return element as T;
}

export function createHud(): HudApi {
  const health = requiredElement<HTMLElement>('health');
  const healthFill = requiredElement<HTMLElement>('health-fill');
  const ammo = requiredElement<HTMLElement>('ammo');
  const reserve = requiredElement<HTMLElement>('reserve');
  const score = requiredElement<HTMLElement>('score');
  const fps = requiredElement<HTMLElement>('fps');
  const hitMarker = requiredElement<HTMLElement>('hit-marker');
  const toastElement = requiredElement<HTMLElement>('toast');
  let toastTimer = 0;
  let hitTimer = 0;

  return {
    setHealth(value) {
      const safe = Math.max(0, Math.min(100, Math.round(value)));
      health.textContent = String(safe);
      healthFill.style.width = `${safe}%`;
      healthFill.classList.toggle('low', safe <= 30);
    },
    setAmmo(current, reserveValue) {
      ammo.textContent = String(Math.max(0, current));
      reserve.textContent = String(Math.max(0, reserveValue));
    },
    setScore(value, total) {
      score.innerHTML = `${Math.max(0, value)} <small>/ ${total}</small>`;
    },
    setFps(value) {
      fps.textContent = `${Math.round(value)} FPS`;
    },
    showHit() {
      hitMarker.classList.add('visible');
      window.clearTimeout(hitTimer);
      hitTimer = window.setTimeout(() => hitMarker.classList.remove('visible'), 180);
    },
    toast(message) {
      toastElement.textContent = message;
      toastElement.classList.add('visible');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toastElement.classList.remove('visible'), 2100);
    }
  };
}
