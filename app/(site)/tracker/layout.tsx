export default function ScoresLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 pt-52 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div
          role="alert"
          className="rounded-lg border-2 border-red-600 bg-red-50 px-4 py-3 text-center shadow-sm motion-safe:animate-scores-flicker"
        >
          <p className="text-sm sm:text-base font-bold uppercase tracking-wide text-red-700">
            Disclaimer: If you find inconsistent or incorrect information on this tracker, please
            dispute it with PEBEC immediately by submitting counter evidence. Do not ignore errors.
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}
