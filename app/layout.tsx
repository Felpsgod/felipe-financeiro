import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { MoneyProvider } from "@/lib/money";

export const metadata: Metadata = {
  title: "Meu Financeiro",
  description: "Controle pessoal de cartões, financiamentos e pagamentos",
  manifest: "/manifest.webmanifest",
  applicationName: "Meu Financeiro",
  appleWebApp: { capable: true, title: "Meu Financeiro", statusBarStyle: "default" },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900">
        <AuthProvider>
          <MoneyProvider>{children}</MoneyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
