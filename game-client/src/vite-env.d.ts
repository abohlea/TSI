/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_AUTH_EMULATOR_URL?: string;
  readonly VITE_TSI_SERVER_URL?: string;
  readonly VITE_TSI_DISPLAY_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
