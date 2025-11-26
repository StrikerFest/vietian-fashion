// components/home/Sidebar.js
import Link from 'next/link';

export default function Sidebar({ config }) {
    if (!config || !config.enabled) return null;

    const { widgets = [], position } = config;

    return (
        <aside className={`hidden lg:block w-72 flex-shrink-0 space-y-6 ${position === 'right' ? 'order-last' : ''}`}>

            {widgets.map((widget) => {
                // --- 1. Banner Widget ---
                if (widget.type === 'banner') {
                    return (
                        <div key={widget.id} className="rounded-xl overflow-hidden shadow-lg border border-gray-700 group relative">
                            <Link href={widget.link || '#'}>
                                <div className="relative h-64 w-full">
                                    <img
                                        src={widget.image_url || 'https://placehold.co/300x400?text=Banner'}
                                        alt={widget.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    {(widget.title) && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-3 backdrop-blur-sm">
                                            <p className="text-white font-bold text-center">{widget.title}</p>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        </div>
                    );
                }

                // --- 2. HTML / Ad Widget ---
                if (widget.type === 'html') {
                    return (
                        <div key={widget.id} className="rounded-xl overflow-hidden border border-gray-700 bg-gray-800 p-4">
                            {widget.title && <h4 className="text-gray-400 font-bold text-xs uppercase mb-3 tracking-wider">{widget.title}</h4>}
                            {/* Safety Note: Only allow admins to set this content */}
                            <div dangerouslySetInnerHTML={{ __html: widget.content }} />
                        </div>
                    );
                }

                // --- 3. Link List Widget ---
                if (widget.type === 'links') {
                    return (
                        <div key={widget.id} className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-sm">
                            {widget.title && <h4 className="text-white font-bold mb-4">{widget.title}</h4>}
                            <ul className="space-y-2">
                                {widget.links?.map((link, idx) => (
                                    <li key={idx}>
                                        <Link
                                            href={link.url}
                                            className="block text-gray-400 hover:text-indigo-400 hover:translate-x-1 transition-all text-sm"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                }

                return null;
            })}

            {/* Fallback if enabled but empty */}
            {widgets.length === 0 && (
                <div className="p-4 border border-dashed border-gray-700 rounded-lg text-center text-gray-500 text-sm">
                    Sidebar Active.<br/>Add widgets in Admin Settings.
                </div>
            )}
        </aside>
    );
}