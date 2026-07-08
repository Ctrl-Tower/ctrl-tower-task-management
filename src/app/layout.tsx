import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ctrl Tower — Task Board",
  description: "Internal task management board",
};

// Applied before paint so there's no theme flash. Default is dark.
const themeInit = `(function(){try{if(localStorage.theme==='light')document.documentElement.classList.add('light');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
