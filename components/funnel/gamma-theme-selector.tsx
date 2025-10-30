"use client";

import Image from "next/image";
import { useState } from "react";

interface GammaThemeSelectorProps {
    selectedTheme: string;
    onThemeChange: (theme: string) => void;
    className?: string;
}

// All available Gamma themes based on the image files
const GAMMA_THEMES = [
    { id: "atmosphere", name: "Atmosphere", image: "/gamma-themes/atmosphere.png" },
    { id: "borealis", name: "Borealis", image: "/gamma-themes/borealis.png" },
    { id: "cornfield", name: "Cornfield", image: "/gamma-themes/cornfield.png" },
    { id: "cornflower", name: "Cornflower", image: "/gamma-themes/cornflower.png" },
    { id: "flax", name: "Flax", image: "/gamma-themes/flax.png" },
    { id: "gamma dark", name: "Gamma Dark", image: "/gamma-themes/gamma dark.png" },
    { id: "goldleaf", name: "Goldleaf", image: "/gamma-themes/goldleaf.png" },
    { id: "iris", name: "Iris", image: "/gamma-themes/iris.png" },
    { id: "keepsake", name: "Keepsake", image: "/gamma-themes/keepsake.png" },
    { id: "malibu", name: "Malibu", image: "/gamma-themes/malibu.png" },
    { id: "nebulae", name: "Nebulae", image: "/gamma-themes/nebulae.png" },
    { id: "nova", name: "Nova", image: "/gamma-themes/nova.png" },
    { id: "rush", name: "Rush", image: "/gamma-themes/rush.png" },
    { id: "sage", name: "Sage", image: "/gamma-themes/sage.png" },
    { id: "sanguine", name: "Sanguine", image: "/gamma-themes/sanguine.png" },
    { id: "spectrum", name: "Spectrum", image: "/gamma-themes/spectrum.png" },
    { id: "sprout", name: "Sprout", image: "/gamma-themes/sprout.png" },
    { id: "stardust", name: "Stardust", image: "/gamma-themes/stardust.png" },
    {
        id: "velvet tides",
        name: "Velvet Tides",
        image: "/gamma-themes/velvet tides.png",
    },
    { id: "verdigris", name: "Verdigris", image: "/gamma-themes/verdigris.png" },
];

export default function GammaThemeSelector({
    selectedTheme,
    onThemeChange,
    className = "",
}: GammaThemeSelectorProps) {
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

    const handleImageError = (themeId: string) => {
        setImageErrors((prev) => new Set([...prev, themeId]));
    };

    return (
        <div className={className}>
            <label className="mb-4 block text-base font-medium text-foreground">
                Choose Gamma Theme
            </label>
            <p className="mb-4 text-sm text-muted-foreground">
                Don't see a theme you love? You can change it later in Gamma.
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {GAMMA_THEMES.map((theme) => (
                    <button
                        key={theme.id}
                        onClick={() => onThemeChange(theme.id)}
                        className={`group relative rounded-xl border-2 p-4 transition-all duration-200 hover:scale-105 ${
                            selectedTheme === theme.id
                                ? "border-purple-500 bg-purple-50 shadow-lg ring-4 ring-purple-200"
                                : "border-border hover:border-border hover:shadow-float"
                        }`}
                        title={theme.name}
                    >
                        {/* Theme Preview Image */}
                        <div className="mb-3 aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted shadow-md">
                            {!imageErrors.has(theme.id) ? (
                                <Image
                                    src={theme.image}
                                    alt={`${theme.name} theme preview`}
                                    width={400}
                                    height={300}
                                    className="h-full w-full object-cover transition-transform group-hover:scale-110"
                                    onError={() => handleImageError(theme.id)}
                                    unoptimized
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-gray-200">
                                    <span className="text-sm text-muted-foreground">
                                        Preview
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Theme Name */}
                        <span className="block text-center text-base font-semibold leading-tight text-foreground">
                            {theme.name}
                        </span>

                        {/* Selected Indicator */}
                        {selectedTheme === theme.id && (
                            <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 shadow-float">
                                <svg
                                    className="h-5 w-5 text-white"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Selected Theme Info */}
            {selectedTheme && (
                <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
                    <div className="text-base">
                        <span className="font-semibold text-purple-900">
                            Selected Theme:{" "}
                        </span>
                        <span className="font-medium text-purple-700">
                            {GAMMA_THEMES.find((t) => t.id === selectedTheme)?.name}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

// Export the themes array for use in other components
export { GAMMA_THEMES };
