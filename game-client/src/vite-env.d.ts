/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TSI_LOCAL_SERVER_URL?: string;
  readonly VITE_TSI_LOCAL_DEV_TOKEN?: string;
  readonly VITE_TSI_LOCAL_DISPLAY_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
