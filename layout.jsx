import "./globals.css";

export const metadata = {
  title: "Student Spend",
  description: "A simple daily spending tracker for students"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
