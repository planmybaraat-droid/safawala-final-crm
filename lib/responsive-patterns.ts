/**
 * Mobile Responsive Utility Classes & Patterns
 * 
 * Consistent responsive design patterns for the CRM
 * Based on Tailwind breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
 */

export const responsivePatterns = {
  // Page Containers
  page: "min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8",
  pageNoPadding: "min-h-screen bg-gray-50",
  
  // Layout Grids
  statsGrid2: "grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4",
  statsGrid3: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4",
  statsGrid4: "grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4",
  statsGrid6: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4",
  
  formGrid2: "grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6",
  formGrid3: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6",
  
  productGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
  cardGrid2: "grid gap-4 md:gap-6 md:grid-cols-2",
  cardGrid3: "grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3",
  
  // Flex Layouts
  headerRow: "flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between",
  actionRow: "flex flex-col sm:flex-row gap-2 sm:gap-3",
  buttonGroup: "flex flex-col sm:flex-row gap-2",
  
  // Spacing
  sectionSpacing: "space-y-4 md:space-y-6",
  cardPadding: "p-4 sm:p-6",
  
  // Typography
  pageTitle: "text-2xl sm:text-3xl font-bold",
  cardTitle: "text-lg sm:text-xl font-semibold",
  sectionTitle: "text-base sm:text-lg font-medium",
  
  // Inputs & Controls
  searchInput: "w-full sm:w-64 md:w-80",
  selectInput: "w-full sm:w-40 md:w-48",
  
  // Buttons
  touchButton: "min-h-[44px] px-4 py-2", // Apple HIG minimum touch target
  iconButton: "min-h-[44px] min-w-[44px]",
  
  // Tables
  tableContainer: "overflow-x-auto -mx-4 sm:mx-0",
  tableWrapper: "inline-block min-w-full align-middle",
  
  // Dialogs
  dialogContent: "max-w-[calc(100vw-2rem)] sm:max-w-lg md:max-w-2xl lg:max-w-4xl",
  dialogWide: "max-w-[calc(100vw-2rem)] sm:max-w-3xl md:max-w-4xl lg:max-w-6xl",
  
  // Sidebar/Navigation
  hideOnMobile: "hidden md:block",
  showOnMobile: "md:hidden",
  
  // Pagination
  paginationContainer: "flex flex-col sm:flex-row items-center justify-between gap-4 pt-6",
  paginationControls: "flex flex-col sm:flex-row items-center gap-2",
}

/**
 * Responsive breakpoints reference
 */
export const breakpoints = {
  sm: 640,  // Small devices (phones)
  md: 768,  // Medium devices (tablets)
  lg: 1024, // Large devices (desktops)
  xl: 1280, // Extra large devices
  '2xl': 1536, // 2X large devices
}

/**
 * Touch-friendly sizing (Apple HIG & Material Design guidelines)
 */
export const touchTargets = {
  minimum: 44, // Minimum touch target size (44x44px)
  comfortable: 48, // Comfortable touch target (48x48px)
  spacing: 8, // Minimum spacing between touch targets
}

/**
 * Mobile-first utility functions
 */
export const mobileUtils = {
  /**
   * Check if viewport is mobile
   */
  isMobile: () => typeof window !== 'undefined' && window.innerWidth < breakpoints.md,
  
  /**
   * Check if viewport is tablet
   */
  isTablet: () => typeof window !== 'undefined' && 
    window.innerWidth >= breakpoints.md && window.innerWidth < breakpoints.lg,
  
  /**
   * Check if viewport is desktop
   */
  isDesktop: () => typeof window !== 'undefined' && window.innerWidth >= breakpoints.lg,
}

/**
 * Common responsive patterns for forms
 */
export const formPatterns = {
  field: "space-y-2",
  fieldRow: "grid grid-cols-1 md:grid-cols-2 gap-4",
  fieldRow3: "grid grid-cols-1 md:grid-cols-3 gap-4",
  label: "text-sm font-medium",
  input: "w-full",
  checkbox: "min-h-[44px] min-w-[44px]",
}

/**
 * Common responsive patterns for lists/tables
 */
export const listPatterns = {
  item: "p-4 border-b hover:bg-gray-50 transition-colors",
  itemMobile: "p-3 sm:p-4",
  itemActions: "flex flex-col sm:flex-row gap-2 sm:gap-3",
  itemHeader: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2",
}

/**
 * Common responsive patterns for cards
 */
export const cardPatterns = {
  container: "rounded-lg border bg-card text-card-foreground shadow-sm",
  header: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-6",
  content: "p-4 sm:p-6 pt-0",
  footer: "flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-6 pt-0",
}

/**
 * Usage example:
 * 
 * import { responsivePatterns } from '@/lib/responsive-patterns'
 * 
 * <div className={responsivePatterns.page}>
 *   <div className={responsivePatterns.headerRow}>
 *     <h1 className={responsivePatterns.pageTitle}>Dashboard</h1>
 *     <Button className={responsivePatterns.touchButton}>New Booking</Button>
 *   </div>
 *   <div className={responsivePatterns.statsGrid4}>
 *     {stats.map(stat => <StatCard key={stat.id} {...stat} />)}
 *   </div>
 * </div>
 */
