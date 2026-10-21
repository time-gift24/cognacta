/** The adapter owns path normalization, validation and the display name. */
export type WorkspaceDirectory = { path: string; name: string }

/** Frontend directory choices and validation, independent of the host. */
export interface WorkspaceAccess {
  listDirectories(): Promise<readonly WorkspaceDirectory[]>
  resolveDirectory(path: string): Promise<WorkspaceDirectory>
}
