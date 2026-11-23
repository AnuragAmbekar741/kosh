import type { Decorator, Preview } from "@storybook/react-vite"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { installMockApi, type MockRoutes } from "@/stories/mock-api"

import "../src/app/index.css"

const THEME_KEY = "storybook-theme"

// The app's ThemeProvider sets the `light` / `dark` class on <html>; the
// toolbar picks its theme. Remounts on change so the toolbar always wins.
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals["theme"] === "light" ? "light" : "dark"
  localStorage.removeItem(THEME_KEY)
  return (
    <ThemeProvider key={theme} defaultTheme={theme} storageKey={THEME_KEY}>
      <Story />
    </ThemeProvider>
  )
}

// A fresh cache per story, answered by the mock API (src/stories/mock-api.ts).
const withData: Decorator = (Story, context) => {
  installMockApi(context.parameters["mockApi"] as MockRoutes | undefined)
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const withProviders: Decorator = (Story) => (
  <TooltipProvider>
    <div className="bg-background font-sans text-foreground antialiased">
      <Story />
    </div>
    <Toaster />
  </TooltipProvider>
)

const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      options: {
        phone: {
          name: "Phone",
          styles: { width: "390px", height: "844px" },
          type: "mobile",
        },
        tablet: {
          name: "Tablet",
          styles: { width: "820px", height: "1180px" },
          type: "tablet",
        },
      },
    },
  },
  globalTypes: {
    theme: {
      description: "Colour mode",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "dark", title: "Dark", icon: "moon" },
          { value: "light", title: "Light", icon: "sun" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "dark",
  },
  decorators: [withProviders, withData, withTheme],
  tags: ["autodocs"],
}

export default preview
