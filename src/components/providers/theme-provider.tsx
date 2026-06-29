"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * next-themes wrapper. Uses the `class` strategy so `.dark` on <html> flips all
 * CSS variables — zero-JS recolour. See technical-solution.md §4.2.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
