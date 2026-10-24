import { HugeiconsIcon } from "@hugeicons/react"
import {
  ComputerIcon,
  Moon02Icon,
  PaintBoardIcon,
  Sun01Icon,
} from "@hugeicons-pro/core-stroke-rounded"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/motion/button"
import { MorphicTooltip } from "@/components/premium/morphic-tooltip/morphic-tooltip"
import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownLabel,
  AnimatedDropdownRadioGroup,
  AnimatedDropdownRadioItem,
  AnimatedDropdownSeparator,
  AnimatedDropdownTrigger,
} from "@/components/premium/animated-dropdown"

export const themeOptions = [
  { value: "light", label: "浅色", icon: Sun01Icon },
  { value: "dark", label: "深色", icon: Moon02Icon },
  { value: "system", label: "跟随系统", icon: ComputerIcon },
] as const

export const paletteOptions = [
  {
    value: "official",
    label: "官方主题",
    colors: ["#e6e6e3", "#fafaf9", "#187b5b"],
  },
  {
    value: "claude",
    label: "Claude",
    colors: ["#e8e5db", "#faf9f5", "#bd6849"],
  },
] as const

export function ThemePicker() {
  const { theme, setTheme, palette, setPalette } = useTheme()

  return (
    <AnimatedDropdown>
      <MorphicTooltip content="外观" side="right">
        <AnimatedDropdownTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="外观：主题与配色">
            <HugeiconsIcon
              icon={PaintBoardIcon}
              size={20}
              strokeWidth={1.7}
              aria-hidden="true"
            />
          </Button>
        </AnimatedDropdownTrigger>
      </MorphicTooltip>
      <AnimatedDropdownContent
        side="right"
        align="end"
        sideOffset={12}
        collisionPadding={12}
        className="w-56 bg-popover"
      >
        <AnimatedDropdownLabel>主题</AnimatedDropdownLabel>
        <AnimatedDropdownRadioGroup value={theme} aria-label="主题">
          {themeOptions.map((option) => (
            <AnimatedDropdownRadioItem
              key={option.value}
              value={option.value}
              onSelect={(event) => {
                event.preventDefault()
                setTheme(option.value)
              }}
            >
              <HugeiconsIcon
                icon={option.icon}
                className="size-4 shrink-0"
                aria-hidden="true"
              />
              {option.label}
            </AnimatedDropdownRadioItem>
          ))}
        </AnimatedDropdownRadioGroup>
        <AnimatedDropdownSeparator />
        <AnimatedDropdownLabel>配色</AnimatedDropdownLabel>
        <AnimatedDropdownRadioGroup value={palette} aria-label="配色">
          {paletteOptions.map((option) => (
            <AnimatedDropdownRadioItem
              key={option.value}
              value={option.value}
              onSelect={(event) => {
                event.preventDefault()
                setPalette(option.value)
              }}
            >
              <span aria-hidden="true" className="flex -space-x-1">
                {option.colors.map((color) => (
                  <span
                    key={color}
                    className="size-3.5 rounded-full ring-1 ring-foreground/15"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
              {option.label}
            </AnimatedDropdownRadioItem>
          ))}
        </AnimatedDropdownRadioGroup>
      </AnimatedDropdownContent>
    </AnimatedDropdown>
  )
}
