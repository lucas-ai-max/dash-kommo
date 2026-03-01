"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Prevent hydration mismatch by returning a uniform layout during SSR
    if (!mounted) {
        return (
            <div className="flex min-h-screen">
                <main className="flex-1 w-full">{children}</main>
            </div>
        );
    }

    const isLoginPage = pathname === "/login";

    if (isLoginPage) {
        return (
            <div className="flex min-h-screen">
                <main className="flex-1 w-full">{children}</main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="ml-64 flex-1">{children}</main>
        </div>
    );
}
