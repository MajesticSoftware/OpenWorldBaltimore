import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-cyan-400 tracking-wider mb-1">OPEN WORLD</h1>
        <h2 className="text-4xl font-black text-white tracking-widest mb-8">BALTIMORE</h2>
        <SignUp
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'bg-gray-900 border border-gray-800',
            },
          }}
        />
      </div>
    </div>
  )
}
