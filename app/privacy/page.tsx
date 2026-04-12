export default function Privacy() {
    return (
        <main className="min-h-screen bg-black text-white p-8 md:p-24 font-mono">
            <div className="max-w-3xl mx-auto space-y-12">
                <header className="border-b border-white/10 pb-8">
                    <h1 className="text-4xl font-black tracking-tighter uppercase italic">Privacy</h1>
                    <p className="text-white/40 text-xs mt-2 uppercase tracking-[0.3em]">Datenschutzerklärung • GDPR Compliance</p>
                </header>

                <section className="space-y-10 text-sm text-white/70 leading-relaxed">
                    <div>
                        <h2 className="text-white font-bold uppercase tracking-widest mb-3">1. General</h2>
                        <p>We treat your personal data as confidential and in accordance with the statutory data protection regulations (GDPR) and this privacy policy. This site is hosted on Vercel.</p>
                    </div>

                    <div>
                        <h2 className="text-white font-bold uppercase tracking-widest mb-3">2. Data Collection</h2>
                        <ul className="list-disc list-inside space-y-2 ml-2">
                            <li><span className="text-white underline decoration-white/10">Server Logs:</span> Information like IP address and browser type are briefly processed by the host to serve the site.</li>
                            <li><span className="text-white underline decoration-white/10">External APIs:</span> GRID.01 fetches live telemetry from Jolpica/FastF1. Your IP is transmitted to these servers only to retrieve the data.</li>
                            <li><span className="text-white underline decoration-white/10">Tracking:</span> No cookies or analytics tracking (Google Analytics, etc.) are used on this site.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-white font-bold uppercase tracking-widest mb-3">3. Your Rights</h2>
                        <p>Under the GDPR, you have the right to access, rectify, or erase your data. Since we do not store personal information in a database, there is typically no data to erase. For inquiries, contact <span className="text-white">akhilkotegar@gmail.com</span>.</p>
                    </div>
                </section>

                <footer className="pt-12">
                    <a href="/" className="text-[10px] uppercase tracking-[0.5em] text-white/30 hover:text-white transition-colors">← Back to Grid.01</a>
                </footer>
            </div>
        </main>
    );
}