"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ImageLightbox } from "@/components/ImageLightbox";
import { Weave } from "@/components/Weave";
import { Footer } from "@/components/Footer";
import { AllowIcon } from "@/components/AllowIcon";
import colors from "tailwindcss/colors";

type Chapter = {
  id: string;
  title: string;
  content: React.ReactNode;
};

// Reusable style definitions
const styles = {
  chapterTitle: "text-xl font-bold text-white mb-2",
  sectionTitle:
    "text-xl font-semibold text-slate-400/80 mb-2 mt-6 border-t-2 border-slate-500/50",
  infoBoxTitle: "text-xl font-semibold text-slate-400/80 mb-2",
  warningBoxTitle: "text-lg font-semibold text-yellow-400 mb-2",
  bodyText: "text-gray-300 text-md leading-tight",

  infoBox: "bg-slate-800 rounded-sm px-4 py-2 border border-slate-700",
  warningBox:
    "bg-yellow-900/20 border border-yellow-800 rounded-sm py-2 px-4 mt-4 leading-tight",

  screenshotBox: "px-0 pt-2",
  screenshotLabel: "text-gray-400 text-sm pl-4",

  list: "list-none list-inside text-gray-300 space-y-2 mb-2 px-4 leading-tight",
  orderedList:
    "list-decimal list-inside text-gray-300 space-y-0 px-4 leading-tight",

  codeBlock:
    "bg-slate-950 px-4 py-2 my-2 ml-2 rounded text-xs text-blue-300/80 font-semibold overflow-x-auto border border-slate-700",

  link: "text-slate-400 hover:text-blue-300",
};

export default function DocsPage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const chapters: Chapter[] = [
    {
      id: "getting-started",
      title: "Getting Started",
      content: (
        <div className="space-y-4">
          <h2 className={styles.chapterTitle}>Getting Started</h2>

          <p className={styles.bodyText}>
            Fetter IO is a web-application for aggregating information about
            Python packages on all of your (or your organization&apos;s)
            systems. With this information, comprehensive supply-chain
            monitoring is possible. Fetter IO permits searching among all
            packages, displaying detailed vulnerability information, and
            applying a global allow list.
          </p>

          <p className={styles.bodyText}>
            This guide will help you get up and running with Fetter IO,
            including creating an account, performing your first scan, and using
            the Fetter IO Console.
          </p>

          <div className={styles.infoBox}>
            <h3 className={`${styles.infoBoxTitle}`}>Prerequisites</h3>
            <ul className={styles.list}>
              <li>
                A{" "}
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  GitHub
                </a>{" "}
                account for authentication.
              </li>
              <li>
                Python or Rust tools (like <code>pip</code> or{" "}
                <code>cargo</code>) for installing packages or crates.
              </li>
              <li>
                One or more Python environments on a system running Linux or
                MacOS.
              </li>
            </ul>
          </div>

          <h3 className={styles.sectionTitle}>Creating an Account</h3>

          <p className={styles.bodyText}>
            For greater security, Fetter IO uses GitHub for identity management.
            After clicking the &quot;Sign in with GitHub&quot; button, providing
            GitHub credentials, and accepting the terms, you will be provisioned
            an account and presented with the Fetter IO Console.
          </p>

          <h3 className={styles.sectionTitle}>Navigating the Console</h3>

          <p className={styles.bodyText}>
            The Console features six tabs, as well as common interfaces to
            select Tenant and to logout. Many tabs also feature a System
            selector and an refresh button.
          </p>

          <div className={styles.infoBox}>
            <h3 className={styles.infoBoxTitle}>Console Tabs</h3>
            <ul className={styles.list}>
              <li>📦 Packages</li>
              <li>⚠️ Vulnerabilities</li>
              <li>🔓 Allow List</li>
              <li>🖥️ Systems</li>
              <li>🏢 Tenants</li>
              <li>⚙️ Account</li>
            </ul>
          </div>

          <p className={styles.bodyText}>
            Most Console tabs will be empty until you begin uploading package
            scan data.
          </p>

          <div className={styles.screenshotBox}>
            <div className={styles.screenshotLabel}>
              Screenshot: On first logging in, the Packages tab will be empty.
            </div>
            <ImageLightbox
              src="/doc-new.png"
              alt="Empty account"
              width={1200}
              height={800}
            />
          </div>


          <h3 className={styles.sectionTitle}>Managing Your Account</h3>

          <p className={styles.bodyText}>
            The Account tab (⚙️) displays all information specific to your
            account, including GitHub login and (optionally) GitHub email and
            name.
          </p>

          <p className={styles.bodyText}>
            You can delete your account and all associated data at any time with
            the &quot;Delete Account&quot; button; this operation cannot be
            undone.
          </p>


          <div className={styles.screenshotBox}>
            <div className={styles.screenshotLabel}>
              Screenshot: The Account tab.
            </div>
            <ImageLightbox
              src="/doc-account.png"
              alt="Account tab"
              width={1200}
              height={800}
            />
          </div>

          <div className={styles.warningBox}>
            <h3 className={styles.warningBoxTitle}>Note</h3>
            <p className={styles.bodyText}>
              Fetter IO will never share or sell your information with
              third-parties unless required by law.
            </p>
          </div>

          <h3 className={styles.sectionTitle}>Up Next</h3>

          <p className={styles.bodyText}>
            In the next section we will learn how to use and create Tenants.
          </p>
        </div>
      ),
    },
    //--------------------------------------------------------------------------
    {
      id: "creating-tenant",
      title: "Using & Creating Tenants",
      content: (
        <div className="space-y-4">
          <h2 className={styles.chapterTitle}>Using & Creating Tenants</h2>

          <p className={styles.bodyText}>
            Fetter IO groups package data from one or more systems under a
            Tenant. Each Tenant offers its own isolated environment for tracking
            packages, vulnerabilities, and systems, and each Tenant defines a
            configurable allow list. Additionally, Tenant configuration includes
            defining which systems are active in &quot;All Systems&quot;
            displays.
          </p>

          <h3 className={styles.sectionTitle}>Tenant Attributes</h3>

          <p className={styles.bodyText}>
            Every Tenant has a name, a key, and a maximum number of updates
            permitted per day.
          </p>

          <ul className={styles.list}>
            <li>
              <b>Name</b>: A label that can be renamed only by the Tenant
              creator.
            </li>
            <li>
              <b>Key</b>: A 64-character code unique to this Tenant.
            </li>
            <li>
              <b>Updates per day</b>: The maximum number of times systems can
              post scans to this Tenant per 24-hour period.
            </li>
          </ul>

          <div className={styles.warningBox}>
            <h3 className={styles.warningBoxTitle}>Note</h3>
            <p className={styles.bodyText}>
              Limit Tenant key access to those who will post scans to your
              Tenant. The Tenant key cannot be used to access your account. Only
              the Tenant creator can rename or modify Tenant settings.
            </p>
          </div>

          <h3 className={styles.sectionTitle}>Creating a new Tenant</h3>

          <p className={styles.bodyText}>
            On account creation, each user is given a default Tenant named
            &quot;Self&quot;. Users can create, by default, up to two Tenants.
            The following steps explain how to create a new Tenant.
          </p>

          <ol className={styles.orderedList}>
            <li>Navigate to the Tenant tab (🏢)</li>
            <li>
              Click the <span className="inline-block">＋</span> button.
            </li>
            <li>Provide a valid name and select &quot;Create&quot;</li>
          </ol>

          <h3 className={styles.sectionTitle}>Tenant Usage & Display</h3>

          <p className={styles.bodyText}>
            Every Tenant associated with your account will be listed in the
            Tenant tab (🏢). The Tenant display provides the name, key, and
            number of updates per day, as well as information on two ways to
            post package scan data to the Tenant:
          </p>

          <ol className={styles.orderedList}>
            <li>
              Using the <code>fetter</code> command-line application.
            </li>
            <li>
              Installing the <code>fetter</code> endpoint agent as a service.
            </li>
          </ol>

          <div className={styles.screenshotBox}>
            <div className={styles.screenshotLabel}>
              This screenshot depicts...
            </div>
            <ImageLightbox
              src="/doc-tenant.png"
              alt="Tenant Creation Interface"
              width={1200}
              height={800}
            />
          </div>

          <h3 className={styles.sectionTitle}>Up Next</h3>

          <p className={styles.bodyText}>
            In the next section we will use the <code>fetter</code> command-line
            application to post a package scan.
          </p>
        </div>
      ),
    },
    //--------------------------------------------------------------------------
    {
      id: "installing-fetter",
      title: "Installing & Using Fetter",
      content: (
        <div className="space-y-4">
          <h2 className={styles.chapterTitle}>Installing & Using Fetter</h2>

          <p className={styles.bodyText}>
            Fetter IO is designed to work with package data obtained from the
            open-source <code>fetter</code> command-line application. There are
            multiple ways to publish package scans with <code>fetter</code>. In
            the example below we will use the most explicit approach: installing
            and calling <code>fetter</code> directly.
          </p>

          <p className={styles.bodyText}>
            The Fetter command-line application finds all Python environments,
            and all packages installed in that environment, across an entire
            system. Using the <code>monitor-scan</code> command, that scan data
            can be uploaded to your Fetter IO Tenant.
          </p>

          <h3 className={styles.sectionTitle}>Installing Fetter</h3>

          <p className={styles.bodyText}>
            For Python users, installing <code>fetter</code> with Python
            packaging tools is convenient.
          </p>

          <div className={styles.infoBox}>
            <h3 className={styles.infoBoxTitle}>Python Installation</h3>
            <p className={styles.bodyText}>
              If installing into a virtual environment or default{" "}
              <code>site-packages</code>, use <code>pip</code>. After
              installation, use <code>fetter --version</code> to test your
              installation.
            </p>
            <pre className={styles.codeBlock}>
              <span className="text-slate-500">$</span> pip install fetter{"\n"}
              <span className="text-slate-500">$</span> fetter --version
            </pre>

            <p className={styles.bodyText}>
              Alternatively, <code>fetter</code> can be installed outside of a
              virtual environment as a standalone binary via{" "}
              <a
                href="https://github.com/pypa/pipx"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                <code>pipx</code>
              </a>
              . Calling <code>pipx ensurepath</code> might be necessary to
              ensure the binary is discoverable.
            </p>

            <pre className={styles.codeBlock}>
              <span className="text-slate-500">$</span> pipx install fetter{"\n"}
              <span className="text-slate-500">$</span> pipx ensurepath{"\n"}
              <span className="text-slate-500">$</span> fetter --version
            </pre>

            <p className={styles.bodyText}>
              A lightweight installation is possible with the <code>uvx</code>{" "}
              command (part of{" "}
              <a
                href="https://docs.astral.sh/uv/getting-started/installation/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                <code>uv</code>
              </a>
              ). With this approach, an ephemeral installation is created upon
              which commands can be immediately executed.
            </p>

            <pre className={styles.codeBlock}>
              <span className="text-slate-500">$</span> uvx fetter --version
            </pre>
          </div>

          <div className={styles.infoBox}>
            <h3 className={styles.infoBoxTitle}>Rust Installation</h3>
            <p className={styles.bodyText}>
              Using{" "}
              <a
                href="https://doc.rust-lang.org/cargo/getting-started/installation.html"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                <code>cargo</code>
              </a>
              , <code>fetter</code> can be easily compiled and installed. On
              most platforms this will put the <code>fetter</code> command-line
              application in a directory that is already in your search path.
              Use <code>fetter --version</code> to test your installation.
            </p>
            <pre className={styles.codeBlock}>
              <span className="text-slate-500">$</span> cargo install fetter{"\n"}
              <span className="text-slate-500">$</span> fetter --version
            </pre>

            <p className={styles.bodyText}>
              To specify an alternative <code>bin</code> location, provide a
              different <code>--root</code> to <code>cargo</code>. For example,
              the command below installs <code>fetter</code> in{" "}
              <code>/usr/local/bin</code>:
            </p>
            <pre className={styles.codeBlock}>
              <span className="text-slate-500">$</span> sudo cargo install --root /usr/local fetter{"\n"}
              <span className="text-slate-500">$</span> fetter --version
            </pre>
          </div>

          <h3 className={styles.sectionTitle}>Running Your First Scan</h3>

          <p className={styles.bodyText}>
            After installing <code>fetter</code> you can perform your first
            system-wide package scan.
          </p>

          <p className={styles.bodyText}>
            In the Fetter IO Console, navigate to to the Tenant tab (🏢) and,
            for the selected tenant, copy (by clicking) the complete command
            line under &quot;Fetter CLI&quot;. Execute that command in a
            terminal. The command will look something like this (your Tenant key
            will not be <code>ffff...</code>) :
          </p>
          <pre
            className={styles.codeBlock}
          >{`fetter monitor-scan --url https://fetter.io/monitor_scan --tenant ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff`}</pre>

          <p className={styles.bodyText}>
            No additional output will be provided by default. To see logging
            information, provide the <code>--log</code> flag.
          </p>

          <pre
            className={styles.codeBlock}
          >{`fetter --log monitor-scan --url https://fetter.io/monitor_scan --tenant ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff`}</pre>

          <h3 className={styles.sectionTitle}>Automating Scans</h3>

          <p className={styles.bodyText}>
            Many tools can be used to run the <code>fetter</code> command-line
            app automatically or on a schedule. Alternatively, the Fetter Agent
            is a background service that continuously and efficiently runs{" "}
            <code>fetter</code> scans.
          </p>

          <h3 className={styles.sectionTitle}>Up Next</h3>

          <p className={styles.bodyText}>
            With a package scan complete, we can return to the Fetter IO Console
            to examine the uploaded data.
          </p>
        </div>
      ),
    },
    //--------------------------------------------------------------------------
    {
      id: "monitoring-packages",
      title: "Monitoring Packages",
      content: (
        <div className="space-y-4">
          <h2 className={styles.chapterTitle}>Monitoring Packages</h2>
          <p className={styles.bodyText}>
            The Packages tab (📦) provides a comprehensive view of all Python
            packages installed across all systems.
          </p>

          <div className={styles.infoBox}>
            <h3 className={`${styles.infoBoxTitle}`}>Key Features</h3>
            <ul className={styles.list}>
              <li>
                View a plot of the count of unique packages across historical
                scans.
              </li>
              <li>Search installed packages.</li>
              <li>
                For each package, see the system and environment of every
                installed version.
              </li>
              <li>
                See vulnerabilities and CVSS scores associated with packages.
              </li>
              <li>See package alignment to this Tenant&apos;s allow list.</li>
            </ul>
          </div>

          <div className={styles.warningBox}>
            <h3 className={styles.warningBoxTitle}>Best Practices</h3>
            <p className="text-gray-300">
              The plot of unique package counts is an important signal:
              significant changes in the count can indicate the installation of
              requirements for new projects.
            </p>
          </div>

          <h3 className={styles.sectionTitle}>The Package Count Plot</h3>
          <p className={styles.bodyText}>
            The top of the Packages tab (📦) displays a plot of the total number
            of unique packages over time. This plot is made by finding the
            unique number of packages observed with each new scan combined with
            the most recent previous scan of all other systems.
          </p>

          <h3 className={styles.sectionTitle}>The Search Interface</h3>
          <p className={styles.bodyText}>
            Packages can be searched by name, updating the display to only show
            matching packages. The "Show All" button will clear the search and
            show all packages.
          </p>

          <h3 className={styles.sectionTitle}>Package Details</h3>
          <p className={styles.bodyText}>
            For each package, clicking the + icon will display all versions
            found on all systems, as well as the specific site and system where
            that package is found. For each pacakge, its allow-list status will
            also be displayed. If a package has vulnerabilities, a CVS score
            icon will be displayed: clicking that icon will display
            vulnerability details.
          </p>

          <h3 className={styles.sectionTitle}>
            Isolating Systems & Reloading Data
          </h3>
          <p className={styles.bodyText}>
            By default, Fetter IO will show information for all systems. If
            desired, the System selector, a drop-down in the upper left, can be
            used to filter results to a single system.
          </p>

          <p className={styles.bodyText}>
            While Fetter IO will periodically auto-refresh content, the reload
            button can be used to force fetching new data.
          </p>
        </div>
      ),
    },
    //--------------------------------------------------------------------------
    {
      id: "tracking-vulnerabilities",
      title: "Tracking Vulnerabilities",
      content: (
        <div className="space-y-4">
          <h2 className={styles.chapterTitle}>Tracking Vulnerabilities</h2>
          <p className={styles.bodyText}>
            The Vulnerabilities tab (⚠️) provides full details of all
            vulnerabilities associated with observed packages. Fetter IO
            continuously checks packages against the Open Source Vulnerability
            (OSV) database to identify all known security issues.
          </p>

          <div className={styles.infoBox}>
            <h3 className={`${styles.infoBoxTitle}`}>Key Features</h3>
            <ul className={styles.list}>
              <li>
                View a bar chart of counts of vulnerabilities per CVS score
                range.
              </li>
              <li>Filter vulnerabilities by CVSS score.</li>
              <li>
                See full details on vulnerabilities, including description, CVSS
                vector, and links to further information.
              </li>
              <li>
                Jump to package details to find which sites and systems have
                vulnerable packages.
              </li>
            </ul>
          </div>

          <div className={styles.warningBox}>
            <h3 className={styles.warningBoxTitle}>Best Practices</h3>
            <p className="text-gray-300">
              Review the Vulnerabilities tab regularly and prioritize
              high-severity vulnerabilities. Use package details to identify
              which systems need updates.
            </p>
          </div>

          <h3 className={styles.sectionTitle}>The Vulnerability Count Plot</h3>
          <p className={styles.bodyText}>
            The top of the Vulnerabilities tab (⚠️) displays a bar chart of
            vulnerability counts per CVSS score. By clicking on one or more bar,
            the list of vulnerabilities can be filtered to the selected CVSS
            score range.
          </p>

          <h3 className={styles.sectionTitle}>Vulnerability Details</h3>
          <p className={styles.bodyText}>
            For each vulnerability, clicking the + icon will display full
            details, including OSV DB identifiers (linking to the OSV DB), the
            full CVSS vector (linking to the FIRST CVSS calculator), and links
            to all other associated references, including (when available)
            details in the NIST National Vulnerability Database.
          </p>

          <h3 className={styles.sectionTitle}>
            Isolating Systems & Reloading Data
          </h3>
          <p className={styles.bodyText}>
            By default, Fetter IO will show information for all systems. If
            desired, the System selector, a drop-down in the upper left, can be
            used to filter results to a single system.
          </p>

          <p className={styles.bodyText}>
            As fetching vulnerability details can be time consuming, Fetter IO
            will only automatically refresh vulnerability information after a
            fixed period. The refresh button can be used to force checking for
            new vulnerability data.
          </p>
        </div>
      ),
    },
    //--------------------------------------------------------------------------
    {
      id: "allow-lists",
      title: "Managing Allow Lists",
      content: (
        <div className="space-y-4">
          <h2 className={styles.chapterTitle}>Managing Allow Lists</h2>

          <p className={styles.bodyText}>
            The Allow List tab (🔓) permits the application of a lock or
            constraint file to all packages observed on all systems. The allow
            list can be defined explicitly, via a URL to a git repository (for
            separately defining and tracking the allow list), or derived from
            the minimum version of all observed packages.
          </p>

          <p className={styles.bodyText}>
            As <code>fetter</code> collects information on all installed
            packages, the resulting set of packages can be quite large. A
            cross-project, multi-system constraint file, documenting the lowest
            observed version of all packages, can be used to enforce minimum
            package expectations.
          </p>

          <p className={styles.bodyText}>
            Alternatively, a core set of packages might be defined with the
            "Allow superset" configuration set: this would permit packages
            beyond those explicitly defined.
          </p>

          <div className={styles.infoBox}>
            <h3 className={`${styles.infoBoxTitle}`}>Key Features</h3>
            <ul className={styles.list}>
              <li>
                View a chart of counts of Missing, Misdefined, Unrequired, and
                Allowed packages.
              </li>
              <li>Directly edit the allow list or derive it dynamically.</li>
              <li>Permit superset or subset deviations from the allow list.</li>
              <li>Browse all packages in each validation category,</li>
            </ul>
          </div>

          <p className={styles.bodyText}>
            When evaluating packages in relation to an allow list, the following
            four categories are defined. The following icons are also displayed
            with package names in the Packages tab (📦).
          </p>

          <div className={styles.infoBox}>
            <h3 className={`${styles.infoBoxTitle}`}>Validation Categories</h3>
            <ul className={styles.list}>
              <li className="flex items-center gap-2">
                <AllowIcon status="missing" />
                <span>Missing: A required package is not installed.</span>
              </li>
              <li className="flex items-center gap-2">
                <AllowIcon status="unrequired" />
                <span>Unrequired: An installed packages is not required.</span>
              </li>
              <li className="flex items-center gap-2">
                <AllowIcon status="misdefined" />
                <span>
                  Misdefined: A required package is installed with an invalid
                  version.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <AllowIcon status="allowed" />
                <span>Allowed: An installed package meets requirements.</span>
              </li>
            </ul>
          </div>

          <div className={styles.warningBox}>
            <h3 className={styles.warningBoxTitle}>Best Practices</h3>
            <p className="text-gray-300">
              A cross-project, multi-system allow list may require frequent
              updates over time. After evaluating incremental changes, automatic
              allow list derivation can be used to reset constraints.
            </p>
          </div>

          <h3 className={styles.sectionTitle}>The Allow List Plot</h3>
          <p className={styles.bodyText}>
            The top of the Allow List tab (🔓) displays a horizontal bar chart
            of the counts of packages per validation category: Missing,
            Misdefined, Unrequired, and Allowed. By clicking on a bar, the
            details of packages in that category are displayed.
          </p>

          <h3 className={styles.sectionTitle}>Creating an Allow List</h3>

          <p className={styles.bodyText}>
            The following steps explain how to edit an allow list.
          </p>

          <ol className={styles.orderedList}>
            <li className="pl-4">Navigate to the Allow List tab (🔓)</li>
            <li className="pl-4">In the Allow List display, click Edit.</li>
            <li className="pl-4">Define allowed package versions.</li>
            <li className="pl-4">Save your allow list to your Tenant.</li>
            <li className="pl-4">
              Review validation results to identify non-compliant packages
            </li>
          </ol>

          <h3 className={styles.sectionTitle}>
            Package Details Per Validation Category
          </h3>
          <p className={styles.bodyText}>
            For each of the four validation categories, The Allow List tab (🔓)
            lists every package in that category. Each listing provides a link
            to the package and system from which that package is observed.
          </p>

          <h3 className={styles.sectionTitle}>
            Isolating Systems & Reloading Data
          </h3>
          <p className={styles.bodyText}>
            By default, Fetter IO will show information for all systems. If
            desired, the drop-down in the upper left can be used to filter
            results to a single system.
          </p>

          <p className={styles.bodyText}>
            While Fetter IO will periodically auto-refresh content, the reload
            button can be used to force fetching new data.
          </p>
        </div>
      ),
    },
    //--------------------------------------------------------------------------
    {
      id: "observing-systems",
      title: "Observing Systems",
      content: (
        <div className="space-y-4">
          <h2 className={styles.chapterTitle}>Observing Systems</h2>
          <p className={styles.bodyText}>
            The Systems tab (🖥️) provides information on all systems that have
            posted data to the currently active Tenant. Each Tenant will have
            its own collection of systems.
          </p>

          <div className={styles.infoBox}>
            <h3 className={`${styles.infoBoxTitle}`}>Key Features</h3>
            <ul className={styles.list}>
              <li>
                View a scatter plot of system counts by operating system and
                architecture.
              </li>
              <li>
                For each system, see information on recent activity and the
                paths of all discovered virtual environments.
              </li>
              <li>
                Selectively remove a system from being included in All-System
                aggregate displays.
              </li>
            </ul>
          </div>

          <div className={styles.warningBox}>
            <h3 className={styles.warningBoxTitle}>Best Practices</h3>
            <p className="text-gray-300">
              To remove out-of-date or invalid system data from All-System
              aggregates, systems can be deactivated.
            </p>
          </div>

          <h3 className={styles.sectionTitle}>The Systems Plot</h3>
          <p className={styles.bodyText}>
            The top of the Systems tab (🖥️) displays a three-dimensional scatter
            plot, with operating system and version on the <i>x</i> axis,
            architecture and CPU count on the <i>y</i> axis, and the count of
            systems, the <i>z</i> axis, as the size of the plotted point.
          </p>

          <h3 className={styles.sectionTitle}>System Details</h3>
          <p className={styles.bodyText}>
            For each unique host that posts a scan, details are provided
            regarding the operating system, architecture, and CPU count. Two
            additional tables are provided.
          </p>

          <p className={styles.bodyText}>
            The first table shows recent activity from that system, including
            the time and date of the most recent communication from that system,
            as well as if scan data was delivered. In general, systems will only
            post scan data if scan results have changed from the last scan
            stored in memory. Restarting a system will force the transmission of
            a new scan.
          </p>

          <p className={styles.bodyText}>
            Ths second table lists the complete file path to all site-packages
            directories discovered on this system.
          </p>

          <h3 className={styles.sectionTitle}>Deactivating Systems</h3>
          <p className={styles.bodyText}>
            To the left of the host name of each system is a square button that
            can be used to deactivate the system from inclusion in All System
            displays. This is needed for systems that are no longer active or
            that improperly loaded data to the Tenant. Deactivating a system
            also removes it as an option in the System selector.
          </p>

          <h3 className={styles.sectionTitle}>Reloading Data</h3>
          <p className={styles.bodyText}>
            The systems tab will automatically update. If an update is
            immediately required, the refresh button can be pressed.
          </p>
        </div>
      ),
    },
  ];

  // Initialize from URL or default to first chapter
  const [activeChapter, setActiveChapter] = useState(() => {
    const chapterFromUrl = searchParams?.get("chapter");
    return chapterFromUrl || chapters[0]?.id || "getting-started";
  });

  // Sync URL changes to state (for browser back/forward)
  useEffect(() => {
    const chapterFromUrl = searchParams?.get("chapter");
    if (chapterFromUrl && chapterFromUrl !== activeChapter) {
      setActiveChapter(chapterFromUrl);
    }
  }, [searchParams, activeChapter]);

  // Function to change chapter and update URL
  const changeChapter = (chapterId: string) => {
    setActiveChapter(chapterId);
    router.push(`/docs?chapter=${chapterId}`, { scroll: false });
  };

  const currentChapter = chapters.find((ch) => ch.id === activeChapter);

  return (
    <div className="flex flex-col min-h-screen font-[family-name:var(--font-geist-sans)] bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-6 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex w-10 h-10 hover:opacity-70 cursor-pointer transition-opacity"
            >
              <Weave fill={colors.slate[600]} className="w-full h-full" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-300">Fetter IO</h1>
              <p className="text-xs text-gray-400">Documentation</p>
            </div>
          </div>
          {status !== "authenticated" ? (
            <button
              onClick={() => signIn("github", { callbackUrl: "/app" })}
              className="button-entry"
            >
              Sign in with GitHub
            </button>
          ) : (
            <a href="/app" className="button-entry">
              Back to Console
            </a>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow px-6 w-full pb-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
          {/* Left Column - Chapter Navigation */}
          <aside className="sm:col-span-1 sm:self-start sm:sticky sm:top-19">
            <div className="bg-slate-900 p-2 border border-slate-800 rounded-sm">
              <nav className="space-y-2">
                {chapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    onClick={() => changeChapter(chapter.id)}
                    className={`w-full sm:text-right uppercase tracking-widest text-xs px-2 py-1 rounded-xs transition-default ${
                      activeChapter === chapter.id
                        ? "bg-slate-800 text-gray-400 border border-slate-600 cursor-default"
                        : "bg-slate-900 text-slate-500 border border-slate-800 hover:text-gray-200 hover:bg-slate-700/50 cursor-pointer"
                    }`}
                  >
                    {chapter.title}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Right Column - Content */}
          <div className="sm:col-span-3 py-0">
            <div className="bg-slate-800/30 rounded-sm px-4 py-2 pb-4 border border-slate-700">
              {currentChapter ? currentChapter.content : null}

              {/* Previous/Next Navigation */}
              {currentChapter && (
                <div className="flex justify-between items-center mt-2 pt-2 text-xs text-slate-400 tracking-widest">
                  <div>
                    {chapters.findIndex((ch) => ch.id === activeChapter) >
                      0 && (
                      <button
                        onClick={() => {
                          const currentIndex = chapters.findIndex(
                            (ch) => ch.id === activeChapter,
                          );
                          changeChapter(chapters[currentIndex - 1]!.id);
                        }}
                        className="uppercase hover:text-blue-300 transition-colors flex cursor-pointer items-center gap-2"
                      >
                        <span>
                          {
                            chapters[
                              chapters.findIndex(
                                (ch) => ch.id === activeChapter,
                              ) - 1
                            ]?.title
                          }
                        </span>
                      </button>
                    )}
                  </div>
                  <div>
                    {chapters.findIndex((ch) => ch.id === activeChapter) <
                      chapters.length - 1 && (
                      <button
                        onClick={() => {
                          const currentIndex = chapters.findIndex(
                            (ch) => ch.id === activeChapter,
                          );
                          changeChapter(chapters[currentIndex + 1]!.id);
                        }}
                        className="uppercase hover:text-blue-300 transition-colors flex cursor-pointer items-center gap-2"
                      >
                        <span>
                          {
                            chapters[
                              chapters.findIndex(
                                (ch) => ch.id === activeChapter,
                              ) + 1
                            ]?.title
                          }
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-700 px-6 py-2">
        <div className="max-w-4xl mx-auto">
          <Footer />
        </div>
      </footer>
    </div>
  );
}
