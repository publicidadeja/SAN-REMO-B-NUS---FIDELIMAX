import express from 'express';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import http2 from 'http2';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import axios from 'axios';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

function normalizeEnvValue(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const hasMatchingQuotes =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));

  return hasMatchingQuotes ? trimmed.slice(1, -1) : trimmed;
}

function loadEnvFile(fileName: string, options: { override?: boolean; ignoreEmpty?: boolean } = {}) {
  const envPath = path.resolve(process.cwd(), fileName);
  if (!fs.existsSync(envPath)) return;

  const parsed = dotenv.parse(fs.readFileSync(envPath));
  for (const [key, value] of Object.entries(parsed)) {
    const normalizedValue = normalizeEnvValue(value);

    if (options.ignoreEmpty && !normalizedValue) continue;
    if (!options.override && process.env[key] !== undefined) continue;

    process.env[key] = value;
  }
}

loadEnvFile('.env');
const nodeEnv = normalizeEnvValue(process.env.NODE_ENV);
if (nodeEnv) {
  loadEnvFile(`.env.${nodeEnv}`, { override: true, ignoreEmpty: true });
}

function getEnvValue(name: string): string | undefined {
  return normalizeEnvValue(process.env[name]);
}

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
type StoredPushToken = {
  token: string;
  device: string | null;
  userCpf: string;
};

type PushTransport = 'android_fcm' | 'ios_apns';
type PushSendResult =
  | { success: true; status?: number }
  | { success: false; mocked?: boolean; skipped?: boolean; reason?: string; status?: number; error?: string };

let cachedApnsJwt: { token: string; issuedAt: number } | null = null;

function getApnsAuthKey(): string | null {
  const inlineKey = getEnvValue('APNS_AUTH_KEY');
  if (inlineKey) {
    return inlineKey.replace(/\\n/g, '\n');
  }

  const keyPath = getEnvValue('APNS_AUTH_KEY_PATH');
  if (keyPath) {
    const resolvedPath = path.isAbsolute(keyPath) ? keyPath : path.resolve(process.cwd(), keyPath);
    if (fs.existsSync(resolvedPath)) {
      try {
        return fs.readFileSync(resolvedPath, 'utf8');
      } catch (error: any) {
        console.warn(`[Push][APNs] Could not read APNS_AUTH_KEY_PATH (${resolvedPath}): ${error.message}`);
        return null;
      }
    }
  }

  return null;
}

function getApnsMissingConfigFields() {
  const missing: string[] = [];

  if (!getEnvValue('APNS_KEY_ID')) missing.push('APNS_KEY_ID');
  if (!getEnvValue('APNS_TEAM_ID')) missing.push('APNS_TEAM_ID');
  if (!getEnvValue('APNS_BUNDLE_ID')) missing.push('APNS_BUNDLE_ID');
  if (!getApnsAuthKey()) missing.push('APNS_AUTH_KEY or APNS_AUTH_KEY_PATH');

  return missing;
}

function hasApnsConfig() {
  return getApnsMissingConfigFields().length === 0;
}

function getApnsJwt(): string {
  const authKey = getApnsAuthKey();
  const keyId = getEnvValue('APNS_KEY_ID');
  const teamId = getEnvValue('APNS_TEAM_ID');

  if (!authKey || !keyId || !teamId) {
    throw new Error('APNs credentials are incomplete. Set APNS_AUTH_KEY or APNS_AUTH_KEY_PATH, APNS_KEY_ID and APNS_TEAM_ID.');
  }

  const now = Math.floor(Date.now() / 1000);

  if (cachedApnsJwt && now - cachedApnsJwt.issuedAt < 50 * 60) {
    return cachedApnsJwt.token;
  }

  const token = jwt.sign(
    { iss: teamId, iat: now },
    authKey,
    {
      algorithm: 'ES256',
      header: {
        alg: 'ES256',
        kid: keyId,
      },
    }
  );

  cachedApnsJwt = { token, issuedAt: now };
  return token;
}

function detectPushTransport(record: StoredPushToken): PushTransport {
  const device = (record.device || '').toLowerCase();
  const compactToken = record.token.replace(/\s+/g, '');
  const looksLikeApnsToken = /^[a-f0-9]{64,200}$/i.test(compactToken) && !compactToken.includes(':');

  if (device.includes(':fcm') || device.includes('(fcm') || device.includes('firebase')) {
    return 'android_fcm';
  }

  if (looksLikeApnsToken) {
    return 'ios_apns';
  }

  if (compactToken.includes(':')) {
    return 'android_fcm';
  }

  if (device.includes('(ios)') || device.includes('iphone') || device.includes('ipad')) {
    return 'ios_apns';
  }

  if (device.includes('(android)')) {
    return 'android_fcm';
  }

  return 'android_fcm';
}

async function getPushTokenRecords(userCpf?: string): Promise<StoredPushToken[]> {
  if (userCpf && userCpf !== '__GLOBAL__') {
    // @ts-ignore
    return prisma.pushToken.findMany({
      where: { userCpf: userCpf.replace(/\D/g, '') },
      select: { token: true, device: true, userCpf: true },
    });
  }

  // @ts-ignore
  return prisma.pushToken.findMany({
    select: { token: true, device: true, userCpf: true },
  });
}

async function cleanupInvalidPushToken(token: string) {
  // @ts-ignore
  await prisma.pushToken.deleteMany({ where: { token } }).catch(() => {});
}

function describePushTarget(record: StoredPushToken) {
  return `${record.userCpf || 'unknown cpf'} / ${record.device || 'unknown device'}`;
}

// Multimedia Stories Persistence Config
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// Admin Seeding Function
async function seedAdmin() {
  const adminEmail = 'admin@sanremobonus.com.br';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Super Admin',
      email: adminEmail,
      password: '@Zender1997',
      role: 'admin',
      permissions: 'dashboard,stories,activations,team,settings'
    }
  });
  // Test directory permissions
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    const testFile = path.join(UPLOADS_DIR, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log(`[Server] Uploads directory is writable: ${UPLOADS_DIR}`);
  } catch (err: any) {
    console.error(`[Server] WARNING: Uploads directory is NOT writable: ${UPLOADS_DIR}`, err.message);
  }

  console.log('[Database] Default admin seeded');
}

// Settings Seeding Function
async function seedSettings() {
  if (process.env.FIDELIMAX_API_KEY) {
    await prisma.setting.upsert({
      where: { key: 'fidelimax_api_key' },
      update: {},
      create: { key: 'fidelimax_api_key', value: process.env.FIDELIMAX_API_KEY }
    });
    console.log('[Database] Default API Key seeded from .env');
  }
  
  // Default Story Expiration (24h)
  await prisma.setting.upsert({
    where: { key: 'story_expiration_hours' },
    update: {},
    create: { key: 'story_expiration_hours', value: '24' }
  });
  console.log('[Database] Default Story Expiration seeded');
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Formato de arquivo inválido. Apenas imagens e vídeos são permitidos.'));
    }
  }
});

const firebaseMessagingApps: Array<{ label: string; app: any }> = [];

function initializeFirebaseAdminFromEnv(envName: string, appName?: string) {
  const rawCredentials = getEnvValue(envName);

  if (!rawCredentials) {
    return;
  }

  try {
    const serviceAccount = JSON.parse(rawCredentials);
    const app = admin.initializeApp(
      { credential: admin.credential.cert(serviceAccount) },
      appName
    );
    const label = serviceAccount.project_id || envName;
    firebaseMessagingApps.push({ label, app });
    console.log(`Firebase Admin initialized successfully (${label})`);
  } catch (error) {
    console.error(`Failed to initialize Firebase Admin from ${envName}:`, error);
  }
}

initializeFirebaseAdminFromEnv('FIREBASE_SERVICE_ACCOUNT');
initializeFirebaseAdminFromEnv('FIREBASE_SERVICE_ACCOUNT_LEGACY', 'legacy');

if (firebaseMessagingApps.length === 0) {
  console.warn('FIREBASE_SERVICE_ACCOUNT not found. Push notifications will be mocked.');
}

function logPushProviderStatus() {
  if (firebaseMessagingApps.length > 0) {
    const labels = firebaseMessagingApps.map(({ label }) => label).join(', ');
    console.log(`[Push][FCM] Push enabled via Firebase Admin app(s): ${labels}.`);
  }

  const missingApnsFields = getApnsMissingConfigFields();
  if (missingApnsFields.length > 0) {
    console.warn(`[Push][APNs] iOS push disabled. Missing: ${missingApnsFields.join(', ')}.`);
    return;
  }

  const apnsGateway = getEnvValue('APNS_USE_SANDBOX')?.toLowerCase() === 'true'
    ? 'sandbox'
    : 'production';
  console.log(`[Push][APNs] iOS push enabled via ${apnsGateway} gateway for topic ${getEnvValue('APNS_BUNDLE_ID')}.`);
}

logPushProviderStatus();

async function sendFcmNotification(record: StoredPushToken, title: string, body: string, data: Record<string, string>): Promise<PushSendResult> {
  if (firebaseMessagingApps.length === 0) {
    console.log(`[Push MOCK][FCM] Title: ${title} | Body: ${body} | Target: ${describePushTarget(record)}`);
    return { success: false, mocked: true, reason: 'missing_firebase_admin' };
  }

  const message = {
    notification: { title, body },
    data,
    token: record.token,
    android: {
      priority: 'high' as const,
      notification: {
        sound: 'notification',
        channelId: 'default',
      },
    },
    apns: {
      headers: {
        'apns-priority': '10',
      },
      payload: {
        aps: {
          sound: 'notification.mp3',
          badge: 1,
        },
      },
    },
  };

  const failures: Array<{ code?: string; message: string; label: string }> = [];

  for (const { label, app } of firebaseMessagingApps) {
    try {
      await admin.messaging(app).send(message);
      return { success: true };
    } catch (error: any) {
      failures.push({
        code: error.code,
        message: error.message,
        label,
      });
      console.error(`[Push][FCM:${label}] Error sending to ${describePushTarget(record)}:`, error.message);
    }
  }

  const shouldCleanup = failures.some(({ code }) => code === 'messaging/invalid-registration-token')
    || failures.every(({ code }) => code === 'messaging/registration-token-not-registered');

  if (shouldCleanup) {
    await cleanupInvalidPushToken(record.token);
  }

  return {
    success: false,
    error: failures.map(({ label, code, message }) => `${label}: ${code || 'unknown'} ${message}`).join(' | '),
  };
}

async function sendApnsNotification(record: StoredPushToken, title: string, body: string, data: Record<string, any>): Promise<PushSendResult> {
  if (!hasApnsConfig()) {
    console.warn(`[Push][APNs] Missing APNs configuration. Skipping ${describePushTarget(record)}.`);
    return { success: false, skipped: true, reason: 'missing_apns_config' };
  }

  const apnsHost = getEnvValue('APNS_USE_SANDBOX')?.toLowerCase() === 'true'
    ? 'https://api.sandbox.push.apple.com'
    : 'https://api.push.apple.com';

  const jwtToken = getApnsJwt();
  const bundleId = getEnvValue('APNS_BUNDLE_ID')!;
  const payload = {
    aps: {
      alert: { title, body },
      sound: 'notification.mp3',
      badge: 1,
    },
    ...data,
  };

  return new Promise<PushSendResult>((resolve) => {
    const client = http2.connect(apnsHost);
    const request = client.request({
      ':method': 'POST',
      ':path': `/3/device/${record.token}`,
      authorization: `bearer ${jwtToken}`,
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
    });

    let responseBody = '';
    let statusCode = 0;

    request.setEncoding('utf8');

    request.on('response', (headers) => {
      statusCode = Number(headers[':status'] || 0);
    });

    request.on('data', (chunk) => {
      responseBody += chunk;
    });

    request.on('end', async () => {
      client.close();

      if (statusCode === 200) {
        resolve({ success: true, status: statusCode });
        return;
      }

      let reason = 'unknown';

      try {
        const parsed = responseBody ? JSON.parse(responseBody) : null;
        reason = parsed?.reason || reason;
      } catch {
        reason = responseBody || reason;
      }

      console.error(`[Push][APNs] Error ${statusCode} for ${describePushTarget(record)}: ${reason}`);

      if (statusCode === 410 || reason === 'BadDeviceToken' || reason === 'Unregistered' || reason === 'DeviceTokenNotForTopic') {
        await cleanupInvalidPushToken(record.token);
      }

      resolve({ success: false, reason, status: statusCode });
    });

    request.on('error', (error) => {
      client.destroy();
      console.error(`[Push][APNs] Connection error for ${describePushTarget(record)}:`, error.message);
      resolve({ success: false, reason: error.message });
    });

    request.end(JSON.stringify(payload));
  });
}

// Helper to send Push Notifications via FCM (Android) and APNs (iOS)
async function sendPushNotification(title: string, body: string, userCpf?: string, data: Record<string, any> = {}) {
  try {
    const records = await getPushTokenRecords(userCpf);

    if (records.length === 0) {
      console.log(`[Push] No tokens found for ${userCpf || 'Global broadcast'}`);
      return;
    }

    const sanitizedFcmData: Record<string, string> = {};
    for (const key in data) {
      if (data[key] !== undefined && data[key] !== null) {
        sanitizedFcmData[key] = typeof data[key] === 'object'
          ? JSON.stringify(data[key])
          : String(data[key]);
      }
    }

    const finalFcmData = userCpf && userCpf !== '__GLOBAL__'
      ? { ...sanitizedFcmData, cpf: userCpf }
      : { ...sanitizedFcmData, type: 'global_announcement' };

    const finalApnsData = userCpf && userCpf !== '__GLOBAL__'
      ? { ...data, cpf: userCpf }
      : { ...data, type: 'global_announcement' };

    let successCount = 0;
    let failureCount = 0;

    for (const record of records) {
      const transport = detectPushTransport(record);
      const result = transport === 'ios_apns'
        ? await sendApnsNotification(record, title, body, finalApnsData)
        : await sendFcmNotification(record, title, body, finalFcmData);

      if (result.success) {
        successCount += 1;
      } else {
        failureCount += 1;
        const failedResult = result as Extract<PushSendResult, { success: false }>;
        const reason = failedResult.reason || failedResult.error || 'unknown';
        console.warn(`[Push] ${transport} delivery failed for ${describePushTarget(record)}: ${reason}`);
      }
    }

    console.log(`[Push] Sent "${title}" to ${records.length} token(s). Success: ${successCount}, Failure: ${failureCount}`);
  } catch (error) {
    console.error('[Push] Error sending notification:', error);
  }
}

type AdminPermission =
  | 'dashboard'
  | 'stories'
  | 'activations'
  | 'redeem_activations'
  | 'points'
  | 'rewards'
  | 'team'
  | 'settings'
  | 'notifications'
  | 'pamphlets';

const VALID_ADMIN_PERMISSIONS = new Set<AdminPermission>([
  'dashboard',
  'stories',
  'activations',
  'redeem_activations',
  'points',
  'rewards',
  'team',
  'settings',
  'notifications',
  'pamphlets',
]);

function parsePermissionList(value: any): AdminPermission[] {
  return String(value || '')
    .split(',')
    .map((permission) => permission.trim())
    .filter((permission): permission is AdminPermission => VALID_ADMIN_PERMISSIONS.has(permission as AdminPermission));
}

function normalizePermissionsInput(value: any): string {
  const rawPermissions = Array.isArray(value) ? value : String(value || '').split(',');
  const permissions = rawPermissions
    .map((permission: any) => String(permission).trim())
    .filter((permission: string): permission is AdminPermission => VALID_ADMIN_PERMISSIONS.has(permission as AdminPermission));

  return Array.from(new Set(permissions)).join(',');
}

function userHasAdminPermission(user: any, permissions: AdminPermission | AdminPermission[]) {
  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
  if (user?.role === 'admin') return true;
  if (user?.role !== 'collaborator') return false;

  const userPermissions = parsePermissionList(user.permissions);
  return requiredPermissions.some((permission) => userPermissions.includes(permission));
}

function authorizePermission(...permissions: AdminPermission[]) {
  return (req: any, res: any, next: any) => {
    if (!userHasAdminPermission(req.user, permissions)) {
      return res.status(403).json({ error: 'Permissão insuficiente.' });
    }
    next();
  };
}

function authorizeSettingRead(req: any, res: any, next: any) {
  if (req.params.key === 'story_expiration_hours') {
    return authorizePermission('settings', 'stories')(req, res, next);
  }

  return authorizePermission('settings')(req, res, next);
}

function getFidelimaxProxyPermissions(targetPath: string): AdminPermission[] | null {
  const target = normalizeSearchText(targetPath);

  if (target.includes('integracao/pontuaconsumidor')) return ['points'];
  if (target.includes('integracao/resgatapremio')) return ['rewards'];
  if (target.includes('integracao/listaprodutos')) return ['rewards'];
  if (target.includes('integracao/listarconsumidores')) return ['dashboard'];
  if (target.includes('integracao/consultaconsumidor')) return ['points', 'rewards', 'redeem_activations'];
  if (target.includes('integracao/retornadadoscliente')) return ['points', 'rewards', 'redeem_activations', 'dashboard'];
  if (target.includes('integracao/extratoconsumidor')) return ['points', 'rewards', 'redeem_activations', 'dashboard'];

  return null;
}

function authorizeFidelimaxProxy(req: any, res: any, targetPath: string) {
  if (req.user?.role === 'user' || req.user?.role === 'admin') {
    return true;
  }

  const requiredPermissions = getFidelimaxProxyPermissions(targetPath);
  if (req.user?.role === 'collaborator' && requiredPermissions && userHasAdminPermission(req.user, requiredPermissions)) {
    return true;
  }

  res.status(403).json({ error: 'Permissão insuficiente para esta operação.' });
  return false;
}

// Authentication Middleware
async function authenticate(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso não autorizado. Token ausente.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded?.role === 'admin' || decoded?.role === 'collaborator') {
      const userId = parseInt(String(decoded.id), 10);
      if (!Number.isFinite(userId)) {
        return res.status(401).json({ error: 'Sessão expirada ou token inválido.' });
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true, permissions: true }
      });

      if (!dbUser) {
        return res.status(401).json({ error: 'Usuário administrativo não encontrado.' });
      }

      req.user = { ...decoded, ...dbUser };
    } else {
      req.user = decoded;
    }
    next();
  } catch (error) {
    console.error('[Auth] Invalid token:', error);
    return res.status(401).json({ error: 'Sessão expirada ou token inválido.' });
  }
}

function parseBoolean(value: any) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

function parseOptionalFloat(value: any) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalDate(value: any) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function generateCouponNumber() {
  const timePart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `SR-${timePart}-${randomPart}`;
}

function formatCurrency(value: number | null | undefined) {
  if (!value || value <= 0) return 'R$ 0,00';
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

const RAFFLE_KEYWORDS = [
  'sorteio',
  'sortear',
  'sortea',
  'sorteado',
  'sorteada',
  'premio',
  'premios',
  'experiencias incriveis',
  'cupom para participar',
  'cupons para participar',
  'ganha 01 cupom',
  'ganha 1 cupom'
];

function normalizeSearchText(value: any) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function hasRaffleKeyword(...values: any[]) {
  const text = normalizeSearchText(values.filter(Boolean).join(' '));
  return RAFFLE_KEYWORDS.some((keyword) => text.includes(keyword));
}

function isRaffleLikeProduct(product: any) {
  return product?.promotionType === 'raffle'
    || Boolean(product?.drawDate || product?.prizeDescription || Number(product?.minPurchaseValue || 0) > 0)
    || hasRaffleKeyword(product?.name, product?.description, product?.prizeDescription, product?.participationInstructions);
}

function isSuccessfulFidelimaxResponse(payload: any) {
  return payload?.CodigoResposta === 100 || payload?.success === true || payload?.sucesso === true;
}

async function approvePendingRaffleEntriesForPurchase(userCpf: any, purchaseAmount: any, source: string = 'fidelimax_points') {
  const cleanCpf = String(userCpf || '').replace(/\D/g, '');
  const amount = parseOptionalFloat(purchaseAmount);

  if (!cleanCpf || !amount || amount <= 0) {
    return [];
  }

  const pendingEntries = await prisma.productActivation.findMany({
    where: {
      userCpf: cleanCpf,
      validationStatus: 'pending',
      product: {
        expiresAt: { gt: new Date() }
      }
    },
    include: { product: true },
    orderBy: { activatedAt: 'asc' }
  });

  const approvedEntries: any[] = [];
  const validatedProductIds = new Set<string>();

  for (const entry of pendingEntries) {
    const product = entry.product;
    const minimumPurchase = Number(product?.minPurchaseValue || 0);

    if (
      !isRaffleLikeProduct(product)
      || minimumPurchase <= 0
      || amount < minimumPurchase
      || validatedProductIds.has(entry.productId)
    ) {
      continue;
    }

    const updated = await prisma.productActivation.update({
      where: { id: entry.id },
      data: {
        validationStatus: 'approved',
        purchaseAmount: amount,
        couponNumber: entry.couponNumber || generateCouponNumber(),
        validatedAt: new Date()
      },
      include: { product: true }
    });

    validatedProductIds.add(entry.productId);
    approvedEntries.push(updated);

    await prisma.notification.create({
      data: {
        userCpf: cleanCpf,
        title: 'Cupom de Sorteio Confirmado!',
        message: `Sua compra pontuada de ${formatCurrency(amount)} confirmou o cupom ${updated.couponNumber} para ${updated.product.name}.`,
        type: 'reward',
        // @ts-ignore
        actionUrl: '/rewards?tab=activations'
      }
    });

    await sendPushNotification(
      'Cupom de Sorteio Confirmado!',
      `Seu cupom ${updated.couponNumber} foi confirmado automaticamente pela pontuação do app.`,
      cleanCpf,
      {
        type: 'raffle_entry_auto_approved',
        productId: updated.productId,
        participantId: updated.id,
        couponNumber: updated.couponNumber || '',
        source
      }
    );
  }

  if (approvedEntries.length > 0) {
    console.log(`[Raffle] Auto-approved ${approvedEntries.length} raffle entrie(s) for CPF ${cleanCpf} from ${formatCurrency(amount)} (${source}).`);
  }

  return approvedEntries.map((entry) => ({
    id: entry.id,
    productId: entry.productId,
    productName: entry.product.name,
    couponNumber: entry.couponNumber,
    purchaseAmount: entry.purchaseAmount,
    validationStatus: entry.validationStatus
  }));
}

async function startServer() {
  await seedAdmin();
  await seedSettings();

  const app = express();
  const PORT = parseInt(process.env.PORT || '9999');
  
  console.log(`[Server] STARTING: NODE_ENV=${process.env.NODE_ENV || 'development'} | PORT=${PORT}`);
  console.log(`[Server] ROOT_DIR=${process.cwd()} | UPLOADS_DIR=${UPLOADS_DIR}`);

  // Middleware to parse JSON bodies
  app.use(express.json());

  // Request Logger
  app.use((req, res, next) => {
    console.log(`[Server] ${new Date().toISOString()} | ${req.method} ${req.url}`);
    next();
  });

  // API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Admin/Collaborator Login
  app.post('/api/admin/login', async (req, res) => {
    console.log(`[API] Admin Login attempt:`, req.body?.email);
    const { email, password } = req.body;
    
    try {
      const adminUser = await prisma.user.findUnique({
        where: { email }
      });

      if (adminUser && adminUser.password === password) {
        const { password: _, ...safeUser } = adminUser;
        const token = jwt.sign(
          { id: adminUser.id, email: adminUser.email, role: adminUser.role },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        res.json({ 
          user: { ...safeUser, cpf: 'ADMIN' }, 
          token
        });
      } else {
        res.status(401).json({ error: 'Credenciais inválidas' });
      }
    } catch (error: any) {
      console.error('[API] Admin Login error:', error.message || error);
      res.status(500).json({ error: 'Erro no servidor: ' + (error.message || 'Erro desconhecido') });
    }
  });

  // Consumer Login (Verifies CPF with Fidelimax and returns JWT)
  app.post('/api/auth/login-consumer', async (req, res) => {
    const { cpf } = req.body;
    if (!cpf) return res.status(400).json({ error: 'CPF é obrigatório' });
    
    const cleanCpf = cpf.replace(/\D/g, '');
    console.log(`[API] Consumer Login attempt: ${cleanCpf}`);

    try {
      // 1. Get API Key from DB
      const dbKey = await prisma.setting.findUnique({ where: { key: 'fidelimax_api_key' } });
      if (!dbKey?.value) {
        return res.status(500).json({ error: 'Configuração do sistema incompleta (API Key ausente)' });
      }

      // 2. Verify with Fidelimax
      const response = await axios.post('https://api.fidelimax.com.br/api/Integracao/ConsultaConsumidor', 
        { cpf: cleanCpf, categoria: true },
        { headers: { 'AuthToken': dbKey.value, 'Content-Type': 'application/json' } }
      );

      if (response.data && response.data.consumidor_existente) {
        const userData = {
          id: cleanCpf,
          name: response.data.consumidor?.nome || response.data.nome || 'Cliente Fidelimax',
          email: response.data.consumidor?.email || response.data.email || '',
          cpf: cleanCpf,
          role: 'user'
        };

        // 3. Issue JWT
        const token = jwt.sign(
          { id: cleanCpf, cpf: cleanCpf, role: 'user' },
          JWT_SECRET,
          { expiresIn: '30d' } // Consumer sessions can last longer
        );

        res.json({ user: userData, token });
      } else {
        res.status(401).json({ error: response.data?.Mensagem || 'CPF não encontrado no programa de fidelidade.' });
      }
    } catch (error: any) {
      console.error('[API] Consumer Login error:', error.message);
      const isConfigError = error.message === 'API Key não configurada';
      res.status(isConfigError ? 400 : 500).json({ 
        error: isConfigError ? 'Configuração incompleta: Chave API Fidelimax não encontrada.' : 'Erro ao validar acesso com o sistema Fidelimax.' 
      });
    }
  });

  // Consumer Registration (public route that uses the server-side Fidelimax API key)
  app.post('/api/auth/register-consumer', async (req, res) => {
    const { nome, cpf, email, telefone, nascimento, sexo, endereco } = req.body || {};
    if (!nome || !cpf || !email || !telefone || !nascimento) {
      return res.status(400).json({ error: 'Nome, CPF, e-mail, telefone e nascimento são obrigatórios' });
    }

    const cleanCpf = String(cpf).replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return res.status(400).json({ error: 'CPF inválido' });
    }

    console.log(`[API] Consumer Registration attempt: ${cleanCpf}`);

    try {
      const dbKey = await prisma.setting.findUnique({ where: { key: 'fidelimax_api_key' } });
      if (!dbKey?.value) {
        return res.status(500).json({ error: 'Configuração do sistema incompleta (API Key ausente)' });
      }

      const response = await axios.post(
        'https://api.fidelimax.com.br/api/Integracao/CadastrarConsumidor',
        {
          nome,
          cpf: cleanCpf,
          email,
          telefone,
          nascimento,
          sexo,
          endereco,
        },
        { headers: { 'AuthToken': dbKey.value, 'Content-Type': 'application/json' } }
      );

      res.status(response.status).json(response.data);
    } catch (error: any) {
      if (error.response) {
        console.error(`[API] Consumer Registration Fidelimax error: ${error.response.status} -`, error.response.data);
        return res.status(error.response.status).json(error.response.data);
      }

      console.error('[API] Consumer Registration error:', error.message);
      res.status(500).json({ error: 'Erro ao cadastrar consumidor no sistema Fidelimax.' });
    }
  });

  // Push Token Registration
  app.post('/api/push/register', async (req, res) => {
    const { cpf, token, device } = req.body;
    if (!cpf || !token) {
      return res.status(400).json({ error: 'CPF and Token are required' });
    }
    const cleanCpf = cpf.replace(/\D/g, '');
    const normalizedToken = String(token).trim();
    
    try {
      // @ts-ignore
      await prisma.pushToken.upsert({
        where: { token: normalizedToken },
        update: { userCpf: cleanCpf, device, updatedAt: new Date() },
        create: { userCpf: cleanCpf, token: normalizedToken, device }
      });
      console.log(`[Push] Token registered in DB for CPF: ${cleanCpf} (${device || 'unknown device'})`);
      res.json({ success: true });
    } catch (error) {
      console.error('[Push] Registration error:', error);
      res.status(500).json({ error: 'Failed to register token' });
    }
  });

  // GET Notifications for a User
  app.get('/api/notifications/:cpf', async (req, res) => {
    console.log(`[API] Fetching notifications for CPF:`, req.params.cpf);
    const userCpf = req.params.cpf.replace(/\D/g, '');
    
    try {
      // 1. Encontrar o marcador de limpeza mais recente para este usuário
      const lastClearMarker = await prisma.notification.findFirst({
        where: { userCpf, title: '__SYSTEM_CLEAR__' },
        orderBy: { createdAt: 'desc' }
      });

      // 2. Buscar notificações (pessoais ou globais) criadas APÓS a última limpeza
      const notifications = await prisma.notification.findMany({
        where: { 
          OR: [
            { userCpf },
            { userCpf: '__GLOBAL__' }
          ],
          createdAt: {
            gt: lastClearMarker?.createdAt || new Date(0)
          },
          title: {
            not: '__SYSTEM_CLEAR__' // Excluir o próprio marcador da lista retornada
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      res.json(notifications);
    } catch (error) {
      console.error('[API] Error fetching notifications:', error);
      res.status(500).json({ error: 'Erro ao buscar notificações' });
    }
  });

  // DELETE All Notifications for a User (Marker-based clear)
  app.delete('/api/notifications/:cpf', async (req, res) => {
    const userCpf = req.params.cpf.replace(/\D/g, '');
    try {
      // 1. Remover todas as notificações anteriores do usuário (incluindo marcadores antigos)
      // para não poluir o banco de dados desnecessariamente.
      await prisma.notification.deleteMany({
        where: { userCpf }
      });

      // 2. Criar um novo marcador de limpeza "Agora"
      await prisma.notification.create({
        data: {
          userCpf,
          title: '__SYSTEM_CLEAR__',
          message: 'CLEARED_MARKER',
          type: 'system',
          isRead: true
        }
      });
      
      console.log(`[API] Notifications cleared/marked for CPF: ${userCpf}`);
      res.json({ success: true });
    } catch (error) {
      console.error('[API] Error clearing notifications:', error);
      res.status(500).json({ error: 'Erro ao limpar notificações' });
    }
  });

  // POST Create Admin Notification (Global or Specific)
  app.post('/api/admin/notifications', authenticate, authorizePermission('notifications'), upload.single('image'), async (req, res) => {
    const { title, message, userCpf, broadcastType } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ error: 'Título e mensagem são obrigatórios' });
    }

    try {
      const targetCpf = userCpf || '__GLOBAL__';
      const type = broadcastType || 'both'; // both, push, internal
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

      // 1. Create Internal Notification (if applicable)
      if (type === 'both' || type === 'internal') {
        await prisma.notification.create({
          data: {
            userCpf: targetCpf,
            title,
            message,
            type: 'announcement',
            // @ts-ignore
            imageUrl
          }
        });
      }

      // 2. Send Push Notification (if applicable)
      if (type === 'both' || type === 'push') {
        await sendPushNotification(
          title,
          message,
          targetCpf,
          { 
            type: 'admin_announcement',
            image: imageUrl ? `${process.env.PUBLIC_URL || ''}${imageUrl}` : undefined
          }
        );
      }

      console.log(`[Admin] Notification sent: "${title}" to ${targetCpf} (Type: ${type}, Image: ${imageUrl || 'None'})`);
      res.json({ success: true });
    } catch (error) {
      console.error('[Admin] Error sending notification:', error);
      res.status(500).json({ error: 'Erro ao enviar notificação' });
    }
  });

  // GET All Notifications (Admin Management)
  app.get('/api/admin/notifications', authenticate, authorizePermission('notifications'), async (req, res) => {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          title: { not: '__SYSTEM_CLEAR__' }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar histórico de notificações' });
    }
  });

  // DELETE Notification (Admin)
  app.delete('/api/admin/notifications/:id', authenticate, authorizePermission('notifications'), async (req, res) => {
    const { id } = req.params;
    try {
      const notification = await prisma.notification.findUnique({ where: { id } });
      // @ts-ignore
      if (notification?.imageUrl) {
        // @ts-ignore
        const filePath = path.join(process.cwd(), 'public', notification.imageUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      await prisma.notification.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao deletar notificação' });
    }
  });

  // PATCH Mark Notification as Read (User)
  app.patch('/api/notifications/:id/read', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
      await prisma.notification.update({
        where: { id },
        data: { 
          isRead: true,
          // @ts-ignore
          readCount: { increment: 1 }
        }
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao marcar como lida' });
    }
  });

  // GET Collaborators (Equipe permission)
  app.get('/api/admin/collaborators', authenticate, authorizePermission('team'), async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, permissions: true, createdAt: true }
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar colaboradores' });
    }
  });

  // POST Create Collaborator
  app.post('/api/admin/collaborators', authenticate, authorizePermission('team'), async (req: any, res) => {
    const { name, email, password, role, permissions } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }
    
    try {
      const normalizedRole = req.user?.role === 'admin' && role === 'admin' ? 'admin' : 'collaborator';
      const normalizedPermissions = normalizePermissionsInput(permissions);

      await prisma.user.upsert({
        where: { email },
        update: { name, password, role: normalizedRole, permissions: normalizedPermissions },
        create: { name, email, password, role: normalizedRole, permissions: normalizedPermissions }
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao salvar colaborador' });
    }
  });

  // PUT Update Collaborator
  app.put('/api/admin/collaborators/:id', authenticate, authorizePermission('team'), async (req: any, res) => {
    const { id } = req.params;
    const { name, email, password, role, permissions } = req.body;
    
    try {
      // Security: Previne alteração do admin mestre via API se não for por ele mesmo ou se for uma tentativa de mudar o e-mail/role do mestre
      const targetUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });
      if (!targetUser) return res.status(404).json({ error: 'Colaborador não encontrado.' });
      if (targetUser.role === 'admin' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Apenas administradores podem alterar outro administrador.' });
      }
      if (targetUser?.email === 'admin@sanremobonus.com.br' && (email !== targetUser.email || role !== 'admin')) {
        return res.status(403).json({ error: 'O administrador mestre não pode ter seu e-mail ou cargo alterado.' });
      }

      const normalizedRole = req.user?.role === 'admin' && role === 'admin' ? 'admin' : 'collaborator';
      const normalizedPermissions = normalizePermissionsInput(permissions);

      await prisma.user.update({
        where: { id: parseInt(id) },
        data: { 
          name, 
          email, 
          password: password || undefined, 
          role: normalizedRole, 
          permissions: normalizedPermissions 
        }
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar colaborador' });
    }
  });

  // DELETE Collaborator
  app.delete('/api/admin/collaborators/:id', authenticate, authorizePermission('team'), async (req: any, res) => {
    const { id } = req.params;
    try {
      const targetUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });
      if (targetUser?.email === 'admin@sanremobonus.com.br') {
        return res.status(403).json({ error: 'O administrador mestre não pode ser excluído.' });
      }
      if (targetUser?.role === 'admin' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Apenas administradores podem excluir outro administrador.' });
      }

      await prisma.user.delete({ where: { id: parseInt(id) } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao excluir colaborador' });
    }
  });

  // GET Settings
  app.get('/api/admin/settings/:key', authenticate, authorizeSettingRead, async (req, res) => {
    try {
      const setting = await prisma.setting.findUnique({ where: { key: req.params.key } });
      res.json(setting || { key: req.params.key, value: '' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar configuração' });
    }
  });

  // POST Update Settings
  app.post('/api/admin/settings', authenticate, authorizePermission('settings'), async (req, res) => {
    const { key, value } = req.body;
    try {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao salvar configuração' });
    }
  });

  // --- Pamphlet / Encarte Carousel ---
  
  // GET All Pamphlet Images
  app.get('/api/pamphlet', async (req, res) => {
    try {
      // @ts-ignore
      const images = await prisma.pamphletImage.findMany({
        orderBy: { order: 'asc' }
      });
      res.json(images || []);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar panfletos' });
    }
  });

  // POST Upload Pamphlet Image (Append to carousel)
  app.post('/api/admin/pamphlet-upload', authenticate, authorizePermission('pamphlets'), upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Arquivo é obrigatório' });
    
    try {
      const imageUrl = `/uploads/${req.file.filename}`;
      
      // Get highest order to append
      // @ts-ignore
      const lastImage = await prisma.pamphletImage.findFirst({
        orderBy: { order: 'desc' }
      });
      const order = (lastImage?.order || 0) + 1;

      // @ts-ignore
      const newImage = await prisma.pamphletImage.create({
        data: { url: imageUrl, order }
      });
      
      res.json(newImage);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao fazer upload' });
    }
  });

  // DELETE Pamphlet Image
  app.delete('/api/admin/pamphlet/:id', authenticate, authorizePermission('pamphlets'), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      // @ts-ignore
      const image = await prisma.pamphletImage.findUnique({ where: { id } });
      if (image) {
        // @ts-ignore
        const filePath = path.join(process.cwd(), 'public', image.url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[Pamphlet] File deleted: ${filePath}`);
        }
        // @ts-ignore
        await prisma.pamphletImage.delete({ where: { id } });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('[Pamphlet] Delete error:', error);
      res.status(500).json({ error: 'Erro ao deletar imagem' });
    }
  });

  // GET System Wide Stats (Dashboard permission)
  app.get('/api/admin/system-stats', authenticate, authorizePermission('dashboard'), async (req, res) => {
    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [
        totalCollaborators,
        totalStories,
        totalActivationProducts,
        totalActivations,
        newActivations24h
      ] = await Promise.all([
        prisma.user.count(),
        prisma.story.count(),
        prisma.activationProduct.count(),
        prisma.productActivation.count(),
        prisma.productActivation.count({
          where: { activatedAt: { gte: last24h } }
        })
      ]);

      res.json({
        totalCollaborators,
        totalStories,
        totalActivationProducts,
        totalActivations,
        newActivations24h
      });
    } catch (error) {
      console.error('[Stats] Error fetching stats:', error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas do sistema' });
    }
  });

  // Fidelimax Proxy Route
  app.all('/api/fidelimax-proxy/*', authenticate, async (req: any, res: any) => {
    const targetPath = req.params[0] || req.path.replace('/api/fidelimax-proxy/', '');
    const url = `https://api.fidelimax.com.br/api/${targetPath}`;

    if (!authorizeFidelimaxProxy(req, res, targetPath)) {
      return;
    }
    
    let authToken = req.headers['authtoken'] || req.headers['AuthToken'] || '';
    
    // If token is missing, invalid, or is a local admin token, try to get from DB
    if (!authToken || String(authToken).startsWith('admin_token_')) {
      const dbKey = await prisma.setting.findUnique({ where: { key: 'fidelimax_api_key' } });
      if (dbKey?.value) {
        authToken = dbKey.value;
      }
    }

    console.log(`[Proxy] Forwarding ${req.method} request to Fidelimax: ${url} (User: ${req.user.id})`);
    
    try {
      const response = await axios({
        method: req.method,
        url: url,
        data: req.body,
        headers: {
          'AuthToken': authToken,
          'Content-Type': 'application/json'
        },
        params: req.query
      });

      const responsePayload = response.data;
      const isPointCreditRoute = normalizeSearchText(targetPath).includes('integracao/pontuaconsumidor');
      if (isPointCreditRoute && isSuccessfulFidelimaxResponse(responsePayload)) {
        try {
          const purchaseAmount = req.body?.pontuacao_reais
            ?? req.body?.valor_compra
            ?? req.body?.valorCompra
            ?? req.body?.valor
            ?? req.body?.amount
            ?? req.body?.purchaseAmount;
          const autoApprovedRaffleEntries = await approvePendingRaffleEntriesForPurchase(
            req.body?.cpf,
            purchaseAmount,
            'fidelimax_points'
          );

          if (autoApprovedRaffleEntries.length > 0 && responsePayload && typeof responsePayload === 'object') {
            responsePayload.autoApprovedRaffleEntries = autoApprovedRaffleEntries;
          }
        } catch (raffleError) {
          console.error('[Raffle] Auto approval after Fidelimax points failed:', raffleError);
        }
      }

      res.status(response.status).json(responsePayload);
    } catch (error: any) {
      if (error.response) {
        console.error(`[Proxy] Error from Fidelimax: ${error.response.status} -`, error.response.data);
        res.status(error.response.status).json(error.response.data);
      } else {
        console.error(`[Proxy] Connection failed:`, error.message);
        res.status(500).json({ error: 'Failed to connect to Fidelimax API', message: error.message });
      }
    }
  });

  // GET Stories (Filtered by 24h)
  app.get('/api/stories', async (req, res) => {
    console.log(`[API] Fetching stories`);
    const now = new Date();
    try {
      const stories = await prisma.story.findMany({
        where: { expiresAt: { gt: now } },
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { name: true } } }
      });
      res.json(stories);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar stories' });
    }
  });

  // POST Create Story (Multimedia)
  app.post('/api/stories', authenticate, authorizePermission('stories'), upload.single('file'), async (req: any, res: any) => {
    const { title, userId, productId } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Arquivo é obrigatório' });

    try {
      const isVideo = req.file.mimetype.startsWith('video/');
      
      // Get expiration hours from settings (default 24)
      const expirationSetting = await prisma.setting.findUnique({
        where: { key: 'story_expiration_hours' }
      });
      const hours = parseInt(expirationSetting?.value || '24');
      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

      // Safe parse userId
      let creatorId = null;
      if (userId && !isNaN(parseInt(userId))) {
        creatorId = parseInt(userId);
      } else if (req.user?.id) {
        creatorId = req.user.id;
      }

      console.log(`[Stories] Creating story: ${title} | Creator: ${creatorId} | Type: ${isVideo ? 'video' : 'image'}`);

      const newStory = await prisma.story.create({
        data: {
          title: title || 'Novo Story',
          url: `/uploads/${req.file.filename}`,
          type: isVideo ? 'video' : 'image',
          // @ts-ignore
          productId: productId || null,
          expiresAt,
          createdById: creatorId
        },
        include: { createdBy: { select: { name: true } } }
      });
      res.json(newStory);
    } catch (error: any) {
      console.error('[Stories] Error creating story:', error);
      res.status(500).json({ error: 'Erro ao criar story', message: error.message });
    }
  });

  // DELETE Story
  app.delete('/api/stories/:id', authenticate, authorizePermission('stories'), async (req, res) => {
    const { id } = req.params;
    try {
      const storyToDelete = await prisma.story.findUnique({ where: { id } });

      if (storyToDelete) {
        const filePath = path.join(process.cwd(), 'public', storyToDelete.url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        await prisma.story.delete({ where: { id } });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao deletar story' });
    }
  });

  // Background Cleanup Task (Every hour)
  setInterval(async () => {
    const now = new Date();
    try {
      const expired = await prisma.story.findMany({
        where: { expiresAt: { lte: now } }
      });
      
      if (expired.length > 0) {
        console.log(`[Cleanup] Deleting ${expired.length} expired stories`);
        expired.forEach(s => {
          const filePath = path.join(process.cwd(), 'public', s.url);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
        await prisma.story.deleteMany({
          where: { expiresAt: { lte: now } }
        });
      }
    } catch (error) {
      console.error('[Cleanup] Error:', error);
    }
  }, 60 * 60 * 1000);

  // --- Activation Products Endpoints ---

  // GET All Activation Products
  app.get('/api/activation-products', async (req, res) => {
    const { cpf } = req.query;
    const now = new Date();
    const cleanCpf = cpf ? String(cpf).replace(/\D/g, '') : '';
    try {
      const products = await prisma.activationProduct.findMany({
        where: { expiresAt: { gt: now } },
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { name: true } },
          activations: cpf ? {
            where: { userCpf: cleanCpf },
            orderBy: { activatedAt: 'desc' }
          } : {
            select: { id: true, validationStatus: true, isWinner: true }
          }
        }
      });
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const productsWithStatus = products.map(p => {
        const rawActivations = p.activations || [];
        const userActivations = cpf ? rawActivations.filter((a: any) => {
          // @ts-ignore
          if (p.isMonthly) {
            return new Date(a.activatedAt) >= startOfMonth;
          }
          return true;
        }) : rawActivations;
        const normalizedPromotionType = isRaffleLikeProduct(p) ? 'raffle' : 'offer';

        return {
          ...p,
          promotionType: normalizedPromotionType,
          isFree: normalizedPromotionType === 'raffle' ? true : p.isFree,
          activations: userActivations,
          participantCount: rawActivations.length,
          approvedParticipantCount: rawActivations.filter((a: any) => a.validationStatus === 'approved').length,
          pendingParticipantCount: rawActivations.filter((a: any) => a.validationStatus === 'pending').length,
          winnerCount: rawActivations.filter((a: any) => a.isWinner).length
        };
      });

      res.json(productsWithStatus);
    } catch (error) {
      console.error('[API] Error fetching activation products:', error);
      res.status(500).json({ error: 'Erro ao buscar produtos de ativação' });
    }
  });

  // POST Create Activation Product (Admin/Collab)
  app.post('/api/admin/activation-products', authenticate, authorizePermission('activations'), upload.single('file'), async (req: any, res: any) => {
    const {
      name,
      description,
      originalPrice,
      promotionalPrice,
      limitPerCpf,
      redeemWindowHours,
      expiresAt,
      isMonthly,
      isFree,
      userId,
      promotionType,
      prizeDescription,
      minPurchaseValue,
      participationInstructions,
      drawDate
    } = req.body;
    const minimumPurchase = parseOptionalFloat(minPurchaseValue);
    const parsedDrawDate = parseOptionalDate(drawDate);
    const requestLooksLikeRaffle = Boolean(
      prizeDescription
      || participationInstructions
      || parsedDrawDate
      || (minimumPurchase && minimumPurchase > 0)
      || hasRaffleKeyword(name, description, prizeDescription, participationInstructions)
    );
    const normalizedPromotionType = promotionType === 'raffle' || requestLooksLikeRaffle ? 'raffle' : 'offer';
    const isFreeProduct = parseBoolean(isFree) || normalizedPromotionType === 'raffle';
    
    if (!name || !expiresAt || (normalizedPromotionType === 'offer' && !isFreeProduct && (!originalPrice || !promotionalPrice))) {
      return res.status(400).json({ error: 'Dados obrigatórios ausentes' });
    }

    try {
      // Safe parse userId
      let creatorId = null;
      if (userId && !isNaN(parseInt(userId))) {
        creatorId = parseInt(userId);
      } else if (req.user?.id) {
        creatorId = req.user.id;
      }

      console.log(`[Admin] Creating product: ${name} | Creator: ${creatorId}`);

      const newProduct = await prisma.activationProduct.create({
        data: {
          name,
          description,
          imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
          originalPrice: isFreeProduct ? 0 : parseFloat(originalPrice),
          promotionalPrice: isFreeProduct ? 0 : parseFloat(promotionalPrice),
          promotionType: normalizedPromotionType,
          prizeDescription: prizeDescription || null,
          minPurchaseValue: minimumPurchase && minimumPurchase > 0 ? minimumPurchase : null,
          participationInstructions: participationInstructions || null,
          drawDate: parsedDrawDate,
          limitPerCpf: parseInt(limitPerCpf) || 1,
          redeemWindowHours: parseInt(redeemWindowHours) || 24,
          expiresAt: new Date(expiresAt),
          isMonthly: normalizedPromotionType === 'offer' && parseBoolean(isMonthly),
          isFree: isFreeProduct,
          createdById: creatorId
        },
        include: { createdBy: { select: { name: true } } }
      });

      // Create GLOBAL notification for everyone
      const notificationTitle = normalizedPromotionType === 'raffle'
        ? 'Nova Promoção de Sorteio!'
        : 'Nova Oferta Disponível!';
      const notificationMessage = normalizedPromotionType === 'raffle'
        ? `${name} está no ar. Participe pelo app${minimumPurchase && minimumPurchase > 0 ? ` e valide compras acima de ${formatCurrency(minimumPurchase)}.` : '.'}`
        : `${name} acabou de chegar! Aproveite o preço promocional de R$ ${parseFloat(promotionalPrice).toFixed(2)} por tempo limitado.`;

      await prisma.notification.create({
        data: {
          userCpf: '__GLOBAL__',
          title: notificationTitle,
          message: notificationMessage,
          type: 'reward',
          // @ts-ignore
          actionUrl: '/rewards?tab=activations'
        }
      });

      // Send Global Push
      await sendPushNotification(
        notificationTitle,
        normalizedPromotionType === 'raffle'
          ? `Toque para participar da promoção ${name}.`
          : `${name} disponível por apenas R$ ${parseFloat(promotionalPrice).toFixed(2)}!`,
        '__GLOBAL__',
        { 
          type: normalizedPromotionType === 'raffle' ? 'new_raffle' : 'new_product',
          productId: newProduct.id,
          url: '/rewards?tab=activations'
        }
      );

      res.json(newProduct);
    } catch (error) {
      console.error('[API] Error creating activation product:', error);
      res.status(500).json({ error: 'Erro ao criar produto' });
    }
  });

  // PUT Update Activation Product
  app.put('/api/admin/activation-products/:id', authenticate, authorizePermission('activations'), upload.single('file'), async (req, res) => {
    const { id } = req.params;
    const {
      name,
      description,
      originalPrice,
      promotionalPrice,
      limitPerCpf,
      redeemWindowHours,
      expiresAt,
      isMonthly,
      isFree,
      promotionType,
      prizeDescription,
      minPurchaseValue,
      participationInstructions,
      drawDate
    } = req.body;
    
    try {
      const existingProduct = await prisma.activationProduct.findUnique({ where: { id } });
      if (!existingProduct) return res.status(404).json({ error: 'Produto não encontrado' });
      const minimumPurchase = parseOptionalFloat(minPurchaseValue);
      const parsedDrawDate = parseOptionalDate(drawDate);
      const requestLooksLikeRaffle = Boolean(
        prizeDescription
        || participationInstructions
        || parsedDrawDate
        || (minimumPurchase && minimumPurchase > 0)
        || hasRaffleKeyword(name, description, prizeDescription, participationInstructions)
      );
      const normalizedPromotionType = promotionType === 'offer'
        ? 'offer'
        : promotionType === 'raffle' || requestLooksLikeRaffle || existingProduct.promotionType === 'raffle'
          ? 'raffle'
          : 'offer';
      const nextIsFree = isFree !== undefined ? parseBoolean(isFree) || normalizedPromotionType === 'raffle' : normalizedPromotionType === 'raffle';

      let imageUrl = existingProduct.imageUrl;
      if (req.file) {
        if (existingProduct.imageUrl) {
          const oldPath = path.join(process.cwd(), 'public', existingProduct.imageUrl);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        imageUrl = `/uploads/${req.file.filename}`;
      }

      const updatedProduct = await prisma.activationProduct.update({
        where: { id },
        data: {
          name,
          description,
          imageUrl,
          originalPrice: nextIsFree ? 0 : originalPrice ? parseFloat(originalPrice) : undefined,
          promotionalPrice: nextIsFree ? 0 : promotionalPrice ? parseFloat(promotionalPrice) : undefined,
          promotionType: normalizedPromotionType,
          prizeDescription: prizeDescription !== undefined ? (prizeDescription || null) : undefined,
          minPurchaseValue: minPurchaseValue !== undefined ? (minimumPurchase && minimumPurchase > 0 ? minimumPurchase : null) : undefined,
          participationInstructions: participationInstructions !== undefined ? (participationInstructions || null) : undefined,
          drawDate: drawDate !== undefined ? parsedDrawDate : undefined,
          limitPerCpf: limitPerCpf ? parseInt(limitPerCpf) : undefined,
          redeemWindowHours: redeemWindowHours ? parseInt(redeemWindowHours) : undefined,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          isMonthly: isMonthly !== undefined ? (normalizedPromotionType === 'offer' && parseBoolean(isMonthly)) : (normalizedPromotionType === 'raffle' ? false : undefined),
          isFree: isFree !== undefined || normalizedPromotionType === 'raffle' ? nextIsFree : undefined
        }
      });
      res.json(updatedProduct);
    } catch (error: any) {
      console.error('[API] Error updating activation product:', error);
      res.status(500).json({ error: 'Erro ao atualizar produto', message: error.message });
    }
  });

  // DELETE Activation Product
  app.delete('/api/admin/activation-products/:id', authenticate, authorizePermission('activations'), async (req, res) => {
    try {
      const product = await prisma.activationProduct.findUnique({ where: { id: req.params.id } });
      if (product?.imageUrl) {
        const filePath = path.join(process.cwd(), 'public', product.imageUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      await prisma.activationProduct.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao deletar produto' });
    }
  });

  // GET Raffle Participants
  app.get('/api/admin/activation-products/:id/participants', authenticate, authorizePermission('activations'), async (req, res) => {
    const { id } = req.params;
    try {
      const product = await prisma.activationProduct.findUnique({
        where: { id },
        include: {
          activations: {
            orderBy: [
              { isWinner: 'desc' },
              { activatedAt: 'desc' }
            ]
          }
        }
      });

      if (!product) return res.status(404).json({ error: 'Promoção não encontrada' });
      if (!isRaffleLikeProduct(product)) {
        return res.status(400).json({ error: 'Esta promoção não é um sorteio' });
      }

      const stats = product.activations.reduce((acc: any, participant: any) => {
        acc.total += 1;
        acc[participant.validationStatus] = (acc[participant.validationStatus] || 0) + 1;
        if (participant.isWinner) acc.winners += 1;
        return acc;
      }, { total: 0, pending: 0, approved: 0, rejected: 0, winners: 0 });

      res.json({
        product,
        participants: product.activations,
        stats
      });
    } catch (error) {
      console.error('[API] Error fetching raffle participants:', error);
      res.status(500).json({ error: 'Erro ao buscar participantes do sorteio' });
    }
  });

  // PATCH Raffle Participant validation
  app.patch('/api/admin/raffle-participants/:id', authenticate, authorizePermission('activations'), async (req, res) => {
    const { id } = req.params;
    const { validationStatus, purchaseAmount } = req.body;
    const nextStatus = ['pending', 'approved', 'rejected'].includes(validationStatus) ? validationStatus : null;

    if (!nextStatus) {
      return res.status(400).json({ error: 'Status de validação inválido' });
    }

    try {
      const participant = await prisma.productActivation.findUnique({
        where: { id },
        include: { product: true }
      });

      if (!participant) return res.status(404).json({ error: 'Participante não encontrado' });
      if (!isRaffleLikeProduct(participant.product)) {
        return res.status(400).json({ error: 'Esta promoção não pertence a um sorteio' });
      }

      const amount = parseOptionalFloat(purchaseAmount);
      const minimumPurchase = participant.product.minPurchaseValue || 0;
      if (nextStatus === 'approved' && minimumPurchase > 0 && (!amount || amount < minimumPurchase)) {
        return res.status(400).json({ error: `Informe uma compra de pelo menos ${formatCurrency(minimumPurchase)} para aprovar.` });
      }

      const updated = await prisma.productActivation.update({
        where: { id },
        data: {
          validationStatus: nextStatus,
          purchaseAmount: amount,
          couponNumber: nextStatus === 'approved' ? (participant.couponNumber || generateCouponNumber()) : null,
          validatedAt: nextStatus === 'approved' ? new Date() : null,
          isWinner: nextStatus === 'rejected' ? false : participant.isWinner,
          drawnAt: nextStatus === 'rejected' ? null : participant.drawnAt
        },
        include: { product: true }
      });

      if (nextStatus === 'approved') {
        await prisma.notification.create({
          data: {
            userCpf: updated.userCpf,
            title: 'Participação Validada!',
            message: `Seu cupom ${updated.couponNumber} para ${updated.product.name} está confirmado no sorteio.`,
            type: 'reward',
            // @ts-ignore
            actionUrl: '/rewards?tab=activations'
          }
        });

        await sendPushNotification(
          'Participação Validada!',
          `Seu cupom ${updated.couponNumber} está confirmado no sorteio ${updated.product.name}.`,
          updated.userCpf,
          { type: 'raffle_entry_approved', productId: updated.productId, couponNumber: updated.couponNumber }
        );
      }

      if (nextStatus === 'rejected') {
        await prisma.notification.create({
          data: {
            userCpf: updated.userCpf,
            title: 'Participação não validada',
            message: `Sua participação em ${updated.product.name} não foi validada. Procure uma unidade San Remo para conferir os critérios.`,
            type: 'info',
            // @ts-ignore
            actionUrl: '/rewards?tab=activations'
          }
        });
      }

      res.json(updated);
    } catch (error) {
      console.error('[API] Error validating raffle participant:', error);
      res.status(500).json({ error: 'Erro ao validar participante' });
    }
  });

  // POST Draw Raffle Winners
  app.post('/api/admin/activation-products/:id/draw', authenticate, authorizePermission('activations'), async (req, res) => {
    const { id } = req.params;
    const requestedCount = Math.max(1, Math.min(parseInt(req.body?.winnerCount || req.body?.count || '1'), 50));
    const redraw = parseBoolean(req.body?.redraw);

    try {
      const product = await prisma.activationProduct.findUnique({ where: { id } });
      if (!product) return res.status(404).json({ error: 'Promoção não encontrada' });
      if (!isRaffleLikeProduct(product)) {
        return res.status(400).json({ error: 'Esta promoção não é um sorteio' });
      }

      if (product.drawDate && new Date(product.drawDate).getTime() > Date.now()) {
        return res.status(400).json({ error: `O sorteio estará disponível em ${new Date(product.drawDate).toLocaleDateString('pt-BR')}.` });
      }

      if (redraw) {
        await prisma.productActivation.updateMany({
          where: { productId: id, isWinner: true },
          data: { isWinner: false, drawnAt: null }
        });
      }

      const eligibleParticipants = await prisma.productActivation.findMany({
        where: {
          productId: id,
          validationStatus: 'approved',
          isWinner: false
        }
      });

      if (eligibleParticipants.length === 0) {
        return res.status(400).json({ error: 'Não há participantes aprovados disponíveis para sortear.' });
      }

      if (eligibleParticipants.length < requestedCount) {
        return res.status(400).json({
          error: `Há apenas ${eligibleParticipants.length} participante(s) aprovado(s) disponível(is) para ${requestedCount} ganhador(es).`
        });
      }

      const shuffledParticipants = [...eligibleParticipants].sort(() => Math.random() - 0.5);
      const selectedParticipants = shuffledParticipants.slice(0, requestedCount);
      const drawnAt = new Date();
      const winners = await prisma.$transaction(selectedParticipants.map((participant) => (
        prisma.productActivation.update({
          where: { id: participant.id },
          data: { isWinner: true, drawnAt },
          include: { product: true }
        })
      )));

      res.json({
        product,
        winners,
        winnerCount: winners.length,
        redraw,
        drawnAt
      });
    } catch (error) {
      console.error('[API] Error drawing raffle winners:', error);
      res.status(500).json({ error: 'Erro ao realizar sorteio' });
    }
  });

  // POST Confirm Raffle Winners
  app.post('/api/admin/activation-products/:id/draw/confirm', authenticate, authorizePermission('activations'), async (req, res) => {
    const { id } = req.params;

    try {
      const product = await prisma.activationProduct.findUnique({ where: { id } });
      if (!product) return res.status(404).json({ error: 'Promoção não encontrada' });
      if (!isRaffleLikeProduct(product)) {
        return res.status(400).json({ error: 'Esta promoção não é um sorteio' });
      }

      const winners = await prisma.productActivation.findMany({
        where: {
          productId: id,
          validationStatus: 'approved',
          isWinner: true
        },
        orderBy: { drawnAt: 'asc' },
        include: { product: true }
      });

      if (winners.length === 0) {
        return res.status(400).json({ error: 'Nenhum ganhador sorteado para validar.' });
      }

      let notifiedCount = 0;
      for (const winner of winners) {
        const message = `Parabéns! Seu cupom ${winner.couponNumber || 'confirmado'} foi sorteado em ${winner.product.name}.`;
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userCpf: winner.userCpf,
            title: 'Você foi sorteado!',
            message
          }
        });

        if (!existingNotification) {
          await prisma.notification.create({
            data: {
              userCpf: winner.userCpf,
              title: 'Você foi sorteado!',
              message,
              type: 'reward',
              // @ts-ignore
              actionUrl: '/rewards?tab=activations'
            }
          });

          await sendPushNotification(
            'Você foi sorteado!',
            `Parabéns! Você ganhou no sorteio ${winner.product.name}.`,
            winner.userCpf,
            { type: 'raffle_winner', productId: winner.productId, participantId: winner.id }
          );

          notifiedCount += 1;
        }
      }

      res.json({ product, winners, notifiedCount, confirmedAt: new Date() });
    } catch (error) {
      console.error('[API] Error confirming raffle winners:', error);
      res.status(500).json({ error: 'Erro ao validar ganhadores do sorteio' });
    }
  });

  // POST Activate Product for User
  app.post('/api/activations', async (req, res) => {
    const { productId, userCpf, customerName, customerEmail, customerPhone } = req.body;
    if (!productId || !userCpf) {
      return res.status(400).json({ error: 'Produto e CPF são obrigatórios' });
    }
    const cleanCpf = String(userCpf).replace(/\D/g, '');

    try {
      const product = await prisma.activationProduct.findUnique({ 
        where: { id: productId },
        include: { activations: { where: { userCpf: cleanCpf } } }
      });
      if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
      const isRaffleProduct = isRaffleLikeProduct(product);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const userActivationsCount = product.activations.filter(a => {
        if (isRaffleProduct && a.validationStatus === 'rejected') {
          return false;
        }
        // @ts-ignore
        if (product.isMonthly) {
          return new Date(a.activatedAt) >= startOfMonth;
        }
        return true;
      }).length;

      if (userActivationsCount >= product.limitPerCpf) {
        return res.status(400).json({
          error: isRaffleProduct
            ? 'Você já atingiu o limite de participações para este sorteio.'
            : 'Você já atingiu o limite de ativações para esta oferta.'
        });
      }

      if (isRaffleProduct) {
        const requiresPurchaseValidation = Boolean(product.minPurchaseValue && product.minPurchaseValue > 0);
        const participant = await prisma.productActivation.create({
          data: {
            productId,
            userCpf: cleanCpf,
            customerName: customerName || null,
            customerEmail: customerEmail || null,
            customerPhone: customerPhone || null,
            validUntil: product.expiresAt,
            validationStatus: requiresPurchaseValidation ? 'pending' : 'approved',
            couponNumber: requiresPurchaseValidation ? null : generateCouponNumber(),
            validatedAt: requiresPurchaseValidation ? null : new Date()
          },
          include: { product: true }
        });

        const title = requiresPurchaseValidation ? 'Participação Recebida!' : 'Participação Confirmada!';
        const message = requiresPurchaseValidation
          ? `Para confirmar seu cupom no sorteio ${product.name}, pontue no app uma compra acima de ${formatCurrency(product.minPurchaseValue)}. A validação será automática.`
          : `Você já está participando do sorteio ${product.name}. Cupom: ${participant.couponNumber}.`;

        await prisma.notification.create({
          data: {
            userCpf: cleanCpf,
            title,
            message,
            type: 'reward',
            // @ts-ignore
            actionUrl: '/rewards?tab=activations'
          }
        });

        await sendPushNotification(
          title,
          message,
          cleanCpf,
          {
            type: requiresPurchaseValidation ? 'raffle_entry_pending' : 'raffle_entry_approved',
            productId,
            participantId: participant.id,
            url: '/rewards?tab=activations'
          }
        );

        return res.json(participant);
      }

      const validUntil = new Date(Date.now() + (product.redeemWindowHours * 60 * 60 * 1000));
      const limit = product.limitPerCpf || 1;

      // Create multiple activation records (one click = full limit granted)
      const activationRecords = Array.from({ length: limit }).map(() => ({
          productId,
          userCpf: cleanCpf,
          validUntil,
          customerName: customerName || null,
          customerEmail: customerEmail || null,
          customerPhone: customerPhone || null,
          validationStatus: 'approved',
          validatedAt: new Date()
      }));

      await prisma.productActivation.createMany({
        data: activationRecords
      });

      // Get the first one to return as a "representative" of the activation
      const firstActivation = await prisma.productActivation.findFirst({
        where: { productId, userCpf: cleanCpf, redeemedAt: null },
        include: { product: true }
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userCpf: cleanCpf,
          title: '🎁 Oferta Ativada!',
          message: `Você ativou ${product.name} (${limit} unidades). Resgate em até ${product.redeemWindowHours}h!`,
          type: 'reward',
          // @ts-ignore
          actionUrl: '/rewards?tab=activations'
        }
      });

      // Send Push
      await sendPushNotification(
        '🎁 Oferta Ativada!',
        `Você liberou ${limit} unidades de ${product.name}. Aproveite!`,
        cleanCpf,
        { 
          type: 'product_activated', 
          productId: productId,
          url: '/rewards?tab=activations'
        }
      );

      res.json(firstActivation);
    } catch (error) {
      console.error('[API] Activation error:', error);
      res.status(500).json({ error: 'Erro ao ativar oferta' });
    }
  });
  
  // POST Redeem Activation (Mark as used)
  app.post('/api/activations/:id/redeem', authenticate, authorizePermission('redeem_activations'), async (req, res) => {
    const { id } = req.params;
    try {
      const activation = await (prisma.productActivation.update({
        where: { id: id },
        data: { redeemedAt: new Date() },
        include: { product: true }
      }) as any);

      // Create notification
      await prisma.notification.create({
        data: {
          userCpf: activation.userCpf,
          title: '✅ Oferta Utilizada!',
          message: `Você resgatou com sucesso: ${activation.product.name}. Aproveite seu desconto!`,
          type: 'info'
        }
      });

      // Send Push
      await sendPushNotification(
        '✅ Oferta Utilizada!',
        `Você resgatou ${activation.product.name}. Bom apetite!`,
        activation.userCpf,
        { type: 'product_redeemed', productId: activation.productId }
      );

      res.json({ success: true });
    } catch (error) {
      console.error('[API] Redemption error:', error);
      res.status(500).json({ error: 'Erro ao processar resgate' });
    }
  });

  // POST Bulk Redeem Activation (Mark multiple units as used)
  app.post('/api/activations/redeem-bulk', authenticate, authorizePermission('redeem_activations'), async (req, res) => {
    const { productId, userCpf, quantity } = req.body;
    const cleanCpf = userCpf.replace(/\D/g, '');
    const qty = parseInt(quantity) || 1;

    try {
      const product = await prisma.activationProduct.findUnique({ where: { id: productId } });
      if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

      // Find available activations
      const available = await prisma.productActivation.findMany({
        where: { productId, userCpf: cleanCpf, redeemedAt: null },
        take: qty,
        orderBy: { activatedAt: 'asc' } // Redeem oldest first
      });

      if (available.length === 0) {
        return res.status(400).json({ error: 'Nenhuma ativação pendente encontrada para este produto' });
      }

      const actualRedeemedQty = available.length;
      const idsToUpdate = available.map(a => a.id);

      await prisma.productActivation.updateMany({
        where: { id: { in: idsToUpdate } },
        data: { redeemedAt: new Date() }
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userCpf: cleanCpf,
          title: '✅ Resgate Confirmado!',
          message: `Você utilizou ${actualRedeemedQty} unidade(s) de: ${product.name}.`,
          type: 'info'
        }
      });

      // Send Push
      await sendPushNotification(
        '✅ Resgate Confirmado!',
        `Você utilizou ${actualRedeemedQty} unidade(s) de ${product.name}.`,
        cleanCpf,
        { type: 'product_redeemed_bulk', productId, quantity: actualRedeemedQty }
      );

      res.json({ success: true, redeemedQuantity: actualRedeemedQty });
    } catch (error) {
      console.error('[API] Bulk redemption error:', error);
      res.status(500).json({ error: 'Erro ao processar resgate em massa' });
    }
  });

  // GET User Activations
  app.get('/api/my-activations/:cpf', async (req, res) => {
    const userCpf = req.params.cpf.replace(/\D/g, '');
    const now = new Date();
    try {
      const activations = await prisma.productActivation.findMany({
        where: { 
          userCpf,
          validUntil: { gt: now },
          redeemedAt: null
        },
        include: { product: true },
        orderBy: { activatedAt: 'desc' }
      });
      res.json(activations);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar ativações' });
    }
  });

  // Serve uploads statically
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Fidelimax Webhook Endpoint
  app.post('/api/webhooks/fidelimax', async (req, res) => {
    try {
      const payload = req.body;
      console.log('[Webhook] Received from Fidelimax:', payload);

      const userCpf = payload.cpf?.replace(/\D/g, '') || '';
      let title = 'San Remo Bônus';
      let body = 'Você tem uma nova atualização!';

      // Mapping based on Fidelimax Documentation
      if (payload.pontuacao) {
        title = '💰 Pontos Recebidos!';
        body = `Você ganhou ${payload.pontuacao} pontos! Seu novo saldo é ${payload.saldo}.`;
        const purchaseAmount = payload.pontuacao_reais
          ?? payload.valor_compra
          ?? payload.valorCompra
          ?? payload.valor
          ?? payload.purchaseAmount
          ?? payload.compra?.valor;

        if (userCpf && purchaseAmount) {
          await approvePendingRaffleEntriesForPurchase(userCpf, purchaseAmount, 'fidelimax_webhook');
        }
      } else if (payload.premio) {
        title = '🎁 Resgate Realizado!';
        body = `Resgate de ${payload.premio} confirmado. Código: ${payload.voucher}`;
      } else if (payload.cadastro) {
        title = '✨ Bem-vindo!';
        body = `Olá ${payload.nome}, seu cadastro no San Remo Bônus está pronto!`;
      }

      if (userCpf) {
        await sendPushNotification(title, body, userCpf, { type: 'fidelimax_webhook', ...payload });
      }

      // Persist notification for the Notification Center
      await prisma.notification.create({
        data: {
          userCpf,
          title,
          message: body,
          type: payload.pontuacao ? 'points' : payload.premio ? 'reward' : 'info',
          // @ts-ignore
          imageUrl: null
        }
      });

      res.status(200).send('OK');
    } catch (error) {
      console.error('[Webhook] Error:', error);
      res.status(500).send('Error');
    }
  });

  // MOCK Endpoint for testing webhooks easily
  app.post('/api/fidelimax/mock-event', async (req, res) => {
    const { type, cpf, points, premio, voucher } = req.body;
    const mockPayload: any = { cpf, nome: 'Usuário Teste', saldo: 1500 };

    if (type === 'points') {
      mockPayload.pontuacao = points || 50;
    } else if (type === 'redeem') {
      mockPayload.premio = premio || 'Café Expresso';
      mockPayload.voucher = voucher || 'MOCK-VOUCHER-123';
    }

    // Trigger local webhook
    try {
      await axios.post(`http://localhost:${PORT}/api/webhooks/fidelimax`, mockPayload);
      res.json({ message: 'Mock event triggered successfully' });
    } catch (e) {
      res.status(500).json({ error: 'Failed to trigger mock event' });
    }
  });

  // Catch-all for API 404s
  app.all('/api/*', (req, res) => {
    console.log(`[API 404] Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'API route not found' });
  });

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('[Global Error]', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ 
      error: 'Erro interno no servidor', 
      message: err.message || 'Desconhecido',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const distPath = path.join(__dirname, 'dist');
    
    console.log('[Server] Production mode: Serving static files from', distPath);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
