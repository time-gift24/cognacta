"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { ArrowDown01Icon, Tick02Icon } from "@hugeicons-pro/core-stroke-rounded";
import {
  Select as BeuiSelect,
  type SelectOption as BeuiSelectOption,
  type SelectProps as BeuiSelectProps,
} from "@/components/beui/premium/select/select";

export type SelectOption = Omit<BeuiSelectOption, "icon"> & {
  icon?: IconSvgElement;
};
export type SelectProps = Omit<BeuiSelectProps, "options" | "icons"> & {
  options: readonly SelectOption[];
};

export function Select({ options, ...props }: SelectProps) {
  return (
    <BeuiSelect
      {...props}
      options={options.map(({ icon, ...option }) => ({
        ...option,
        icon: icon ? <HugeiconsIcon icon={icon} size={16} /> : undefined,
      }))}
      icons={{
        chevron: <HugeiconsIcon icon={ArrowDown01Icon} />,
        selected: <HugeiconsIcon icon={Tick02Icon} />,
      }}
    />
  );
}
