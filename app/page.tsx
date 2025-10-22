export default function HomePage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <div className="z-10 w-full max-w-5xl items-center justify-center font-mono text-sm">
                <h1 className="mb-8 text-4xl font-bold text-center">🔍 Genie v3</h1>
                <p className="text-center text-lg mb-4">
                    The next generation AI platform, built with modern TypeScript
                    patterns and enterprise-grade tooling.
                </p>
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-gray-300 p-6">
                        <h2 className="mb-2 text-xl font-semibold">
                            🚀 Ready to Deploy
                        </h2>
                        <p className="text-sm text-gray-600">
                            Configured for Vercel deployment with Supabase integration
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-300 p-6">
                        <h2 className="mb-2 text-xl font-semibold">🧪 Fully Tested</h2>
                        <p className="text-sm text-gray-600">
                            Comprehensive test suite with Vitest and Playwright
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-300 p-6">
                        <h2 className="mb-2 text-xl font-semibold">🔒 Type Safe</h2>
                        <p className="text-sm text-gray-600">
                            Strict TypeScript with full type safety throughout
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-300 p-6">
                        <h2 className="mb-2 text-xl font-semibold">🎨 Beautiful UI</h2>
                        <p className="text-sm text-gray-600">
                            Tailwind CSS with modern component library
                        </p>
                    </div>
                </div>
                <p className="mt-8 text-center text-sm text-gray-500">
                    Elementary! The development environment is operational. 🔍
                </p>
            </div>
        </main>
    );
}
