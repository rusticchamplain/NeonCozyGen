// js/src/components/Icons.jsx
// Clean, minimal SVG icons for the application

// Brand logo - stylized brush with spark
export const LogoMark = ({ size = 32, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    {/* Brush body - angled */}
    <path
      d="M8 24L20 4"
      stroke="url(#logo-gradient)"
      strokeWidth="3"
      strokeLinecap="round"
    />
    {/* Brush tip flare */}
    <path
      d="M6 26C6 26 7 24 8 24C9 24 10 25 8 27C6 29 4 28 6 26Z"
      fill="url(#logo-warm)"
    />
    {/* Generation sparks */}
    <circle cx="22" cy="8" r="2" fill="url(#logo-spark)" />
    <circle cx="26" cy="12" r="1.5" fill="url(#logo-spark)" opacity="0.8" />
    <circle cx="24" cy="16" r="1" fill="url(#logo-spark)" opacity="0.6" />
    {/* Gradient definitions */}
    <defs>
      <linearGradient id="logo-gradient" x1="8" y1="24" x2="20" y2="4" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FF9F7A" />
        <stop offset="0.5" stopColor="#9F8CFF" />
        <stop offset="1" stopColor="#44E1C5" />
      </linearGradient>
      <linearGradient id="logo-warm" x1="4" y1="24" x2="10" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FF9F7A" />
        <stop offset="1" stopColor="#FFD666" />
      </linearGradient>
      <radialGradient id="logo-spark" cx="0.3" cy="0.3" r="0.7">
        <stop stopColor="#FFFFFF" />
        <stop offset="0.5" stopColor="#44E1C5" />
        <stop offset="1" stopColor="#9F8CFF" />
      </radialGradient>
    </defs>
  </svg>
);

// Common wrapper for consistent sizing
const Icon = ({ children, size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

// Studio - brush stroke
export const IconStudio = (props) => (
  <Icon {...props}>
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.586 7.586" />
    <circle cx="11" cy="11" r="2" />
  </Icon>
);

// Home - simple house
export const IconHome = (props) => (
  <Icon {...props}>
    <path d="M3 10l9-7 9 7" />
    <path d="M5 10v10h14V10" />
    <path d="M9 20v-6h6v6" />
  </Icon>
);

// Gallery - minimalist frame with landscape
export const IconGallery = (props) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
    <path d="M21 15l-5-5L5 21" />
  </Icon>
);

// Aliases/Tags - simple tag shape
export const IconTag = (props) => (
  <Icon {...props}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" />
  </Icon>
);

// Aliases - layered tags
export const IconAlias = (props) => (
  <Icon {...props}>
    <path d="M14 3H4a2 2 0 00-2 2v10l6 6h10a2 2 0 002-2V9l-6-6z" />
    <path d="M14 3v6h6" />
    <path d="M7 7h5" />
    <path d="M7 11h7" />
  </Icon>
);

// Composer/Edit - pen tool
export const IconEdit = (props) => (
  <Icon {...props}>
    <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </Icon>
);

// Render/Generate - play with spark
export const IconRender = (props) => (
  <Icon {...props}>
    <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none" />
  </Icon>
);

// Logout - exit arrow
export const IconLogout = (props) => (
  <Icon {...props}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </Icon>
);

// Controls - sliders panel
export const IconControls = (props) => (
  <Icon {...props}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <line x1="9" y1="9" x2="9" y2="15" />
    <line x1="15" y1="9" x2="15" y2="15" />
    <circle cx="9" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="1.5" fill="currentColor" stroke="none" />
  </Icon>
);

// Activity/Status - pulse line
export const IconActivity = (props) => (
  <Icon {...props}>
    <polyline points="3 12 7 12 10 6 14 18 17 12 21 12" />
  </Icon>
);

// Images/Photo - camera aperture simplified
export const IconImages = (props) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="12" cy="12" r="4" />
    <line x1="3" y1="9" x2="6" y2="9" />
  </Icon>
);

// Folder open
export const IconFolderOpen = (props) => (
  <Icon {...props}>
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    <path d="M2 10h20" />
  </Icon>
);

// Folder closed
export const IconFolder = (props) => (
  <Icon {...props}>
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
  </Icon>
);

// Eye open (visible)
export const IconEye = (props) => (
  <Icon {...props}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

// Eye closed (hidden)
export const IconEyeOff = (props) => (
  <Icon {...props}>
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </Icon>
);

// Play
export const IconPlay = (props) => (
  <Icon {...props}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </Icon>
);

// Pause
export const IconPause = (props) => (
  <Icon {...props}>
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </Icon>
);

// Refresh - circular arrow
export const IconRefresh = (props) => (
  <Icon {...props}>
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
  </Icon>
);

// Chevron left
export const IconChevronLeft = (props) => (
  <Icon {...props}>
    <polyline points="15 18 9 12 15 6" />
  </Icon>
);

// Chevron right
export const IconChevronRight = (props) => (
  <Icon {...props}>
    <polyline points="9 18 15 12 9 6" />
  </Icon>
);

// Drag handle - 6 dots
export const IconGrip = (props) => (
  <Icon {...props}>
    <circle cx="9" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="18" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="18" r="1" fill="currentColor" stroke="none" />
  </Icon>
);

// X/Close - simple cross
export const IconX = (props) => (
  <Icon {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </Icon>
);

// Empty state - dashed frame
export const IconEmpty = (props) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2" />
    <line x1="9" y1="12" x2="15" y2="12" />
  </Icon>
);

// Arrow up
export const IconArrowUp = (props) => (
  <Icon {...props}>
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </Icon>
);

// More - horizontal dots
export const IconDots = (props) => (
  <Icon {...props}>
    <circle cx="6" cy="12" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="18" cy="12" r="1.6" fill="currentColor" stroke="none" />
  </Icon>
);

// Copy - overlapping squares
export const IconCopy = (props) => (
  <Icon {...props}>
    <rect x="9" y="9" width="10" height="10" rx="2" />
    <path d="M7 15H6a2 2 0 01-2-2V6a2 2 0 012-2h7" />
  </Icon>
);
