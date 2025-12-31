'use client';

import { useState, useEffect } from 'react';
import { Check, Loader } from 'lucide-react';

interface ThinkingStepsProps {
    inputMode?: 'voice' | 'text';
}

export default function ThinkingSteps({ inputMode = 'text' }: ThinkingStepsProps) {
    const [completedSteps, setCompletedSteps] = useState<number>(0);

    const steps = inputMode === 'voice'
        ? [
            'Analyzing Voice Input...',
            'Detecting Business Type...',
            'Writing SEO-friendly Content...',
            'Designing Layout...'
        ]
        : [
            'Analyzing Your Description...',
            'Detecting Business Type...',
            'Writing SEO-friendly Content...',
            'Designing Layout...'
        ];

    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];

        steps.forEach((_, index) => {
            const timer = setTimeout(() => {
                setCompletedSteps(index + 1);
            }, (index + 1) * 2500); // Each step takes 2.5 seconds
            timers.push(timer);
        });

        return () => {
            timers.forEach(timer => clearTimeout(timer));
        };
    }, []);

    return (
        <div className="thinking-steps">
            <h3 className="thinking-title">Creating your website...</h3>
            <div className="thinking-list">
                {steps.map((step, index) => (
                    <div
                        key={index}
                        className={`thinking-step ${index < completedSteps ? 'completed' : ''} ${index === completedSteps ? 'active' : ''}`}
                    >
                        {index < completedSteps ? (
                            <Check size={20} strokeWidth={2.5} className="step-icon completed-icon" />
                        ) : index === completedSteps ? (
                            <Loader size={20} strokeWidth={2.5} className="step-icon loading-icon" />
                        ) : (
                            <div className="step-icon pending-icon" />
                        )}
                        <span>{step}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
