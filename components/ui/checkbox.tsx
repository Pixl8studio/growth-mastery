/**
 * Checkbox Component
 * shadcn/ui style checkbox component
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, onCheckedChange, ...props }, ref) => {
        return (
            <input
                type="checkbox"
                className={cn(
                    "h-4 w-4 rounded border border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer",
                    className
                )}
                ref={ref}
                onChange={(e) => {
                    if (onCheckedChange) {
                        onCheckedChange(e.target.checked);
                    }
                    if (props.onChange) {
                        props.onChange(e);
                    }
                }}
                {...props}
            />
        );
    }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
