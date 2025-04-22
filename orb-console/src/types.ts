export type Tab = "packages" | "systems" | "allow" | "vulns";

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

export type VulnSeverity = {
  type: string;
  score: string;
};

export type VulnInfo = {
  id: string;
  references: VulnReference[];
  severity: VulnSeverity[] | null;
  summary: string | null;
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

export type Tenant = {
  key: string;
  name: string;
};

export type ValidationResult = {
  dep_manifest: string;
  missing: number[];
  unrequired: number[];
  misdefined: number[];
  undefined: number[];
};
