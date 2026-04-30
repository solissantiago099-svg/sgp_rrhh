import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SGP RRHH",
  description: "Sistema de gestión de personal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}