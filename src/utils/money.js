// src/utils/money.js
// Todas las operaciones monetarias en centavos (×100) para evitar errores float

export const toCents = (usd) => Math.round(usd * 100)
export const fromCents = (cents) => cents / 100
export const formatUSD = (cents) => `$${fromCents(cents).toFixed(2)}`
export const formatBS = (cents, rate) => `Bs ${(fromCents(cents) * rate).toFixed(2)}`
export const usdToBS = (usd, rate) => Math.round(usd * rate * 100) / 100
export const calcChange = (paidCents, totalCents) => Math.max(0, paidCents - totalCents)
