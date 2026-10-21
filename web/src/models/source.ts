export type ModelChoice = { id: string; label: string; isDefault?: boolean }

export interface ModelSource {
  list(): Promise<readonly ModelChoice[]>
  /** Catalog changes; unsubscribe when the consumer unmounts. No initial call. */
  subscribe?(listener: () => void): () => void
}
