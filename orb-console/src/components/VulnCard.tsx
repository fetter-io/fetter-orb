import { VulnRecord } from "@/types";

type VulnCardProps = {
  record: VulnRecord;
};

export function VulnCard({ record }: VulnCardProps) {
  const { package: pkg, vuln_ids, vuln_infos } = record;

  return (
    <div className="p-4 border border-red-500 rounded-lg bg-slate-900 shadow-md text-sm text-gray-200 space-y-2">
      <h3 className="text-red-400 font-semibold text-base">
        {pkg.name}{" "}
        <span className="text-sm text-gray-400">({pkg.version})</span>
      </h3>

      {vuln_ids.map((id) => {
        const vuln = vuln_infos[id];
        if (!vuln) return null;

        return (
          <div key={id} className="border-t border-slate-700 pt-2">
            <p className="font-semibold text-red-300">{vuln.id}</p>

            {vuln.summary && (
              <p className="text-gray-400 mb-1">{vuln.summary}</p>
            )}

            <div className="text-xs text-gray-400 space-y-1">
              {vuln.severity?.map((sev, i) => (
                <div key={`${id}-sev-${i}`}>
                  <span className="text-gray-500">{sev.type}:</span>{" "}
                  {sev.score}
                </div>
              ))}

              <div className="mt-1">
                <span className="text-gray-500">References:</span>
                <ul className="list-disc list-inside ml-2 space-y-0.5">
                  {vuln.references.map((ref, i) => (
                    <li key={`${id}-ref-${i}`}>
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        {ref.type}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
