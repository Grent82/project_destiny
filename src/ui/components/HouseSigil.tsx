import './HouseSigil.css'

const SIGIL_IDS: Record<string, string> = {
  'house-valdris': 'icon-house-valdris',
  'house-sorn': 'icon-house-sorn',
  'house-merrow': 'icon-house-merrow',
  'house-sable-cairn': 'icon-house-sable-cairn',
  'venue-lantern-vale': 'icon-venue-lantern-vale',
  'venue-chapel-st-vey': 'icon-venue-chapel-st-vey',
  'institution-salt-ledger': 'icon-institution-salt-ledger',
}

export function HouseSigil({
  houseId,
  size = 24,
  className,
}: {
  houseId: string
  size?: number
  className?: string
}) {
  const sigilId = SIGIL_IDS[houseId]
  if (!sigilId) return null

  return (
    <svg
      className={`house-sigil ${className || ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <use href={`/house-sigils.svg#${sigilId}`} />
    </svg>
  )
}
