import { BRAND } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          {BRAND.name}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {BRAND.tagline}
        </p>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
