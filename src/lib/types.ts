export type PairingStatus =
  | 'pairing_session_created'
  | 'waiting_for_user'
  | 'claimed'
  | 'confirmed'
  | 'registering'
  | 'provisioning'
  | 'connecting'
  | 'connected'
  | 'expired'
  | 'cancelled'
  | 'failed';
export type PairingSession = {
  id: string;
  shortCode: string;
  status: PairingStatus;
  createdAt: string;
  expiresAt: string;
  device: {
    hardwareId: string;
    productName: string;
    productCode: string;
    serialNumber: string;
    partNumber: string;
    architecture: 'arm64';
    cleaOsVersion: string;
    networkType: 'ethernet';
  };
  claim?: { organizationId: string; organizationName: string; displayName: string };
  startedAt?: number;
  step: number;
  simulateOffline: boolean;
};
export const steps = [
  'Claiming pairing session',
  'Registering device identity',
  'Assigning Clea environment',
  'Creating device credentials',
  'Provisioning Clea OS',
  'Starting Clea services',
  'Waiting for first connection',
];
export const activeStatuses: PairingStatus[] = [
  'confirmed',
  'registering',
  'provisioning',
  'connecting',
];
