export interface InputFrame {
  moveX: number;
  moveY: number;
  yawDelta: number;
  pitchDelta: number;
  shoot: boolean;
  sprint: boolean;
  reload: boolean;
  aim: boolean;
}

export class GameInput {
  private readonly keys = new Set<string>();
  private readonly frame: InputFrame = {
    moveX: 0, moveY: 0, yawDelta: 0, pitchDelta: 0,
    shoot: false, sprint: false, reload: false, aim: false
  };
  private movePointer: number | null = null;
  private lookPointer: number | null = null;
  private moveOrigin = { x: 0, y: 0 };
  private lookLast = { x: 0, y: 0 };
  private fireHeld = false;
  private sprintHeld = false;
  private aimHeld = false;
  private readonly movePad: HTMLElement;
  private readonly moveStick: HTMLElement;
  private readonly lookZone: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly listeners: Array<() => void> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.movePad = this.required('move-pad');
    this.moveStick = this.required('move-stick');
    this.lookZone = this.required('look-zone');
    this.bind(window, 'keydown', this.onKeyDown as EventListener);
    this.bind(window, 'keyup', this.onKeyUp as EventListener);
    this.bind(window, 'blur', this.onBlur as EventListener);
    this.bind(document, 'mousemove', this.onMouseMove as EventListener);
    this.bind(canvas, 'mousedown', this.onMouseDown as EventListener);
    this.bind(canvas, 'contextmenu', this.preventDefault as EventListener);
    this.bind(this.movePad, 'pointerdown', this.onMoveStart as EventListener);
    this.bind(this.movePad, 'pointermove', this.onMoveMove as EventListener);
    this.bind(this.movePad, 'pointerup', this.onMoveEnd as EventListener);
    this.bind(this.movePad, 'pointercancel', this.onMoveEnd as EventListener);
    this.bind(this.lookZone, 'pointerdown', this.onLookStart as EventListener);
    this.bind(this.lookZone, 'pointermove', this.onLookMove as EventListener);
    this.bind(this.lookZone, 'pointerup', this.onLookEnd as EventListener);
    this.bind(this.lookZone, 'pointercancel', this.onLookEnd as EventListener);

    const fire = this.required('fire-button');
    this.bind(fire, 'pointerdown', this.onFireStart as EventListener);
    this.bind(fire, 'pointerup', this.onFireEnd as EventListener);
    this.bind(fire, 'pointercancel', this.onFireEnd as EventListener);
    const sprint = this.required('sprint-button');
    this.bind(sprint, 'pointerdown', this.onSprintStart as EventListener);
    this.bind(sprint, 'pointerup', this.onSprintEnd as EventListener);
    this.bind(sprint, 'pointercancel', this.onSprintEnd as EventListener);
    this.bind(this.required('reload-button'), 'pointerdown', this.onReload as EventListener);
    this.bind(window, 'mouseup', this.onMouseUp as EventListener);
  }

  private required(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing input element #${id}`);
    return element;
  }

  private bind(target: EventTarget, type: string, listener: EventListener): void {
    target.addEventListener(type, listener, { passive: false });
    this.listeners.push(() => target.removeEventListener(type, listener));
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    if (event.code === 'KeyR' && !event.repeat) this.frame.reload = true;
  };

  private onKeyUp = (event: KeyboardEvent): void => { this.keys.delete(event.code); };
  private onBlur = (): void => {
    this.keys.clear();
    this.fireHeld = false;
    this.sprintHeld = false;
    this.aimHeld = false;
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (document.pointerLockElement === this.canvas) {
      this.frame.yawDelta -= event.movementX * 0.12;
      this.frame.pitchDelta -= event.movementY * 0.09;
    }
  };

  private onMouseDown = (event: MouseEvent): void => {
    if (event.button === 0) {
      if (document.pointerLockElement === this.canvas) this.fireHeld = true;
      else void this.canvas.requestPointerLock?.();
    }
    if (event.button === 2) this.aimHeld = true;
  };

  private onMouseUp = (event: MouseEvent): void => {
    if (event.button === 0) this.fireHeld = false;
    if (event.button === 2) this.aimHeld = false;
  };

  private preventDefault = (event: Event): void => event.preventDefault();

  private onMoveStart = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse') return;
    this.movePointer = event.pointerId;
    const rect = this.movePad.getBoundingClientRect();
    this.moveOrigin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    this.movePad.setPointerCapture(event.pointerId);
    this.updateMove(event.clientX, event.clientY);
    event.preventDefault();
  };

  private onMoveMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.movePointer) return;
    this.updateMove(event.clientX, event.clientY);
    event.preventDefault();
  };

  private onMoveEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.movePointer) return;
    this.movePointer = null;
    this.frame.moveX = 0;
    this.frame.moveY = 0;
    this.moveStick.style.transform = 'translate(0, 0)';
  };

  private updateMove(x: number, y: number): void {
    const dx = x - this.moveOrigin.x;
    const dy = y - this.moveOrigin.y;
    const max = 42;
    const length = Math.hypot(dx, dy);
    const factor = length > max ? max / length : 1;
    const nx = dx * factor;
    const ny = dy * factor;
    this.frame.moveX = nx / max;
    this.frame.moveY = -ny / max;
    this.moveStick.style.transform = `translate(${nx}px, ${ny}px)`;
  }

  private onLookStart = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse') return;
    this.lookPointer = event.pointerId;
    this.lookLast = { x: event.clientX, y: event.clientY };
    this.lookZone.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  private onLookMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.lookPointer) return;
    this.frame.yawDelta -= (event.clientX - this.lookLast.x) * 0.22;
    this.frame.pitchDelta -= (event.clientY - this.lookLast.y) * 0.18;
    this.lookLast = { x: event.clientX, y: event.clientY };
    event.preventDefault();
  };

  private onLookEnd = (event: PointerEvent): void => {
    if (event.pointerId === this.lookPointer) this.lookPointer = null;
  };

  private onFireStart = (event: PointerEvent): void => { this.fireHeld = true; event.preventDefault(); };
  private onFireEnd = (event: PointerEvent): void => { this.fireHeld = false; event.preventDefault(); };
  private onSprintStart = (event: PointerEvent): void => { this.sprintHeld = true; event.preventDefault(); };
  private onSprintEnd = (event: PointerEvent): void => { this.sprintHeld = false; event.preventDefault(); };
  private onReload = (event: PointerEvent): void => { this.frame.reload = true; event.preventDefault(); };

  read(): InputFrame {
    const forward = this.keys.has('KeyW') || this.keys.has('ArrowUp') || this.keys.has('KeyZ');
    const backward = this.keys.has('KeyS') || this.keys.has('ArrowDown');
    const left = this.keys.has('KeyA') || this.keys.has('ArrowLeft') || this.keys.has('KeyQ');
    const right = this.keys.has('KeyD') || this.keys.has('ArrowRight');
    const keyboardX = Number(right) - Number(left);
    const keyboardY = Number(forward) - Number(backward);
    const useTouch = this.movePointer !== null;
    const moveX = useTouch ? this.frame.moveX : keyboardX;
    const moveY = useTouch ? this.frame.moveY : keyboardY;
    const magnitude = Math.hypot(moveX, moveY);
    this.frame.moveX = magnitude > 1 ? moveX / magnitude : moveX;
    this.frame.moveY = magnitude > 1 ? moveY / magnitude : moveY;
    this.frame.shoot = this.fireHeld;
    this.frame.sprint = this.sprintHeld || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.keys.has('Space');
    this.frame.aim = this.aimHeld;
    const result = { ...this.frame };
    this.frame.yawDelta = 0;
    this.frame.pitchDelta = 0;
    this.frame.reload = false;
    return result;
  }

  destroy(): void {
    this.listeners.forEach((remove) => remove());
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }
}
