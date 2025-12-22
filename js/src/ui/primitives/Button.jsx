import { forwardRef } from 'react';

const Button = forwardRef(function Button(
  {
    as,
    href,
    variant,
    size = 'md',
    iconOnly = false,
    active = false,
    pressed,
    className = '',
    type,
    ...props
  },
  ref
) {
  const Component = as || (href ? 'a' : 'button');
  const sizeClass =
    size === 'lg'
      ? 'is-lg'
      : size === 'sm'
        ? 'is-compact'
        : size === 'xs'
          ? 'is-tiny'
          : size === 'mini'
            ? 'is-mini'
            : size === 'icon'
              ? 'is-icon'
              : '';
  const variantClass = variant ? `is-${variant}` : '';
  const iconClass = iconOnly ? 'is-icon' : '';
  const activeClass = active ? 'is-active' : '';

  const classes = [
    'ui-button',
    sizeClass,
    variantClass,
    iconClass,
    activeClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const sharedProps = {
    ref,
    className: classes,
    'aria-pressed': pressed,
    ...props,
  };

  if (Component === 'button') {
    return (
      <button
        {...sharedProps}
        type={type || 'button'}
      />
    );
  }

  return <Component {...sharedProps} href={href} />;
});

export default Button;
