export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-[#080E1A] min-h-screen text-white"
      style={{
        backgroundImage:
          'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }}
    >
      {children}
    </div>
  )
}
