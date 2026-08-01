import type { ReactNode } from "react";
import "@feedclip/activity/styles.css";
import "./starter.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
