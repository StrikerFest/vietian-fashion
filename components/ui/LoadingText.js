'use client';

import { useState, useEffect } from 'react';

export default function LoadingText({ isLoading, messages = [], interval = 800 }) {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (!isLoading) {
            setIndex(0);
            return;
        }

        const timer = setInterval(() => {
            setIndex(prev => (prev + 1) % messages.length);
        }, interval);

        return () => clearInterval(timer);
    }, [isLoading, messages.length, interval]);

    if (!isLoading) return null;

    return (
        <div className="text-xs font-mono text-indigo-400 mt-2 animate-pulse flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full animate-ping"/>
            {messages[index]}
        </div>
    );
}