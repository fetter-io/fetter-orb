import { VulnRecord } from "@/types";

type VulnCardProps = {
  record: VulnRecord;
  package_id: number;
  highlight?: boolean;
  onPackageClick?: (key: string) => void;
};

export function VulnCard({
  record,
  package_id,
  highlight,
  onPackageClick,
}: VulnCardProps) {
  const { package: pkg, vuln_ids, vuln_infos } = record;

  return (
    <div
      id={`vuln-pkg-${package_id}`}
      className={`p-4 border rounded-lg bg-gray-900 shadow-md text-sm text-gray-200 space-y-2 transition-colors duration-1000
        ${
          highlight
            ? "border-blue-500 bg-gray-700"
            : "border-slate-600 bg-gray-800"
        }`}
    >
      <h3 className="text-white font-semibold text-base flex items-center gap-2">
        {pkg.name}
        <span className="text-gray-400 text-sm">{pkg.version}</span>
        <button
          title="Package details"
          className="border-b border-transparent hover:border-blue-400 cursor-pointer"
          onClick={() => onPackageClick?.(pkg.key)}
        >
          📦
        </button>
      </h3>

      {vuln_ids.map((id) => {
        const vuln = vuln_infos[id];
        if (!vuln) return null;

        return (
          <div key={id} className="border-t border-slate-700 pt-2 space-y-2">
            {/* <p className="font-semibold text-red-300">{vuln.id}</p> */}

            <p className="font-semibold text-red-300">
              <a
                href={`https://osv.dev/vulnerability/${vuln.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {vuln.id}
              </a>
            </p>

            {vuln.summary && <p className="text-gray-400">{vuln.summary}</p>}

            <div className="text-xs text-gray-400 space-y-1">
              {vuln.severity && vuln.severity.length > 0 && (
                <div className="mt-1">
                  <span className="text-gray-500 text-sm font-semibold block mb-1">
                    Severity
                  </span>
                  <div className="grid grid-cols-1 bg-slate-800 rounded-md overflow-hidden divide-y divide-slate-700">
                    {vuln.severity.map((sev, i) => {
                      const type = sev.type.toUpperCase(); // Normalize for consistency
                      let baseUrl = null;

                      if (type === "CVSS_V4") {
                        baseUrl = "https://www.first.org/cvss/calculator/4-0#";
                      } else if (type === "CVSS_V3") {
                        baseUrl = "https://www.first.org/cvss/calculator/3-1#";
                      } else if (type === "CVSS_V2") {
                        baseUrl = "https://www.first.org/cvss/calculator/2-0#";
                      }

                      const href = baseUrl ? `${baseUrl}${sev.score}` : null;

                      return (
                        <div
                          key={`${id}-sev-${i}`}
                          className="px-2 py-1 text-slate-400 text-sm"
                        >
                          {href ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:underline break-all"
                            >
                              {sev.score}
                            </a>
                          ) : (
                            sev.score
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {vuln.references.length > 0 && (
                <div className="mt-1">
                  <span className="text-gray-500 text-sm font-semibold block mb-1">
                    References
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 bg-slate-800 rounded-md overflow-hidden divide-y divide-slate-700">
                    {vuln.references.map((ref, i) => {
                      let hostname = "";
                      try {
                        hostname = new URL(ref.url).hostname.replace(
                          /^www\./,
                          "",
                        );
                      } catch {
                        hostname = "invalid.url";
                      }

                      const label = `${ref.type.charAt(0).toUpperCase()}${ref.type.slice(1).toLowerCase()} (${hostname})`;

                      return (
                        <a
                          key={`${id}-ref-${i}`}
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:underline break-all px-2 py-1 text-sm"
                        >
                          {label}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
