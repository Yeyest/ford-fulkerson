import type { Metadata, Viewport } from "next";
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
  title: "Ford-Fulkerson paso a paso",
  description: "Flujo máximo y corte mínimo con el algoritmo de Ford-Fulkerson, paso a paso y en el navegador.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Aplica el tema guardado antes de pintar la página (claro por defecto).
const scriptTema = `try{if(localStorage.getItem("tema")==="oscuro")document.documentElement.dataset.theme="dark"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
