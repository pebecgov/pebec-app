import WorldBankLayoutClient from "../WorldBankLayoutClient";

export default function WorldBankReceivedLettersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorldBankLayoutClient>{children}</WorldBankLayoutClient>;
}
