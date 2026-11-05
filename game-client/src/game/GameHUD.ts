import type { HUDPort } from './PlayerController';

export class GameHUD implements HUDPort {
  private readonly ammoElement = document.getElementById('ammo');
  private readonly reserveElement = document.querySelector('.ammo-total');
  private readonly killsElement = document.getElementById('kills');
  private readonly accuracyElement = document.getElementById('accuracy');
  private readonly statusElement = document.getElementById('game-status');
  private readonly toastElement = document.getElementById('toast');
  private toastTimer = 0;

  setAmmo(current: number, reserve: number): void {
    if (this.ammoElement) this.ammoElement.textContent = String(current).padStart(2, '0');
    if (this.reserveElement) this.reserveElement.textContent = `/ ${reserve}`;
  }

  setStats(kills: number, accuracy: number, status: string): void {
    if (this.killsElement) this.killsElement.textContent = String(kills).padStart(2, '0');
    if (this.accuracyElement) this.accuracyElement.textContent = accuracy > 0 ? `${accuracy}%` : '—';
    if (this.statusElement) this.statusElement.textContent = status;
  }

  showToast(message: string): void {
    if (!this.toastElement) return;
    this.toastElement.textContent = message;
    this.toastElement.classList.add('visible');
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastElement?.classList.remove('visible');
      this.toastTimer = 0;
    }, 900);
  }
}
