import './globals.css';

export const metadata = {
  title: 'Transcription Audio Malgache',
  description: 'Service IA de transcription audio en malgache - Haute précision',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
