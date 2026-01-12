'use client';

import { useState, useEffect } from 'react';

export default function FalseProgressBar({ isLoading, label = "Processing...", duration = 5000, flavor = null }) {
    const [progress, setProgress] = useState(0);

    // Default Buzzwords if flavor is 'default' or specific types
    const getFlavorText = (p) => {
        if (!flavor || typeof flavor === 'string') return label; // Fallback or simple label
        
        // Map progress 0-100 to array index
        const index = Math.min(Math.floor((p / 100) * flavor.length), flavor.length - 1);
        return flavor[index] || label;
    };

    const currentLabel = Array.isArray(flavor) ? getFlavorText(progress) : label;

    useEffect(() => {
        if (!isLoading) {
            setProgress(0);
            return;
        }

        // Reset to 0 when starting
        setProgress(0);

        const intervalTime = 100;
        const steps = duration / intervalTime;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            
            // Logarithmic-ish curve: fast start, slows down
            // At 50% time, be at ~70% progress
            // At 90% time, be at ~90% progress
            // Never hit 100% automatically (wait for completion)
            
            let nextProgress;
            const percentageTime = currentStep / steps;

            if (percentageTime <= 0.5) {
                // First half: Move fast to 60%
                nextProgress = (percentageTime / 0.5) * 60;
            } else if (percentageTime <= 0.9) {
                // Next 40%: Move to 90%
                nextProgress = 60 + ((percentageTime - 0.5) / 0.4) * 30;
            } else {
                // Final 10%: Crawl to 95%
                nextProgress = 90 + ((percentageTime - 0.9) / 0.1) * 5;
            }
            
            // Cap at 95%
            if (nextProgress > 95) nextProgress = 95;

            setProgress(nextProgress);
        }, intervalTime);

        return () => clearInterval(timer);
    }, [isLoading, duration]);

    if (!isLoading) return null;

    return (
        <div className="w-full mt-2">
            <div className="flex justify-between text-xs text-indigo-300 mb-1">
                <span className="transition-all duration-300 ease-in-out min-w-[120px]">{currentLabel}</span>
                <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}