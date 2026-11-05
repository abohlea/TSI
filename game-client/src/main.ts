import {
  Application,
  FILLMODE_FILL_WINDOW,
  RESOLUTION_AUTO
} from 'playcanvas';
import './style.css';
import { buildArena } from './game/arena';
import { GameHUD } from './game/GameHUD';
import { PlayerController } from './game/PlayerController';
import { TsiFieldTestConnection } from './game/NetworkClient';
import { acquireFirebaseGameIdentity } from './firebase/firebaseAuth';

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
  const network = new TsiFieldTestConnection(app, arena);

  window.addEventListener('resize', () => app.resizeCanvas());
  window.addEventListener('beforeunload', () => {
    controls.destroy();
    void network.disconnect();
  }, { once: true });

  app.start();
  hud.showToast('ZONE D’ENTRAÎNEMENT CHARGÉE');

  const serverUrl = import.meta.env.VITE_TSI_SERVER_URL?.trim();
  const displayName = import.meta.env.VITE_TSI_DISPLAY_NAME?.trim() || 'OPERATOR';
  if (serverUrl) {
    try {
      const identity = await acquireFirebaseGameIdentity();
      await network.connect({ serverUrl, idToken: identity.idToken, displayName }, controls);
      controls.setNetwork(network);
      hud.showToast('SESSION FIREBASE AUTHENTIFIÉE');
    } catch (error) {
      console.warn('[TSI] Firebase auth or local server unavailable; remaining in offline training.', error);
      hud.showToast('AUTH/SERVEUR ABSENT — MODE ENTRAÎNEMENT');
    }
  }
}

boot().catch((error: unknown) => {
  console.error('[TSI] Startup failed:', error);
  const message = error instanceof Error ? error.message : 'Erreur inconnue au démarrage.';
  showFatalError(`Impossible de démarrer le prototype TSI : ${message}`);
});
