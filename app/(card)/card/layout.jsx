import "../../globals.css";

export const metadata = {
  title: "Neuro Futures — title card (web port)",
  description:
    "Browser reproduction of the Neuro Futures podcast title card: canvas constellation mesh, same timings and colours as the 1920×1080 master.",
  robots: { index: false, follow: false },
};

export default function CardLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
