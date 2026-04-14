import type { Metadata } from "next";
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Open World Baltimore",
  description: "An open-world 3D sandbox game of Baltimore in the browser — powered by real geodata.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white">
        <ClerkProvider>
          <header className="fixed top-0 right-0 z-50 flex items-center gap-3 p-4">
            <Show when="signed-out">
              <SignInButton>
                <button className="px-4 py-2 text-sm font-medium text-cyan-400 border border-cyan-400/30 rounded-lg hover:bg-cyan-400/10 transition cursor-pointer">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton>
                <button className="px-4 py-2 text-sm font-medium bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition cursor-pointer">
                  Sign Up
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </header>
          {children}
          <Analytics />
        </ClerkProvider>
      </body>
    </html>
  );
}
