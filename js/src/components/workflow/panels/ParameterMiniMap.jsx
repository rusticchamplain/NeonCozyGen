const STYLE_VARIANTS = {
  sticky:
    'sticky top-16 z-10 -mx-3 mb-3 rounded-2xl border border-[#1F2342] bg-[#050716F2] px-3 py-2 shadow-[0_10px_30px_rgba(5,7,22,0.82)] backdrop-blur-md sm:mx-0',
  inline:
    'rounded-2xl border border-[#1F2342] bg-[#050716] px-3 py-2 shadow-[0_10px_22px_rgba(5,7,22,0.7)]',
};

export default function ParameterMiniMap({
  items = [],
  activeId,
  onJump,
  variant = 'sticky',
  title = 'Quick Jump',
  subtitle,
}) {
  if (!items.length) {
    return (
      <div
        className={`${STYLE_VARIANTS[variant] || STYLE_VARIANTS.sticky} text-[10px] text-[#6C719C]`}
      >
        No adjustable parameters found.
      </div>
    );
  }

  const wrapperClass =
    STYLE_VARIANTS[variant] || STYLE_VARIANTS.sticky;

  return (
    <div className={wrapperClass}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#9DA3FF]">
          {title}
        </div>
        <div className="text-[10px] text-[#6C719C]">
          {subtitle || `${items.length} controls`}
        </div>
      </div>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onJump && onJump(item.id)}
              className={
                'flex-shrink-0 rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.12em] transition-colors ' +
                (isActive
                  ? 'border-[#3EF0FF] bg-[#0A1B2C] text-[#E5F8FF]'
                  : 'border-[#2E335C] bg-[#090B1F] text-[#9DA3FF]')
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
