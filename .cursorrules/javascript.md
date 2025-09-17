# JavaScript Coding Rules

## General Principles
- Write clean, readable, and maintainable code
- Use modern ES6+ features when appropriate
- Prefer functional programming patterns over imperative
- Keep functions small and focused on a single responsibility

## Code Style
- Use 2 spaces for indentation
- Use single quotes for strings unless interpolation is needed
- Add trailing commas in multi-line objects and arrays
- Use semicolons consistently
- Prefer `const` over `let`, avoid `var`

## Error Handling
- Always handle errors gracefully with try/catch blocks
- Return null or appropriate default values instead of throwing for expected failures
- Log errors to console for debugging but don't crash the application

## API and Data Handling
- Use `fetch` with proper error checking
- Always validate data structure before accessing nested properties
- Use optional chaining (`?.`) and nullish coalescing (`??`) operators
- Cache API responses when appropriate with `cache: 'no-store'` for fresh data

## DOM Manipulation
- Use modern DOM APIs (`querySelector`, `getElementById`)
- Prefer `insertAdjacentHTML` over `innerHTML` when appending
- Use event delegation for dynamic content
- Clean up event listeners when removing elements

## Time and Date Handling
- Always specify timezone when working with dates
- Use `Intl.DateTimeFormat` for locale-aware formatting
- Convert all times to UTC for storage, display in user's timezone
- Handle daylight saving time transitions properly

## Comments and Documentation
- Write self-documenting code with descriptive variable names
- Add comments for complex logic or business rules
- Document function parameters and return values
- Explain timezone handling and data transformations
