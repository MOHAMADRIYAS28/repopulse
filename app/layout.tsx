import "./globals.css";
import Providers from "./providers";
import { spaceGrotesk, inter, jetbrainsMono } from "./fonts";

export const metadata = {
  title: "RepoPulse",
  description: "Intelligent repository health analytics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
