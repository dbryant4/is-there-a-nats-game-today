# HTML & CSS Coding Rules

## HTML Best Practices
- Use semantic HTML5 elements (`main`, `section`, `header`, `footer`)
- Include proper meta tags for SEO and accessibility
- Use meaningful `id` and `class` names that describe content, not appearance
- Include `aria-*` attributes for accessibility when needed
- Validate HTML structure and close all tags properly

## CSS Architecture
- Use CSS custom properties (variables) for consistent theming
- Follow BEM methodology for class naming when appropriate
- Group related styles together
- Use mobile-first responsive design with media queries
- Prefer flexbox and grid for layouts

## Performance
- Minimize CSS specificity conflicts
- Use efficient selectors (avoid deep nesting)
- Optimize for critical rendering path
- Use `preconnect` for external fonts and resources
- Keep CSS file sizes small and focused

## Accessibility
- Ensure sufficient color contrast ratios
- Use focus styles for keyboard navigation
- Provide alternative text for images
- Use proper heading hierarchy (h1, h2, h3...)
- Test with screen readers and keyboard-only navigation

## Progressive Enhancement
- Design for mobile devices first
- Ensure core functionality works without JavaScript
- Use CSS Grid and Flexbox with appropriate fallbacks
- Test across different browsers and devices

## Dark Mode and Theming
- Use CSS custom properties for color schemes
- Follow system preferences when possible
- Ensure all interactive elements are visible in all themes
- Test color combinations for accessibility compliance
