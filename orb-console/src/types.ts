export type Tab =
  | "packages"
  | "systems"
  | "allow"
  | "vulns"
  | "tenant"
  | "account";

export type UUID = string;

export type Package = {
  id: number;
  name: string;
  key: string;
  version: string;
  direct_url: string | null;
};

export type Ping = {
  timestamp: string;
  scanned: boolean;
};

export type SystemTag = {
  id: number;
  username: string;
  hostname: string;
  os_name: string;
  os_version: string;
  architecture: string;
  logical_cores: number;
  pings: Ping[];
  site_packages: string[];
};

export type PackageVersionEntry = {
  package_id: number;
  version: string;
  path: string;
  system_tag_id: number;
  system_tag_username: string;
  system_tag_hostname: string;
};

export type PackageVersions = {
  key: string;
  name: string;
  data: PackageVersionEntry[];
};

export type PackageCountsRecord = {
  start: string;
  end: string;
  count: number;
};

export type VulnReference = {
  type: string;
  url: string;
};

export type CvssDetail = {
  version: string;
  vector: string;
  score: number;
  severity: string;
};

export type VulnInfo = {
  id: string;
  summary: string | null;
  references: VulnReference[];
  cvss_details: CvssDetail[] | null;
};

export type VulnRecord = {
  package: {
    direct_url: string | null;
    key: string;
    name: string;
    version: string;
  };
  vuln_ids: string[];
  vuln_infos: Record<string, VulnInfo>;
};

export type AuditEntry = {
  package_id: number; // this is a package id!
  record: VulnRecord;
};

export type UserRecord = {
  id: UUID;
  github_login: string;
  github_id: number;
  email: string | null;
  name: string | null;
  tenant_limit: number;
  term_accepted: boolean;
  created_at: string;
};

export type Tenant = {
  key: string;
  name: string;
  ping_limit: number;
  created_by: UUID;
};

export type ValidationEntry = [number, [string, string] | null, string | null];

export type ValidationResult = {
  dep_manifest: string;
  superset: boolean;
  subset: boolean;
  missing: ValidationEntry[];
  unrequired: ValidationEntry[];
  misdefined: ValidationEntry[];
  undefined: ValidationEntry[];
};
