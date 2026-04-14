export type ConfigCategory = "IAM" | "K8S" | "AI" | "SEMAPHORE" | "PROVISION" | "BILLING" | "GENERAL";
export type TabKey = "nodes" | "core" | "console";

export interface ConfigEntry {
  category: ConfigCategory;
  key: string;
  value: string;
  sensitive: boolean;
  description: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

export type ConfigMap = Record<ConfigCategory, ConfigEntry[]>;

export interface FieldMeta {
  key: string;
  label: string;
  sensitive?: boolean;
  type?: "text" | "password" | "textarea";
  description?: string;
}

export interface TestStep { name: string; success: boolean; message: string }
export interface TestResult { success: boolean; steps: TestStep[] }

export interface IamMessages {
  providerLabel: string;
  unsaved: string;
  testBtn: string;
  testing: string;
  testPassed: string;
  testFailed: string;
  saveBtn: string;
  saving: string;
  savedOk: string;
  unchangedHint: string;
  loginRequired: string;
}

export interface PamMessages {
  providerLabel: string;
  unsaved: string;
  mfaLabel: string;
  mfaPlaceholder: string;
  testBtn: string;
  testing: string;
  testPassed: string;
  testFailed: string;
  saveBtn: string;
  saving: string;
  savedOk: string;
  unchangedHint: string;
}

export interface SemaphoreMessages {
  unsaved: string;
  testBtn: string;
  testing: string;
  testPassed: string;
  testFailed: string;
  saveBtn: string;
  saving: string;
  savedOk: string;
  unchangedHint: string;
  loadProjectsBtn: string;
  loadingProjects: string;
  projectLabel: string;
  projectPlaceholder: string;
  repoSection: string;
  repoName: string;
  repoUrl: string;
  repoBranch: string;
  repoToken: string;
  repoTokenHint: string;
  playbookSection: string;
  playbookDesc: string;
  varGroupSection: string;
  varGroupName: string;
  envSection: string;
  envPlaceholder: string;
  loadEnvsBtn: string;
  createBtn: string;
  creating: string;
  createOk: string;
  createFailed: string;
  varKeys: { key: string; label: string; placeholder: string }[];
}

export interface NodesMessages {
  sectionTitle: string;
  description: string;
  refresh: string;
  addNode: string;
  loading: string;
  empty: string;
  delete: string;
  statusChangeFailed: string;
  credentialsTitle: string;
  credentialsSaved: string;
  credentialsSaveFailed: string;
  testBtn: string;
  testing: string;
  testPassed: string;
  testFailed: string;
  editCredentials: string;
  saveCredentials: string;
  savingCredentials: string;
  cancelCredentials: string;
  derivedApiUrlLabel: string;
  columns: { hostname: string; ip: string; type: string; status: string; api: string; metrics: string; actions: string };
  apiStatus: { connected: string; noCredentials: string };
  form: {
    title: string;
    submitting: string;
    submit: string;
    hostname: { label: string; placeholder: string };
    ip: { label: string; placeholder: string };
    type: string;
    description: { label: string; placeholder: string };
    registerFailed: string;
  };
  credentials: {
    proxmoxNode: { label: string; placeholder: string };
    apiToken: { label: string; placeholder: string };
  };
  isolateBtn: string;
  restoreBtn: string;
  autoDetect: string;
  detecting: string;
  detected: {
    title: string;
    noSeedNode: string;
    noNew: string;
    importBtn: string;
    importAll: string;
    importing: string;
    importFailed: string;
  };
  confirm: {
    delete: { title: string; message: string; deleting: string; confirm: string; cancel: string };
    isolate: { title: string; message: string; isolating: string; confirm: string; cancel: string };
    restore: { title: string; message: string; restoring: string; confirm: string; cancel: string };
  };
}

export interface BackendMessages {
  title: string;
  description: string;
  urlLabel: string;
  urlPlaceholder: string;
  envHint: string;
  testBtn: string;
  testing: string;
  testPassed: string;
  testFailed: string;
  saveBtn: string;
  saving: string;
  savedOk: string;
  saveFailed: string;
}

export interface K8sMessages {
  title: string;
  description: string;
  apiServerLabel: string;
  apiServerPlaceholder: string;
  tokenLabel: string;
  tokenPlaceholder: string;
  testBtn: string;
  testing: string;
  testPassed: string;
  testFailed: string;
  saveBtn: string;
  saving: string;
  savedOk: string;
  saveFailed: string;
}

export interface BillingMessages {
  providerLabel: string;
  unsaved: string;
  testBtn: string;
  testing: string;
  testPassed: string;
  testFailed: string;
  saveBtn: string;
  saving: string;
  savedOk: string;
  unchangedHint: string;
}

export interface IntegrationsMessages {
  title: string;
  description: string;
  loading: string;
  saveFailed: string;
  columns: { key: string; value: string; source: string };
  actions: { edit: string; save: string; saving: string; cancel: string; delete: string };
  sensitivePlaceholder: string;
  deleteConfirm: string;
  descriptions: Record<string, string>;
  tabs: { nodes: string; core: string; console: string };
  iam: IamMessages;
  pam: PamMessages;
  k8s: K8sMessages;
  backend: BackendMessages;
  semaphore: SemaphoreMessages;
  billing: BillingMessages;
  nodes: NodesMessages;
}
