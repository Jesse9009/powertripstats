"use client"

import { Toaster as Sonner } from "sonner"
import { useTheme } from "@/context/ThemeContext"

export function Toaster() {
  const { theme } = useTheme()
  return <Sonner theme={theme} />
}
