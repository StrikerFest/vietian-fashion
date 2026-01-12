'use client';

import { useState, useEffect } from 'react';

export default function TopLoadingBar({ isLoading, duration = 3000 }) {
    const [progress, setProgress] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isLoading) {
            setIsVisible(true);
            setProgress(0);

            const intervalTime = 100;
            const steps = duration / intervalTime;
            let currentStep = 0;

            const timer = setInterval(() => {
                currentStep++;
                const percentageTime = currentStep / steps;
                
                let nextProgress;
                if (percentageTime <= 0.5) {
                    nextProgress = (percentageTime / 0.5) * 70;
                } else if (percentageTime <= 0.9) {
                    nextProgress = 70 + ((percentageTime - 0.5) / 0.4) * 20;
                } else {
                    nextProgress = 90 + ((percentageTime - 0.9) / 0.1) * 5;
                }

                if (nextProgress > 98) nextProgress = 98;
                setProgress(nextProgress);
            }, intervalTime);

            return () => clearInterval(timer);
        } else {
            // Finish the bar
            setProgress(100);
            const timeout = setTimeout(() => {
                setIsVisible(false);
                setProgress(0);
            }, 400); // Wait for transition to finish
            return () => clearTimeout(timeout);
        }
    }, [isLoading, duration]);

    if (!isVisible) return null;

    return (
        <div 
            className="fixed top-0 left-0 right-0 z-[100] h-1 pointer-events-none transition-opacity duration-300"
            style={{ opacity: isLoading || progress < 100 ? 1 : 0 }}
        >
            <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
            />
        </div>
    );
}