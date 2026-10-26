export const INVENTORY_OCCUPIED_SQL = `
  (
    (r.status = 'ACTIVE' AND r.expires_at > NOW())
    OR r.status IN (
      'PENDING_PAYMENT',
      'PENDING_RECONCILIATION',
      'COMPLETED'
    )
  )
`;
