import WorldBankLayoutClient from "../WorldBankLayoutClient";

export default function WorldBankSendLettersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorldBankLayoutClient>{children}</WorldBankLayoutClient>;
}
