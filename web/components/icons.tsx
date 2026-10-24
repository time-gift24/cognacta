import {
  Sun01Icon,
  Moon02Icon,
  ComputerIcon,
  Add01Icon,
  BotIcon,
  Copy01Icon,
  RepeatIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  LinkSquare02Icon,
  Edit02Icon,
  Archive02Icon,
  Delete02Icon,
  PinIcon,
  MoreHorizontalIcon,
  ArrowRight01Icon,
  Remove01Icon,
  UserCircleIcon,
  CreditCardIcon,
  HelpCircleIcon,
  Logout01Icon,
  ArrowDown01Icon,
  ArrowUp02Icon,
  Attachment01Icon,
  BookOpen01Icon,
  Cancel01Icon,
  CodeIcon,
  File01Icon,
  Folder01Icon,
  Globe02Icon,
  GridViewIcon,
  Image01Icon,
  Menu01Icon,
  Message01Icon,
  Mic01Icon,
  PackageIcon,
  PenTool01Icon,
  Search01Icon,
  Settings01Icon,
  SidebarLeftIcon,
  SlidersHorizontalIcon,
  StopIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import {
  HugeiconsIcon,
  type HugeiconsIconProps,
  type IconSvgElement,
} from "@hugeicons/react";

// Keep the template's semantic icon names in one place.
function iconComponent(icon: IconSvgElement) {
  return function Icon(props: Omit<HugeiconsIconProps, "icon">) {
    return (
      <HugeiconsIcon
        icon={icon}
        size={24}
        strokeWidth={1.5}
        aria-hidden="true"
        {...props}
      />
    );
  };
}

export const ArrowUp = iconComponent(ArrowUp02Icon);
export const Sun = iconComponent(Sun01Icon);
export const Moon = iconComponent(Moon02Icon);
export const Monitor = iconComponent(ComputerIcon);
export const BookOpen = iconComponent(BookOpen01Icon);
export const Box = iconComponent(PackageIcon);
export const Boxes = iconComponent(GridViewIcon);
export const Check = iconComponent(Tick02Icon);
export const ChevronDown = iconComponent(ArrowDown01Icon);
export const Code2 = iconComponent(CodeIcon);
export const FileText = iconComponent(File01Icon);
export const Folder = iconComponent(Folder01Icon);
export const Globe2 = iconComponent(Globe02Icon);
export const Image = iconComponent(Image01Icon);
export const LayoutGrid = iconComponent(GridViewIcon);
export const Menu = iconComponent(Menu01Icon);
export const MessageCircle = iconComponent(Message01Icon);
export const Mic = iconComponent(Mic01Icon);
export const PanelLeft = iconComponent(SidebarLeftIcon);
export const Paperclip = iconComponent(Attachment01Icon);
export const PenTool = iconComponent(PenTool01Icon);
export const Plus = iconComponent(Add01Icon);
export const Bot = iconComponent(BotIcon);
export const Copy = iconComponent(Copy01Icon);
export const RotateCcw = iconComponent(RepeatIcon);
export const ThumbsUp = iconComponent(ThumbsUpIcon);
export const ThumbsDown = iconComponent(ThumbsDownIcon);
export const ExternalLink = iconComponent(LinkSquare02Icon);
export const BookOpenText = iconComponent(BookOpen01Icon);
export const Edit = iconComponent(Edit02Icon);
export const Archive = iconComponent(Archive02Icon);
export const Trash = iconComponent(Delete02Icon);
export const Pin = iconComponent(PinIcon);
export const MoreHorizontal = iconComponent(MoreHorizontalIcon);
export const Search = iconComponent(Search01Icon);
export const Settings = iconComponent(Settings01Icon);
export const SlidersHorizontal = iconComponent(SlidersHorizontalIcon);
export const Square = iconComponent(StopIcon);
export const X = iconComponent(Cancel01Icon);
export const ChevronRight = iconComponent(ArrowRight01Icon);
export const Minus = iconComponent(Remove01Icon);
export const UserCircle = iconComponent(UserCircleIcon);
export const CreditCard = iconComponent(CreditCardIcon);
export const HelpCircle = iconComponent(HelpCircleIcon);
export const LogOut = iconComponent(Logout01Icon);
