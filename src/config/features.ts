export const features = {
  seatBasedBilling: process.env.NEXT_PUBLIC_ENABLE_SEAT_BASED === 'true',
  newApiPath: process.env.NEXT_PUBLIC_USE_NEW_API_PATH === 'true',
  quantitySelector: process.env.NEXT_PUBLIC_SHOW_QUANTITY === 'true',
  circuitBreaker: process.env.NEXT_PUBLIC_ENABLE_CIRCUIT_BREAKER === 'true',
};
