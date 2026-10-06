import { useCaseLibrary } from '../hooks/useCaseLibrary'

/**
 * Shown once per page load until the first Postgres pull finishes and prep
 * docs are written into the local cache. After that, editors mount on the
 * hydrated cache; background sync does not bring this screen back.
 */
export function WorkspaceBootScreen() {
  const { sync, retryWorkspaceBootstrap } = useCaseLibrary()
  const failed = sync.status === 'error'

  return (
    <div className="workspace-boot" role="status" aria-live="polite">
      <div className="workspace-boot-card">
        <p className="workspace-boot-kicker mono">Bronner workspace</p>
        <h1 className="workspace-boot-title">
          {failed ? 'Could not reach the database' : 'Loading your prep'}
        </h1>
        <p className="workspace-boot-copy">
          {failed
            ? 'Waiting for Postgres before opening Arguments, Notes, and the rest, so this browser does not show an old or empty board.'
            : 'Pulling Arguments, Notes, and the library from the workspace database. Local cache is used after this, not before.'}
        </p>
        {failed && sync.error ? (
          <p className="workspace-boot-error mono">{sync.error}</p>
        ) : null}
        <div className="workspace-boot-actions">
          {failed ? (
            <button type="button" className="btn-ink" onClick={() => void retryWorkspaceBootstrap()}>
              Retry
            </button>
          ) : (
            <span className="workspace-boot-pulse" aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  )
}
