import type { SVGProps } from 'react';

import type { CategoryIcon } from '@/lib/treatments';

/** Small inline stroke icons, so we don't ship an icon library. Decorative by default. */
type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      width={24}
      height={24}
      {...props}
      style={{ flexShrink: 0, ...props.style }}
    >
      {children}
    </svg>
  );
}

export const PhoneIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </Svg>
);

export const ChatIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.2Z" />
    <path d="M9 10h.01M12 10h.01M15 10h.01" />
  </Svg>
);

export const MailIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Svg>
);

export const MapPinIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z" />
    <circle cx="12" cy="9" r="2.5" />
  </Svg>
);

export const ClockIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);

export const MenuIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

export const CalendarIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Svg>
);

export const QuoteIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6" />
  </Svg>
);

export const InfoIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Svg>
);

// Why Homoeopathy
export const LeafIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15" />
    <path d="M5 19c3-4 6-7 10-9" />
  </Svg>
);

export const FeatherIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 4c-6 0-12 4-13 13l-3 3" />
    <path d="M20 4c0 7-4 12-11 13M14 10l-6 6" />
  </Svg>
);

export const UserCheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="4" />
    <path d="M2 21a7 7 0 0 1 14 0M16 11l2 2 4-4" />
  </Svg>
);

export const HourglassIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9" />
  </Svg>
);

export const ShieldIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
);

export const FamilyIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="7" cy="6" r="2.5" />
    <circle cx="17" cy="6" r="2.5" />
    <circle cx="12" cy="12" r="2" />
    <path d="M3 21v-5a4 4 0 0 1 8 0M13 16a4 4 0 0 1 8 0v5M9 21v-2a3 3 0 0 1 6 0v2" />
  </Svg>
);

// Treatment categories
const categoryIcons: Record<CategoryIcon, (p: IconProps) => React.JSX.Element> = {
  lungs: (p) => (
    <Svg {...p}>
      <path d="M12 3v8M12 11c-1 1-2 1.5-3 1.5M12 11c1 1 2 1.5 3 1.5" />
      <path d="M9 8C6 8 3 13 3 18c0 2 1 3 3 3 2.5 0 3-2 3-4V8ZM15 8c3 0 6 5 6 10 0 2-1 3-3 3-2.5 0-3-2-3-4V8Z" />
    </Svg>
  ),
  ear: (p) => (
    <Svg {...p}>
      <path d="M6 9a6 6 0 0 1 12 0c0 3-2 4-3 5.5S14 18 12 20s-5 0-5-2" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-1.5 2-1.5 3.5" />
    </Svg>
  ),
  skin: (p) => (
    <Svg {...p}>
      <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3Z" />
      <path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8Z" />
    </Svg>
  ),
  bone: (p) => (
    <Svg {...p}>
      <path d="M8.5 15.5 15.5 8.5M7 13a2.5 2.5 0 1 0-3 3 2.5 2.5 0 1 0 3 3l1.5-1.5M17 11a2.5 2.5 0 1 0 3-3 2.5 2.5 0 1 0-3-3l-1.5 1.5" />
      <path d="M8.5 17.5 6.5 15.5M17.5 8.5l-2-2" />
    </Svg>
  ),
  digestive: (p) => (
    <Svg {...p}>
      <path d="M9 3v4c0 2 2 3 4 3 4 0 7 2 7 6s-3 5-6 5c-4 0-5-3-8-3-1.5 0-3 1-3 1" />
      <path d="M13 14c0 1 1 2 2 2" />
    </Svg>
  ),
  women: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="9" r="5" />
      <path d="M12 14v7M9 18h6" />
    </Svg>
  ),
  chronic: (p) => (
    <Svg {...p}>
      <path d="M3 12h4l2-5 4 10 2-5h6" />
    </Svg>
  ),
  child: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="5" r="2.5" />
      <path d="M7 10h10M12 10v5M9 21l3-6 3 6" />
    </Svg>
  ),
  mind: (p) => (
    <Svg {...p}>
      <path d="M12 21v-4M9 4.5A3 3 0 0 0 4 7a3 3 0 0 0-1 5 3 3 0 0 0 3 4h2.5A3.5 3.5 0 0 0 12 17a3.5 3.5 0 0 0 3.5-1H18a3 3 0 0 0 3-4 3 3 0 0 0-1-5 3 3 0 0 0-5-2.5A3 3 0 0 0 9 4.5Z" />
    </Svg>
  ),
  plus: (p) => (
    <Svg {...p}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </Svg>
  ),
};

export function CategoryIconView({ icon, ...props }: IconProps & { icon: CategoryIcon }) {
  const Icon = categoryIcons[icon];
  return <Icon {...props} />;
}
