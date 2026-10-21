"use client"

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  CheckIcon,
  MinusSignIcon,
} from "@hugeicons-pro/core-stroke-rounded"
import {
  AnimatedDropdownCheckboxItem as BeuiCheckboxItem,
  AnimatedDropdownRadioItem as BeuiRadioItem,
  AnimatedDropdownSubTrigger as BeuiSubTrigger,
} from "@/components/beui/premium/animated-dropdown"

export * from "@/components/beui/premium/animated-dropdown"

type GlyphProps = Pick<ComponentPropsWithoutRef<"svg">, "className" | "aria-hidden">

function CheckGlyph(props: GlyphProps) {
  return <HugeiconsIcon icon={CheckIcon} {...props} />
}

function MinusGlyph(props: GlyphProps) {
  return <HugeiconsIcon icon={MinusSignIcon} {...props} />
}

function ChevronGlyph(props: GlyphProps) {
  return <HugeiconsIcon icon={ArrowRight01Icon} {...props} />
}

export const AnimatedDropdownCheckboxItem = forwardRef<
  ComponentRef<typeof BeuiCheckboxItem>,
  ComponentPropsWithoutRef<typeof BeuiCheckboxItem>
>(function AnimatedDropdownCheckboxItem(
  { checkedIcon = CheckGlyph, indeterminateIcon = MinusGlyph, ...props },
  ref
) {
  return (
    <BeuiCheckboxItem
      ref={ref}
      checkedIcon={checkedIcon}
      indeterminateIcon={indeterminateIcon}
      {...props}
    />
  )
})

export const AnimatedDropdownRadioItem = forwardRef<
  ComponentRef<typeof BeuiRadioItem>,
  ComponentPropsWithoutRef<typeof BeuiRadioItem>
>(function AnimatedDropdownRadioItem(
  { checkedIcon = CheckGlyph, ...props },
  ref
) {
  return <BeuiRadioItem ref={ref} checkedIcon={checkedIcon} {...props} />
})

export const AnimatedDropdownSubTrigger = forwardRef<
  ComponentRef<typeof BeuiSubTrigger>,
  ComponentPropsWithoutRef<typeof BeuiSubTrigger>
>(function AnimatedDropdownSubTrigger(
  { chevronIcon = ChevronGlyph, ...props },
  ref
) {
  return <BeuiSubTrigger ref={ref} chevronIcon={chevronIcon} {...props} />
})
