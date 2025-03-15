# Kids AI Color System

This document outlines the color tokens and theming approach used in the Kids AI application.

## Color Scales

### Grey Scale (Neutral Colors)

Our application uses a 10-step grey scale as the primary neutral palette. These colors form the backbone of our UI.

| Token        | Hex Code | RGB Value           | Description                  |
|--------------|----------|---------------------|------------------------------|
| `grey-10`    | #14181F  | rgb(20, 24, 31)     | Darkest grey - near black    |
| `grey-20`    | #28323E  | rgb(40, 50, 62)     | Very dark grey               |
| `grey-30`    | #3C4B5D  | rgb(60, 75, 93)     | Dark grey                    |
| `grey-40`    | #50647C  | rgb(80, 100, 124)   | Medium-dark grey             |
| `grey-50`    | #667D99  | rgb(102, 125, 153)  | Medium grey                  |
| `grey-60`    | #8397AF  | rgb(131, 151, 175)  | Medium-light grey           |
| `grey-70`    | #A2B1C3  | rgb(162, 177, 195)  | Light grey                  |
| `grey-80`    | #C1CBD7  | rgb(193, 203, 215)  | Very light grey             |
| `grey-90`    | #E0E5EB  | rgb(224, 229, 235)  | Near-white grey             |
| `grey-100`   | #F3F5F7  | rgb(243, 245, 247)  | Lightest grey - near white  |

### Orange Scale (Accent Colors)

Our application uses a 10-step orange scale for accents and highlights.

| Token        | Hex Code | RGB Value           | Description                  |
|--------------|----------|---------------------|------------------------------|
| `orange-10`  | #2B1508  | rgb(43, 21, 8)      | Darkest orange - near black  |
| `orange-20`  | #5A280C  | rgb(90, 40, 12)     | Very dark orange             |
| `orange-30`  | #873C12  | rgb(135, 60, 18)    | Dark orange                  |
| `orange-40`  | #AD521F  | rgb(173, 82, 31)    | Medium-dark orange           |
| `orange-50`  | #D0692F  | rgb(208, 105, 47)   | Medium orange                |
| `orange-60`  | #E7834B  | rgb(231, 131, 75)   | Medium-light orange          |
| `orange-70`  | #EDA278  | rgb(237, 162, 120)  | Light orange                 |
| `orange-80`  | #F3C1A5  | rgb(243, 193, 165)  | Very light orange            |
| `orange-90`  | #F9E0D2  | rgb(249, 224, 210)  | Near-white orange            |
| `orange-100` | #FDF3ED  | rgb(253, 243, 237)  | Lightest orange - near white |

### State Colors

These colors are used specifically for circle animations to indicate different states:

| Token             | Color         | Used For                      |
|-------------------|---------------|-------------------------------|
| `state-listening` | Blue (#4285F4)| Listening state animation     |
| `state-thinking`  | Amber (#FFA000)| Thinking state animation     |
| `state-speaking`  | Red (#DB4437) | Speaking state animation      |
| `state-searching` | Purple (#8E24AA)| Searching state animation   |
| `state-idle`      | White (#FFFFFF)| Idle state animation         |

## Semantic Colors

Semantic colors are mapped to our grey and orange scales to ensure consistent theming:

| Token                  | Light Mode             | Dark Mode               |
|------------------------|------------------------|-------------------------|
| `primary`              | Grey-10                | Grey-90                 |
| `primary-foreground`   | Grey-100               | Grey-10                 |
| `secondary`            | Grey-90                | Grey-20                 |
| `secondary-foreground` | Grey-10                | Grey-100                |
| `muted`                | Grey-80                | Grey-30                 |
| `muted-foreground`     | Grey-30                | Grey-70                 |
| `accent`               | Orange-50              | Orange-50               |
| `accent-foreground`    | Grey-10                | Grey-100                |

## Usage Guidelines

### In Tailwind Classes

Use our color tokens directly in Tailwind classes:

```jsx
// Using grey scale
<div className="bg-grey-10 text-grey-100">Dark background with light text</div>
<div className="bg-grey-90 text-grey-10">Light background with dark text</div>

// Using orange scale for accents
<button className="bg-orange-50 text-white">Orange Button</button>
<div className="border-orange-30 border-2">Orange bordered box</div>

// Using semantic colors (automatically adjusts in dark mode)
<div className="bg-primary text-primary-foreground">Primary element</div>
<button className="bg-accent text-accent-foreground">Accent button</button>
```

### In JavaScript/Canvas

For canvas animations or JavaScript color manipulation, use our utility functions:

```javascript
import { getGreyColor, getOrangeColor, getStateColor } from '../../utils/themeUtils';

// Get a grey color
const darkGrey = getGreyColor(30);  // hsl(213 22% 32%)
const lightGreyWithOpacity = getGreyColor(80, 0.5);  // hsla(212 16% 80%, 0.5)

// Get an orange color
const accentOrange = getOrangeColor(50);  // hsl(21 63% 50%)

// Get state colors for animations
const listeningColor = getStateColor('listening');  // hsl(221 89% 59%)
```

## Theme Switching

The application supports both light and dark themes. Colors automatically adjust based on the current theme.

### Programmatic Theme Toggle

```javascript
import { toggleTheme } from '../../utils/themeUtils';

// Toggle between light and dark mode
const handleThemeToggle = () => {
  toggleTheme();
};
```

### Theme Toggle Component

You can use our built-in theme toggle component:

```jsx
import { ThemeToggle } from './components/ui/theme-toggle';

function Header() {
  return (
    <header className="p-4 flex justify-between items-center">
      <h1>Kids AI</h1>
      <ThemeToggle />
    </header>
  );
}
```

## Design Principles

Our color system follows these core principles:

1. **Minimalist Braun-inspired aesthetic** - clean, functional, and timeless
2. **Child-friendly without being childish** - sophisticated design that respects children's intelligence
3. **Clear visual feedback** - distinct colors for different states
4. **Consistent theming** - colors work harmoniously in both light and dark modes
5. **Accessible contrast ratios** - ensuring text remains readable against backgrounds
