export type Package = {
  id: number;
  name: string;
  key: string;
  version: string;
  direct_url: string | null;
};

export type SystemTag = {
  id: number;
  username: string;
  hostname: string;
  os_name: string;
  os_version: string;
  architecture: string;
  logical_cores: number;
};

export type PackageVersionEntry = {
  version: string;
  path: string;
  system_tag_id: number;
};

export type PackageVersions = {
  key: string;
  name: string;
  data: PackageVersionEntry[];
};