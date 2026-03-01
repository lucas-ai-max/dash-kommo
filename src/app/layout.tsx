import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Providers from "@/components/Providers";
import ClientOnly from "@/components/ClientOnly";

export const metadata: Metadata = {
  title: "Motocor Dashboard",
  description: "Dashboard Comercial Motocor",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body className="bg-gray-950 text-gray-100 antialiased" suppressHydrationWarning>
        <ClientOnly fallback={null}>
          <Providers>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="ml-64 flex-1">{children}</main>
            </div>
          </Providers>
        </ClientOnly>
      </body>
    </html>
  );
}
