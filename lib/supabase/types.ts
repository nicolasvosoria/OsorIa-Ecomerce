export interface ComponentStyle {
  id: number
  component_name: string
  variables: Record<string, any>
  updated_at: string
}

export interface StyleUpdate {
  component_name: string
  variables: Record<string, any>
}
