import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-lg">
        🔍
      </div>

      <h1 className="text-6xl font-bold text-slate-900 mb-2">404</h1>
      <h2 className="text-xl font-semibold text-slate-700 mb-3">Page not found</h2>
      <p className="text-slate-500 mb-8 max-w-sm">
        The page you're looking for doesn't exist or may have been moved.
      </p>

      <div className="flex gap-3 flex-wrap justify-center">
        <Link
          href="/dashboard"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors text-sm"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/bookings"
          className="bg-white hover:bg-slate-50 text-slate-700 font-medium px-6 py-2.5 rounded-lg border border-slate-200 transition-colors text-sm"
        >
          View Bookings
        </Link>
      </div>

      <p className="text-xs text-slate-400 mt-12">SafaWala CRM · mysafawale.com</p>
    </div>
  )
}
