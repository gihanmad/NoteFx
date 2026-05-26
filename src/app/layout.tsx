import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ChatSidebar } from "@/components/dashboard/ChatSidebar";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "NoteFx | English Lectures to Sinhala Transcription",
  description: "Advanced AI-powered lecture transcription and translation software specially designed for Sinhala speakers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-inter selection:bg-primary/20">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar - Desktop Only for now */}
            <div className="hidden lg:block h-full">
              <Sidebar />
            </div>

            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <Header />
              <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-8 relative">
                  {/* Background Blobs for Premium Look */}
                  <div className="absolute top-0 right-0 -z-10 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2" />
                  <div className="absolute bottom-0 left-0 -z-10 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] -translate-x-1/2 translate-y-1/2" />
                  
                  <div className="mx-auto max-w-4xl w-full">
                    {children}
                  </div>
                </main>
                <ChatSidebar />
              </div>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
