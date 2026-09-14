import {
  ArrowClockwise,
  ArrowDown,
  Check,
  CheckCircle,
  ClipboardText,
  ClockCounterClockwise,
  Cookie,
  DeviceMobile,
  DownloadSimple,
  FacebookLogo,
  FilmStrip,
  GearSix,
  Globe,
  InstagramLogo,
  Keyboard,
  Link,
  List,
  Lock,
  Minus,
  Moon,
  MusicNotes,
  Plus,
  Queue,
  SignOut,
  SoundcloudLogo,
  Sun,
  TiktokLogo,
  Timer,
  Trash,
  VideoCamera,
  WarningCircle,
  X,
  XLogo,
  YoutubeLogo,
  CaretRight,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";

const ICONS = {
  arrowClockwise: ArrowClockwise,
  arrowDown: ArrowDown,
  caretRight: CaretRight,
  check: Check,
  checkCircle: CheckCircle,
  clipboard: ClipboardText,
  history: ClockCounterClockwise,
  cookie: Cookie,
  deviceMobile: DeviceMobile,
  download: DownloadSimple,
  facebook: FacebookLogo,
  filmStrip: FilmStrip,
  gear: GearSix,
  globe: Globe,
  instagram: InstagramLogo,
  keyboard: Keyboard,
  link: Link,
  list: List,
  lock: Lock,
  minus: Minus,
  moon: Moon,
  musicNotes: MusicNotes,
  plus: Plus,
  queue: Queue,
  signOut: SignOut,
  soundcloud: SoundcloudLogo,
  sun: Sun,
  tiktok: TiktokLogo,
  timer: Timer,
  trash: Trash,
  videoCamera: VideoCamera,
  vimeo: VideoCamera,
  warningCircle: WarningCircle,
  x: X,
  xLogo: XLogo,
  youtube: YoutubeLogo,
} satisfies Record<string, PhosphorIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 18,
  weight = "regular",
}: {
  name: IconName;
  size?: number;
  weight?: "regular" | "fill" | "bold";
}): ReactNode {
  const Component = ICONS[name];
  return (
    <Component
      size={size}
      weight={weight}
      aria-hidden="true"
      focusable="false"
    />
  );
}
