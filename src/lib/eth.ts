import Decimal from 'decimal.js';

export function addEth(a: string, b: string): string {
  return new Decimal(a || '0').plus(new Decimal(b || '0')).toFixed(4);
}

export function subEth(a: string, b: string): string {
  const res = new Decimal(a || '0').minus(new Decimal(b || '0'));
  return res.isNegative() ? '0.0000' : res.toFixed(4);
}

export function mulEth(priceEth: string, quantity: number): string {
  return new Decimal(priceEth || '0').times(quantity).toFixed(4);
}

export function pctEth(amountEth: string, percentage: number): string {
  return new Decimal(amountEth || '0')
    .times(new Decimal(percentage).dividedBy(100))
    .toFixed(4);
}

export function formatEth(value: string): string {
  return `${new Decimal(value || '0').toFixed(4)} ETH`;
}

export function isSameEth(a: string, b: string): boolean {
  return new Decimal(a || '0').equals(new Decimal(b || '0'));
}
