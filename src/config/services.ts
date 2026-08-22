// Hosted services shown in the control panel. Add/remove entries here to extend.
export interface ServiceDefinition {
  id: string
  name: string
  description: string
  localUrl: string
  tailnetUrl: string
  healthUrl?: string
}

export const SERVICES: ServiceDefinition[] = []
