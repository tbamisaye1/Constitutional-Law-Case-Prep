import { USEFULNESS } from '../../data/caseResearchSeed'

/**
 * Always-visible matter flags. Full control without opening Edit details.
 */
export function MatterTagBar({ value, onChange }) {
  return (
    <div className="matter-tag-bar" role="group" aria-label="Matter flag">
      <span className="matter-tag-label mono">Flag</span>
      {USEFULNESS.map((u) => (
        <button
          key={u.id}
          type="button"
          className={value === u.id ? `matter-tag on useful-${u.id}` : 'matter-tag'}
          onClick={() => onChange(u.id)}
        >
          {u.label}
        </button>
      ))}
    </div>
  )
}
