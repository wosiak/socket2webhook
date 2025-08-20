# 3C Plus Webhook Proxy - Design System

Este documento detalha o sistema de design da aplicação 3C Plus Webhook Proxy para facilitar a migração para outros editores como Cursor.

## 🎨 Paleta de Cores

### Cores Primárias
- **Primary Blue**: `#3057F2` - Cor principal da 3C Plus
- **Background**: `#ffffff` (light) / `oklch(0.145 0 0)` (dark)
- **Foreground**: `oklch(0.145 0 0)` (light) / `oklch(0.985 0 0)` (dark)

### Cores Secundárias
- **Muted**: `#ececf0` - Backgrounds sutis
- **Muted Foreground**: `#717182` - Textos secundários
- **Border**: `rgba(0, 0, 0, 0.1)` - Bordas suaves
- **Input Background**: `#f3f3f5` - Campos de input

### Cores de Estado
- **Success**: `#22c55e` - Socket conectado
- **Error**: `#ef4444` - Socket desconectado / Erros
- **Warning**: `#f59e0b` - Alertas
- **Destructive**: `#d4183d` - Ações destrutivas

## 📐 Espaçamentos

### Sistema de Grid
- **Container Max Width**: `1200px`
- **Padding Lateral**: `2rem` (32px)
- **Gap Padrão**: `1.5rem` (24px)

### Espaçamentos Internos
- **Card Padding**: `1.5rem` (24px)
- **Modal Padding**: `2rem` (32px)
- **Button Padding**: `0.75rem 1.5rem` (12px 24px)
- **Input Padding**: `0.75rem 1rem` (12px 16px)

## 🔤 Tipografia

### Font Stack
- **Base Font Size**: `14px` (definido em CSS custom properties)
- **Font Family**: System font stack (Inter, SF Pro, Segoe UI)

### Hierarquia
- **H1**: `text-2xl` (24px) - `font-weight: 600` - Títulos principais
- **H2**: `text-xl` (20px) - `font-weight: 600` - Subtítulos
- **H3**: `text-lg` (18px) - `font-weight: 500` - Seções
- **Body**: `text-base` (14px) - `font-weight: 400` - Texto padrão
- **Caption**: `text-sm` (12px) - `font-weight: 400` - Textos menores

## 🎭 Sombras

### Elevação de Cards
- **Card Shadow**: `shadow-sm` - `0 1px 2px 0 rgb(0 0 0 / 0.05)`
- **Card Hover**: `shadow-md` - `0 4px 6px -1px rgb(0 0 0 / 0.1)`
- **Modal Shadow**: `shadow-xl` - `0 20px 25px -5px rgb(0 0 0 / 0.1)`
- **Dropdown Shadow**: `shadow-lg` - `0 10px 15px -3px rgb(0 0 0 / 0.1)`

### Sombras Coloridas
- **Primary Shadow**: `shadow-primary/20` - Para botões primários
- **Success Shadow**: `shadow-green-500/20` - Para estados de sucesso

## 🔘 Border Radius

### Sistema de Arredondamento
- **Default**: `--radius: 0.625rem` (10px)
- **Small**: `calc(var(--radius) - 4px)` (6px)
- **Medium**: `calc(var(--radius) - 2px)` (8px)
- **Large**: `var(--radius)` (10px)
- **XLarge**: `calc(var(--radius) + 4px)` (14px)

### Aplicações
- **Cards**: `rounded-lg` (10px)
- **Buttons**: `rounded-md` (8px)
- **Inputs**: `rounded-md` (8px)
- **Modals**: `rounded-xl` (14px)
- **Avatars**: `rounded-full`
- **Status Indicators**: `rounded-full`

## 🎯 Componentes Visuais

### Header
- **Height**: `4rem` (64px)
- **Background**: Gradiente sutil `bg-gradient-to-r from-background to-primary/5`
- **Border**: `border-b` com cor `border`
- **Backdrop Blur**: `backdrop-blur-sm` para efeito glassmorphism

### Cards
- **Background**: `bg-card`
- **Border**: `border border-border`
- **Shadow**: `shadow-sm hover:shadow-md`
- **Transition**: `transition-all duration-200`
- **Padding**: `p-6`

### Buttons

#### Primary Button
- **Background**: `bg-primary hover:bg-primary/90`
- **Text**: `text-primary-foreground`
- **Shadow**: `shadow-sm hover:shadow-md`
- **Transition**: `transition-all duration-200`

#### Secondary Button
- **Background**: `bg-secondary hover:bg-secondary/80`
- **Text**: `text-secondary-foreground`
- **Border**: `border border-border`

#### Ghost Button
- **Background**: `transparent hover:bg-accent`
- **Text**: `text-foreground`

### Inputs
- **Background**: `bg-input-background`
- **Border**: `border border-border focus:border-primary`
- **Ring**: `focus:ring-2 focus:ring-primary/20`
- **Transition**: `transition-colors duration-200`

### Status Indicators
- **Socket Connected**: 
  - Color: `text-green-600`
  - Icon: `bg-green-600` dot
  - Pulse: `animate-pulse` quando conectando

- **Socket Disconnected**:
  - Color: `text-red-600`
  - Icon: `bg-red-600` dot

### Tabs
- **Background**: `bg-muted`
- **Active Tab**: `bg-background text-foreground shadow-sm`
- **Inactive Tab**: `text-muted-foreground hover:text-foreground`
- **Indicator**: Sombra sutil para tab ativo

### Loading States
- **Spinner**: `animate-spin text-primary`
- **Skeleton**: `bg-muted animate-pulse`
- **Overlay**: `bg-background/80 backdrop-blur-sm`

### Modals
- **Backdrop**: `bg-background/80 backdrop-blur-sm`
- **Content**: `bg-card shadow-xl rounded-xl`
- **Max Width**: `max-w-2xl`
- **Animation**: Fade in + scale up

## 🎨 Gradientes e Efeitos

### Gradientes de Fundo
- **Header**: `bg-gradient-to-r from-background to-primary/5`
- **Card Hover**: `hover:bg-gradient-to-br from-card to-primary/5`
- **Text Gradient**: `bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent`

### Glassmorphism
- **Header**: `backdrop-blur-sm bg-background/95`
- **Modal Backdrop**: `backdrop-blur-sm`
- **Floating Elements**: `backdrop-blur-md bg-card/90`

## 📱 Responsividade

### Breakpoints
- **Mobile**: `< 640px`
- **Tablet**: `640px - 1024px`
- **Desktop**: `> 1024px`

### Layout Adaptativo
- **Mobile**: Single column, full width cards
- **Tablet**: Grid 2 colunas para cards
- **Desktop**: Grid 3-4 colunas, sidebar quando aplicável

## 🎯 Estados Interativos

### Hover States
- **Cards**: `hover:shadow-md hover:scale-[1.02]`
- **Buttons**: `hover:bg-primary/90 hover:shadow-md`
- **Links**: `hover:text-primary`

### Active States
- **Buttons**: `active:scale-[0.98]`
- **Cards**: `active:scale-[0.99]`

### Focus States
- **Inputs**: `focus:ring-2 focus:ring-primary/20 focus:border-primary`
- **Buttons**: `focus:ring-2 focus:ring-primary/20 focus:ring-offset-2`

## 🌙 Dark Mode

### Automatic Theme Switching
- Usa `@custom-variant dark (&:is(.dark *))`
- Cores automáticas via CSS custom properties
- Sombras ajustadas para modo escuro
- Contraste otimizado para legibilidade

## 🎨 Animações

### Transições Padrão
- **Duration**: `transition-all duration-200`
- **Easing**: `ease-in-out` (padrão do Tailwind)

### Micro-interações
- **Loading**: `animate-spin` para spinners
- **Pulse**: `animate-pulse` para elementos carregando
- **Bounce**: `animate-bounce` para notificações
- **Scale**: `hover:scale-[1.02]` para cards

### Skeleton Loading
- **Background**: `bg-muted`
- **Animation**: `animate-pulse`
- **Duration**: 2s iteração infinita