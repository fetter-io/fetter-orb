import { render, screen } from "@testing-library/react";
import { PackageCard } from "./PackageCard";
import { Package } from "@/types";

const mockPackage: Package = {
  id: 1,
  name: "PyYAML",
  key: "pyyaml",
  version: "6.0.2",
  direct_url: null,
};

describe("PackageCard", () => {
  it("renders package details correctly", () => {
    render(<PackageCard pkg={mockPackage} />);

    expect(screen.getByText("PyYAML")).toBeInTheDocument();
    expect(screen.getByText("Key: pyyaml")).toBeInTheDocument();
    expect(screen.getByText("Version: 6.0.2")).toBeInTheDocument();
  });

  it("does not render direct_url if null", () => {
    render(<PackageCard pkg={mockPackage} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders link when direct_url is present", () => {
    const pkgWithLink: Package = { ...mockPackage, direct_url: "https://example.com" };
    render(<PackageCard pkg={pkgWithLink} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://example.com");
  });
});
