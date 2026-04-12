export default function Impressum() {
    return (
        <main className="min-h-screen bg-black text-white p-8 md:p-24 font-mono">
            <div className="max-w-3xl mx-auto space-y-12">
                <header className="border-b border-white/10 pb-8">
                    <h1 className="text-4xl font-black tracking-tighter uppercase italic">Impressum</h1>
                    <p className="text-white/40 text-xs mt-2 uppercase tracking-[0.3em]">Legal Notice • DE Law Compliance</p>
                </header>

                <section className="space-y-6 text-sm leading-relaxed">
                    <div>
                        <h2 className="text-white/60 uppercase tracking-widest text-[10px] mb-2 font-black">Betreiber (Operator)</h2>
                        <p className="text-lg">Akhilesh Bhaskar Kotegar</p>
                        <p>Hengersberger Strasse 15</p>
                        <p>94469 Deggendorf</p>
                        <p>Germany</p>
                    </div>

                    <div>
                        <h2 className="text-white/60 uppercase tracking-widest text-[10px] mb-2 font-black">Contact</h2>
                        <p>Email: <a href="mailto:akhilkotegar@gmail.com" className="underline decoration-white/20 hover:text-white/80 transition-colors">akhilkotegar@gmail.com</a></p>
                    </div>

                    <div>
                        <h2 className="text-white/60 uppercase tracking-widest text-[10px] mb-2 font-black">Legal Attribution</h2>
                        <p className="text-white/50 italic">
                            Responsible for content according to § 55 Abs. 2 RStV: Akhilesh Bhaskar Kotegar
                        </p>
                    </div>

                    <div className="bg-white/5 p-6 border-l-2 border-white/20">
                        <p className="text-xs uppercase tracking-wider font-bold mb-2">Non-Commercial Declaration</p>
                        <p className="text-white/60">
                            This website is a private, non-commercial student project created for educational and portfolio purposes at the Technische Hochschule Deggendorf (DIT). No revenue is generated from this website. The logos and trademarks used (including Formula 1 marks) belong to their respective owners and are used here under nominative fair use.
                        </p>
                    </div>
                </section>

                <footer className="pt-12">
                    <a href="/" className="text-[10px] uppercase tracking-[0.5em] text-white/30 hover:text-white transition-colors">← Back to Grid.01</a>
                </footer>
            </div>
        </main>
    );
}