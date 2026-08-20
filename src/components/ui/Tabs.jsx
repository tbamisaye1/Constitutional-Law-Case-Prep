import * as Tabs from '@radix-ui/react-tabs'

/** Thin Radix Tabs wrapper; style lives in CSS under .ui-tabs* */
export function UiTabs({ value, onValueChange, children, className = '' }) {
  return (
    <Tabs.Root className={`ui-tabs ${className}`} value={value} onValueChange={onValueChange}>
      {children}
    </Tabs.Root>
  )
}

export function UiTabsList({ children }) {
  return <Tabs.List className="ui-tabs-list">{children}</Tabs.List>
}

export function UiTabsTrigger({ value, children }) {
  return (
    <Tabs.Trigger className="ui-tabs-trigger mono" value={value}>
      {children}
    </Tabs.Trigger>
  )
}

export function UiTabsContent({ value, children }) {
  return (
    <Tabs.Content className="ui-tabs-content" value={value}>
      {children}
    </Tabs.Content>
  )
}
