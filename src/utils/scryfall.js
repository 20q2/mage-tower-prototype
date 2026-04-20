export function getScryfallImageUrl(cardName) {
  const encoded = encodeURIComponent(cardName)
  return `https://api.scryfall.com/cards/named?exact=${encoded}&format=image&version=art_crop`
}

export function preloadImages(cards) {
  return cards.map((card) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = resolve
      img.onerror = resolve
      img.src = getScryfallImageUrl(card.scryfallName)
    })
  })
}
