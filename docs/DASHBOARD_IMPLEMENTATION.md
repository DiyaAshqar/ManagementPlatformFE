# Dashboard Implementation with PrimeNG & PrimeFlex

## 🎨 Overview

This implementation provides a modern, responsive dashboard with sidebar navigation, top navigation bar, and various dashboard widgets using **Angular 19**, **PrimeNG**, and **PrimeFlex**.

## ✨ Features

### 1. **Sidebar Navigation**
- Collapsible sidebar with mobile support
- Organized sections: Overview, Finance, Team
- Active route highlighting
- Mobile overlay for better UX
- Smooth transitions

### 2. **Top Navigation Bar**
- Breadcrumb navigation
- Notification badge
- Theme toggle (Dark/Light mode)
- Language toggle
- User profile dropdown menu

### 3. **Dashboard Components**

#### Accounts List Widget
- Total balance display
- Multiple account types (Savings, Checking, Investment, Debt)
- Color-coded icons
- Action buttons (Add, Send, Top-up, More)
- Responsive grid layout

#### Recent Transactions
- Transaction history display
- Income/Expense indicators
- Color-coded amounts
- Icon-based categorization

#### Upcoming Events
- Event list with icons
- Date and time display
- Call-to-action buttons

## 🎨 Theme Support

The application supports both **Light** and **Dark** themes:

### Light Theme
- Surface Ground: `#f8f9fa`
- Surface Card: `#ffffff`
- Text Color: `#1f2937`

### Dark Theme
- Surface Ground: `#0f0f12`
- Surface Card: `#18181b`
- Text Color: `#f9fafb`

Theme switching is handled by the `ThemeService` which applies CSS classes to the document root.

## 📁 Project Structure

```
src/app/
├── shared/
│   ├── components/
│   │   ├── sidebar/
│   │   │   ├── sidebar.component.ts
│   │   │   ├── sidebar.component.html
│   │   │   └── sidebar.component.scss
│   │   ├── top-nav/
│   │   │   ├── top-nav.component.ts
│   │   │   ├── top-nav.component.html
│   │   │   └── top-nav.component.scss
│   │   ├── accounts-list/
│   │   │   ├── accounts-list.component.ts
│   │   │   ├── accounts-list.component.html
│   │   │   └── accounts-list.component.scss
│   │   └── breadcrumb/
│   │       ├── breadcrumb.component.ts
│   │       ├── breadcrumb.component.html
│   │       └── breadcrumb.component.scss
│   └── index.ts
├── layouts/
│   └── main-layout/
│       ├── main-layout.component.ts
│       ├── main-layout.component.html
│       └── main-layout.component.scss
└── features/
    └── dashboard/
        ├── dashboard.component.ts
        ├── dashboard.component.html
        └── dashboard.component.scss
```

## 🚀 Usage

### Starting the Application

```bash
npm start
```

The application will be available at `http://localhost:4200`

### Theme Toggle

Click the moon/sun icon in the top navigation to switch between dark and light themes.

### Language Toggle

Click the globe icon in the top navigation to switch between available languages.

## 🎯 Components

### Sidebar Component

```typescript
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
```

**Features:**
- Mobile-responsive with hamburger menu
- Organized navigation sections
- Active route highlighting
- Smooth animations

### Top Navigation Component

```typescript
import { TopNavComponent } from './shared/components/top-nav/top-nav.component';
```

**Features:**
- Breadcrumb navigation
- Notification badge
- Theme switcher
- Language switcher
- User profile menu

### Accounts List Component

```typescript
import { AccountsListComponent } from './shared/components/accounts-list/accounts-list.component';
```

**Inputs:**
- `totalBalance`: string - Total balance to display
- `accounts`: Account[] - Array of account objects

**Account Interface:**
```typescript
interface Account {
  id: string;
  title: string;
  description?: string;
  balance: string;
  type: 'savings' | 'checking' | 'investment' | 'debt';
}
```

## 🎨 Styling

### PrimeNG Theme

The application uses PrimeNG Aura theme with custom CSS variables for theming:

```scss
:root {
  --surface-ground: #f8f9fa;
  --surface-card: #ffffff;
  --surface-border: #e5e7eb;
  --text-color: #1f2937;
  --primary-color: #3b82f6;
}
```

### PrimeFlex Grid

The dashboard uses PrimeFlex grid system:

```html
<div class="grid">
  <div class="col-12 lg:col-6">
    <!-- Content -->
  </div>
</div>
```

## 📱 Responsive Design

The dashboard is fully responsive with breakpoints:

- **Mobile**: < 576px
- **Tablet**: 576px - 991px
- **Desktop**: ≥ 992px

### Mobile Features
- Collapsible sidebar with overlay
- Hamburger menu
- Responsive grid layout
- Touch-friendly buttons

## 🔧 Customization

### Adding New Navigation Items

Edit `sidebar.component.ts`:

```typescript
navSections: NavSection[] = [
  {
    title: 'Your Section',
    items: [
      { label: 'Item', icon: 'pi pi-icon', route: '/route' }
    ]
  }
];
```

### Customizing Colors

Edit `_theme.scss`:

```scss
:root {
  --primary-color: #your-color;
  --surface-card: #your-color;
}
```

### Adding New Account Types

Edit the `Account` interface in `accounts-list.component.ts`:

```typescript
type: 'savings' | 'checking' | 'investment' | 'debt' | 'your-type'
```

Then add styling in the component SCSS.

## 🌐 Internationalization

The application supports i18n using `@ngx-translate/core`. Add translations in:

```
src/assets/i18n/
├── en.json
└── ar.json
```

## 🛠️ Services

### ThemeService

Manages theme switching:

```typescript
themeService.toggleTheme();
themeService.setTheme('dark');
themeService.isDarkTheme();
```

### LanguageService

Manages language switching:

```typescript
languageService.toggleLanguage();
languageService.setLanguage('ar');
```

## 📦 Dependencies

- **Angular**: ^19.1.0
- **PrimeNG**: ^19.1.4
- **PrimeFlex**: ^4.0.0
- **@primeng/themes**: ^19.1.4
- **@ngx-translate/core**: ^17.0.0

## 🎯 Best Practices

1. **Standalone Components**: All components are standalone for better tree-shaking
2. **Type Safety**: Full TypeScript support with interfaces
3. **Accessibility**: ARIA labels and semantic HTML
4. **Performance**: Lazy loading and OnPush change detection where applicable
5. **Responsive**: Mobile-first approach with PrimeFlex

## 🐛 Troubleshooting

### Theme not applying
- Check if `ThemeService` is properly initialized in `main-layout.component.ts`
- Ensure CSS variables are defined in `_theme.scss`

### Sidebar not showing on mobile
- Verify `isMobileMenuOpen` signal is working
- Check z-index values in `sidebar.component.scss`

### Icons not displaying
- Ensure `primeicons.css` is imported in `styles.scss`
- Verify icon class names (e.g., `pi pi-home`)

## 📝 Notes

- The dashboard uses CSS Grid and Flexbox for layouts
- All transitions are handled via CSS for better performance
- Theme changes are instant with CSS variables
- Components are fully reusable and customizable

## 🚀 Future Enhancements

- [ ] Add more dashboard widgets
- [ ] Implement data visualization charts
- [ ] Add user preferences persistence
- [ ] Add more theme presets
- [ ] Implement real-time notifications
- [ ] Add drag-and-drop widget positioning

---

**Built with ❤️ using Angular, PrimeNG, and PrimeFlex**
