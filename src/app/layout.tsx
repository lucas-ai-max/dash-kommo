import type { Metadata } from "next";
import "./globals.css";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import Providers from "@/components/Providers";
import ClientOnly from "@/components/ClientOnly";

export const metadata: Metadata = {
  title: "Motocor Dashboard",
  description: "Dashboard Comercial Motocor",
  icons: {
    icon: "/favicon.png",
  }
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
            <LayoutWrapper>{children}</LayoutWrapper>
          </Providers>
        </ClientOnly>
      </body>
    </html>
  );
}
