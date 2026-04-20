import Card from './Card'
import '../styles/cards.css'

export default function PlayerHand({ cards, selectedIndex, onSelect, canDrag }) {
  return (
    <div className="hand">
      {cards.map((card, i) => (
        <Card
          key={card.id || i}
          card={card}
          index={i}
          isSelected={selectedIndex === i}
          onSelect={onSelect}
          draggable={canDrag}
        />
      ))}
    </div>
  )
}
