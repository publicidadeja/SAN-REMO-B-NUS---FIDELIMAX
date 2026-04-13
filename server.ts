import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import admin from 'firebase-admin';
import axios from 'axios';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

// Helper function to get tokens for a user or global
async function getPushTokens(userCpf?: string) {
  if (userCpf && userCpf !== '__GLOBAL__') {
    // @ts-ignore
    const tokens = await prisma.pushToken.findMany({
      where: { userCpf: userCpf.replace(/\D/g, '') }
    });
    return tokens.map(t => t.token);
  } else {
    // @ts-ignore
    const tokens = await prisma.pushToken.findMany();
    return tokens.map(t => t.token);
  }
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

// Initialize Firebase Admin (Only if credentials are provided)
// In a real scenario, you would provide the service account credentials via env variables
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully');
  } else {
    console.warn('FIREBASE_SERVICE_ACCOUNT not found. Push notifications will be mocked.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
}

// Helper to send Push Notifications via FCM
async function sendPushNotification(title: string, body: string, userCpf?: string, data: Record<string, any> = {}) {
  if (admin.apps.length === 0) {
    console.log(`[Push MOCK] Title: ${title} | Body: ${body} | User: ${userCpf || 'ALL'}`);
    return;
  }

  try {
    const tokens = await getPushTokens(userCpf);
    
    if (tokens.length === 0) {
      console.log(`[Push] No tokens found for ${userCpf || 'Global broadcast'}`);
      return;
    }

    // FCM 'data' values MUST be strings.
    // We sanitize the data object here.
    const sanitizedData: Record<string, string> = {};
    for (const key in data) {
      if (data[key] !== undefined && data[key] !== null) {
        if (typeof data[key] === 'object') {
          sanitizedData[key] = JSON.stringify(data[key]);
        } else {
          sanitizedData[key] = String(data[key]);
        }
      }
    }

    if (userCpf && userCpf !== '__GLOBAL__') {
      // Send to specific user tokens
      for (const token of tokens) {
        const message = {
          notification: { title, body },
          data: { ...sanitizedData, cpf: userCpf },
          token: token,
          android: {
            priority: 'high' as const,
            notification: { 
              sound: 'notification',
              channelId: 'default' 
            }
          },
          apns: {
            payload: {
              aps: { 
                sound: 'notification.mp3',
                badge: 1 
              }
            }
          }
        };

        try {
          await admin.messaging().send(message);
          console.log(`[Push] Sent to ${userCpf}: ${title}`);
        } catch (error: any) {
          console.error(`[Push] Error sending to token ${token}:`, error.message);
          if (error.code === 'messaging/registration-token-not-registered' || error.code === 'messaging/invalid-registration-token') {
             // @ts-ignore
             await prisma.pushToken.deleteMany({ where: { token } }).catch(() => {});
          }
        }
      }
    } else {
      // Global Push
      const response = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: { ...sanitizedData, type: 'global_announcement' },
        android: {
          priority: 'high' as const,
          notification: { 
            sound: 'notification',
            channelId: 'default' 
          }
        },
        apns: {
          payload: {
            aps: { 
              sound: 'notification.mp3',
              badge: 1 
            }
          }
        }
      });
      
      console.log(`[Push] Global broadcast to ${tokens.length} tokens. Success: ${response.successCount}, Failure: ${response.failureCount}`);

      // Cleanup failed tokens
      if (response.failureCount > 0) {
        response.responses.forEach(async (resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            if (errorCode === 'messaging/registration-token-not-registered' || errorCode === 'messaging/invalid-registration-token') {
              const failedToken = tokens[idx];
              // @ts-ignore
              await prisma.pushToken.deleteMany({ where: { token: failedToken } }).catch(() => {});
              console.log(`[Push] Cleaned up invalid token: ${failedToken}`);
            }
          }
        });
      }
    }
  } catch (error) {
    console.error('[Push] Error sending notification:', error);
  }
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
    req.user = decoded;
    next();
  } catch (error) {
    console.error('[Auth] Invalid token:', error);
    return res.status(401).json({ error: 'Sessão expirada ou token inválido.' });
  }
}

// Admin Authorization Middleware (Checks role)
function authorizeAdmin(req: any, res: any, next: any) {
  if (req.user?.role !== 'admin' && req.user?.role !== 'collaborator') {
    return res.status(403).json({ error: 'Permissão insuficiente.' });
  }
  next();
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

  // Push Token Registration
  app.post('/api/push/register', async (req, res) => {
    const { cpf, token, device } = req.body;
    if (!cpf || !token) {
      return res.status(400).json({ error: 'CPF and Token are required' });
    }
    const cleanCpf = cpf.replace(/\D/g, '');
    
    try {
      // @ts-ignore
      await prisma.pushToken.upsert({
        where: { token },
        update: { userCpf: cleanCpf, device, updatedAt: new Date() },
        create: { userCpf: cleanCpf, token, device }
      });
      console.log(`[Push] Token registered in DB for CPF: ${cleanCpf}`);
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
  app.post('/api/admin/notifications', authenticate, authorizeAdmin, upload.single('image'), async (req, res) => {
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
  app.get('/api/admin/notifications', authenticate, authorizeAdmin, async (req, res) => {
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
  app.delete('/api/admin/notifications/:id', authenticate, authorizeAdmin, async (req, res) => {
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

  // GET Collaborators (Admin only)
  app.get('/api/admin/collaborators', authenticate, authorizeAdmin, async (req, res) => {
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
  app.post('/api/admin/collaborators', authenticate, authorizeAdmin, async (req, res) => {
    const { name, email, password, role, permissions } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }
    
    try {
      await prisma.user.upsert({
        where: { email },
        update: { name, password, role: role || 'collaborator', permissions },
        create: { name, email, password, role: role || 'collaborator', permissions }
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao salvar colaborador' });
    }
  });

  // PUT Update Collaborator
  app.put('/api/admin/collaborators/:id', authenticate, authorizeAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, email, password, role, permissions } = req.body;
    
    try {
      // Security: Previne alteração do admin mestre via API se não for por ele mesmo ou se for uma tentativa de mudar o e-mail/role do mestre
      const targetUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });
      if (targetUser?.email === 'admin@sanremobonus.com.br' && (email !== targetUser.email || role !== 'admin')) {
        return res.status(403).json({ error: 'O administrador mestre não pode ter seu e-mail ou cargo alterado.' });
      }

      await prisma.user.update({
        where: { id: parseInt(id) },
        data: { 
          name, 
          email, 
          password: password || undefined, 
          role, 
          permissions 
        }
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar colaborador' });
    }
  });

  // DELETE Collaborator
  app.delete('/api/admin/collaborators/:id', authenticate, authorizeAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const targetUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });
      if (targetUser?.email === 'admin@sanremobonus.com.br') {
        return res.status(403).json({ error: 'O administrador mestre não pode ser excluído.' });
      }

      await prisma.user.delete({ where: { id: parseInt(id) } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao excluir colaborador' });
    }
  });

  // GET Settings
  app.get('/api/admin/settings/:key', authenticate, authorizeAdmin, async (req, res) => {
    try {
      const setting = await prisma.setting.findUnique({ where: { key: req.params.key } });
      res.json(setting || { key: req.params.key, value: '' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar configuração' });
    }
  });

  // POST Update Settings
  app.post('/api/admin/settings', authenticate, authorizeAdmin, async (req, res) => {
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
  app.post('/api/admin/pamphlet-upload', authenticate, authorizeAdmin, upload.single('file'), async (req, res) => {
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
  app.delete('/api/admin/pamphlet/:id', authenticate, authorizeAdmin, async (req, res) => {
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

  // GET System Wide Stats (Admin only)
  app.get('/api/admin/system-stats', authenticate, authorizeAdmin, async (req, res) => {
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
      
      res.status(response.status).json(response.data);
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
  app.post('/api/stories', authenticate, authorizeAdmin, upload.single('file'), async (req: any, res: any) => {
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
  app.delete('/api/stories/:id', authenticate, authorizeAdmin, async (req, res) => {
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
    try {
      const products = await prisma.activationProduct.findMany({
        where: { expiresAt: { gt: now } },
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { name: true } },
          activations: cpf ? {
            where: { userCpf: String(cpf).replace(/\D/g, '') }
          } : false
        }
      });
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const productsWithStatus = products.map(p => {
        const userActivations = p.activations.filter(a => {
          // @ts-ignore
          if (p.isMonthly) {
            return new Date(a.activatedAt) >= startOfMonth;
          }
          return true;
        });

        return {
          ...p,
          activations: userActivations
        };
      });

      res.json(productsWithStatus);
    } catch (error) {
      console.error('[API] Error fetching activation products:', error);
      res.status(500).json({ error: 'Erro ao buscar produtos de ativação' });
    }
  });

  // POST Create Activation Product (Admin/Collab)
  app.post('/api/admin/activation-products', authenticate, authorizeAdmin, upload.single('file'), async (req: any, res: any) => {
    const { name, description, originalPrice, promotionalPrice, limitPerCpf, redeemWindowHours, expiresAt, isMonthly, isFree, userId } = req.body;
    
    if (!name || (isFree === 'false' && (!originalPrice || !promotionalPrice))) {
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
          originalPrice: isFree === 'true' ? 0 : parseFloat(originalPrice),
          promotionalPrice: isFree === 'true' ? 0 : parseFloat(promotionalPrice),
          limitPerCpf: parseInt(limitPerCpf) || 1,
          redeemWindowHours: parseInt(redeemWindowHours) || 24,
          expiresAt: new Date(expiresAt),
          isMonthly: isMonthly === 'true',
          isFree: isFree === 'true',
          createdById: creatorId
        },
        include: { createdBy: { select: { name: true } } }
      });

      // Create GLOBAL notification for everyone
      await prisma.notification.create({
        data: {
          userCpf: '__GLOBAL__',
          title: '🔥 Nova Oferta Disponível!',
          message: `${name} acabou de chegar! Aproveite o preço promocional de R$ ${parseFloat(promotionalPrice).toFixed(2)} por tempo limitado.`,
          type: 'reward',
          // @ts-ignore
          actionUrl: '/rewards?tab=activations'
        }
      });

      // Send Global Push
      await sendPushNotification(
        '🔥 Nova Oferta Disponível!',
        `${name} disponível por apenas R$ ${parseFloat(promotionalPrice).toFixed(2)}!`,
        '__GLOBAL__',
        { 
          type: 'new_product', 
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
  app.put('/api/admin/activation-products/:id', authenticate, authorizeAdmin, upload.single('file'), async (req, res) => {
    const { id } = req.params;
    const { name, description, originalPrice, promotionalPrice, limitPerCpf, redeemWindowHours, expiresAt, isMonthly, isFree } = req.body;
    
    try {
      const existingProduct = await prisma.activationProduct.findUnique({ where: { id } });
      if (!existingProduct) return res.status(404).json({ error: 'Produto não encontrado' });

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
          originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
          promotionalPrice: promotionalPrice ? parseFloat(promotionalPrice) : undefined,
          limitPerCpf: limitPerCpf ? parseInt(limitPerCpf) : undefined,
          redeemWindowHours: redeemWindowHours ? parseInt(redeemWindowHours) : undefined,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          isMonthly: isMonthly !== undefined ? isMonthly === 'true' : undefined,
          isFree: isFree !== undefined ? isFree === 'true' : undefined
        }
      });
      res.json(updatedProduct);
    } catch (error: any) {
      console.error('[API] Error updating activation product:', error);
      res.status(500).json({ error: 'Erro ao atualizar produto', message: error.message });
    }
  });

  // DELETE Activation Product
  app.delete('/api/admin/activation-products/:id', authenticate, authorizeAdmin, async (req, res) => {
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

  // POST Activate Product for User
  app.post('/api/activations', async (req, res) => {
    const { productId, userCpf } = req.body;
    const cleanCpf = userCpf.replace(/\D/g, '');

    try {
      const product = await prisma.activationProduct.findUnique({ 
        where: { id: productId },
        include: { activations: { where: { userCpf: cleanCpf } } }
      });
      if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const userActivationsCount = product.activations.filter(a => {
        // @ts-ignore
        if (product.isMonthly) {
          return new Date(a.activatedAt) >= startOfMonth;
        }
        return true;
      }).length;

      if (userActivationsCount >= product.limitPerCpf) {
        return res.status(400).json({ error: 'Você já atingiu o limite de ativações para esta oferta.' });
      }

      const validUntil = new Date(Date.now() + (product.redeemWindowHours * 60 * 60 * 1000));
      const limit = product.limitPerCpf || 1;

      // Create multiple activation records (one click = full limit granted)
      const activationRecords = Array.from({ length: limit }).map(() => ({
          productId,
          userCpf: cleanCpf,
          validUntil
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
  app.post('/api/activations/:id/redeem', authenticate, authorizeAdmin, async (req, res) => {
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
  app.post('/api/activations/redeem-bulk', authenticate, authorizeAdmin, async (req, res) => {
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
