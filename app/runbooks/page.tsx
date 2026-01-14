import Link from "next/link";

export default function RunbooksPage() {
  return (
    <div className="min-h-screen bg-background-secondary">
      <nav className="border-b border-border bg-white">
        <div className="max-w-content mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold text-text-primary">
                SRE Platform
              </Link>
              <div className="flex space-x-6">
                <Link 
                  href="/incidents" 
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Incidents
                </Link>
                <Link 
                  href="/runbooks" 
                  className="text-sm font-semibold text-text-primary"
                >
                  Runbooks
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-content mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Service Runbooks</h1>
        </div>

        <div className="bg-white border border-border rounded-lg p-8 text-center">
          <p className="text-text-secondary">No runbooks yet. Create your first service runbook to get started.</p>
        </div>
      </main>
    </div>
  );
}
