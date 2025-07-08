"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    &lt;DropdownMenu&gt;
      &lt;DropdownMenuTrigger asChild&gt;
        &lt;Button variant="outline" size="icon"&gt;
          &lt;Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" /&gt;
          &lt;Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" /&gt;
          &lt;span className="sr-only"&gt;Toggle theme&lt;/span&gt;
        &lt;/Button&gt;
      &lt;/DropdownMenuTrigger&gt;
      &lt;DropdownMenuContent align="end"&gt;
        &lt;DropdownMenuItem onClick={() =&gt; setTheme("light")}&gt;
          Light
        &lt;/DropdownMenuItem&gt;
        &lt;DropdownMenuItem onClick={() =&gt; setTheme("dark")}&gt;
          Dark
        &lt;/DropdownMenuItem&gt;
        &lt;DropdownMenuItem onClick={() =&gt; setTheme("system")}&gt;
          System
        &lt;/DropdownMenuItem&gt;
      &lt;/DropdownMenuContent&gt;
    &lt;/DropdownMenu&gt;
  )
}