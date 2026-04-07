import axios from 'axios';

async function verifyNotifications() {
  const adminEmail = 'admin@sanremobonus.com.br';
  const adminPassword = '@Zender1997'; // From server.ts seed

  try {
    console.log('--- Step 1: Logging in as Admin ---');
    const loginRes = await axios.post('http://localhost:9999/api/admin/login', {
      email: adminEmail,
      password: adminPassword
    });
    const token = loginRes.data.token;
    console.log('Login successful.');

    console.log('\n--- Step 2: Sending Global Notification ---');
    const gNotify = await axios.post('http://localhost:9999/api/admin/notifications', {
      title: 'Teste Global Verificação',
      message: 'Esta é uma notificação global de teste.',
      broadcastType: 'internal'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Global notification sent:', gNotify.data);

    console.log('\n--- Step 3: Verifying storage ---');
    // We can't easily check the DB from here without Prisma, 
    // but we can check if the user notifications list includes it.
    // Using a fake CPF that should receive global notifications.
    const checkRes = await axios.get('http://localhost:9999/api/notifications/99999999999');
    const hasGlobal = checkRes.data.some((n: any) => n.title === 'Teste Global Verificação');
    console.log('Notification found in user feed:', hasGlobal);

    if (hasGlobal) {
      console.log('\n✅ VERIFICATION SUCCESSFUL');
    } else {
      console.log('\n❌ VERIFICATION FAILED: Notification not found in feed');
    }

  } catch (error: any) {
    console.error('Verification failed with error:', error.response?.data || error.message);
  }
}

verifyNotifications();
