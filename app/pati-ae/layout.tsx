import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PatiAe — Budget & insights",
  description: "Track spending, categories, and balance with PatiAe.",
};

export default function PatiAeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
