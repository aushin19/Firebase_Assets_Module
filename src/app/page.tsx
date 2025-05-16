import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/assets');
  // Fallback content, though redirect should handle it.
  return <div className="flex items-center justify-center h-screen">Redirecting to assets...</div>;
}
