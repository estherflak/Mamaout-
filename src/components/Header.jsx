export default function Header() {
  return (
    <header className="sticky top-0 z-20 bg-cream-50 border-b border-dusty-roseLight px-4">
      <div className="max-w-xl mx-auto flex items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌸</span>
          <div>
            <h1 className="text-xl font-semibold text-stone-800 leading-tight tracking-tight">
              MamaOut
            </h1>
            <p className="text-xs text-stone-400 leading-none">Tel Aviv · Ramat Gan</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1.5">
            {['N', 'M', 'S'].map((initial, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full border-2 border-cream-50 flex items-center justify-center text-xs font-medium"
                style={{
                  backgroundColor: ['#d4a5a5', '#a4c0a4', '#f4c7a0'][i],
                  color: '#fff',
                }}
              >
                {initial}
              </div>
            ))}
          </div>
          <span className="text-xs text-stone-400">3 friends</span>
        </div>
      </div>
    </header>
  );
}
