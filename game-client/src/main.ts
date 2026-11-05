import {
  Application,
  FILLMODE_FILL_WINDOW,
  RESOLUTION_AUTO
} from 'playcanvas';
import './style.css';
import { buildArena } from './game/arena';
import { GameHUD } from './game/GameHUD';
import { PlayerController } from './game/PlayerController';

function showFatalError(message: string): void {
  const shell = document.getElementById('game-shell');
  if (!shell) return;
  const panel = document.createElement('section');
  panel.style.cssText = [
    'position:absolute',
    'z-index:20',
    'inset:20px',
    'display:grid',
    'place-content:center',
    'padding:24px',
    'background:#07111b',
    'color:#fff',
    'font:600 14px/1.6 system-ui',
    'text-align:center'
  ].join(';');
  panel.textContent = message;
  shell.appendChild(panel);
}

async function boot(): Promise<void> {
  const canvas = document.getElementById('application');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('Le canvas de rendu TSI est introuvable.');
  }

  const app = new Application(canvas);
  app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(RESOLUTION_AUTO);
  app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

  const arena = buildArena(app);
  const hud = new GameHUD();
  const controls = new PlayerController(app, arena, canvas, hud);

  window.addEventListener('resize', () => app.resizeCanvas());
  window.addEventListener('beforeunload', () => controls.destroy(), { once: true });

  app.start();
  hud.showToast('ZONE D’ENTRAÎNEMENT CHARGÉE');
}

boot().catch((error: unknown) => {
  console.error('[TSI] Startup failed:', error);
  const message = error instanceof Error ? error.message : 'Erreur inconnue au démarrage.';
  showFatalError(`Impossible de démarrer le prototype TSI : ${message}`);
});
