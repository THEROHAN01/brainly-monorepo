import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";

interface ParticlesProps {
    className?: string;
    quantity?: number;
    color?: string;
    size?: number;
}

interface Particle {
    id: number;
    x: number;
    y: number;
    size: number;
    duration: number;
    delay: number;
}

export function Particles({
    className,
    quantity = 30,
    color = "#08CB00",
    size = 2,
}: ParticlesProps) {
    const [particles, setParticles] = useState<Particle[]>([]);

    useEffect(() => {
        const newParticles: Particle[] = [];
        for (let i = 0; i < quantity; i++) {
            newParticles.push({
                id: i,
                x: Math.random() * 100,
                y: Math.random() * 100,
                size: Math.random() * size + 1,
                duration: Math.random() * 20 + 10,
                delay: Math.random() * 10,
            });
        }
        setParticles(newParticles);
    }, [quantity, size]);

    return (
        <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
            {particles.map((particle) => (
                <div
                    key={particle.id}
                    className="absolute rounded-full opacity-0"
                    style={{
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        width: `${particle.size}px`,
                        height: `${particle.size}px`,
                        backgroundColor: color,
                        animation: `particle-float ${particle.duration}s linear ${particle.delay}s infinite`,
                    }}
                />
            ))}
        </div>
    );
}
