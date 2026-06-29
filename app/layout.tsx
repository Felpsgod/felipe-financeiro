import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { MoneyProvider } from "@/lib/money";

export const metadata: Metadata = {
  title: "Meu Financeiro",
  description: "Controle pessoal de cartões, financiamentos e pagamentos",
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
