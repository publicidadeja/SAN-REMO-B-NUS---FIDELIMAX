
import axios from 'axios';

async function testNotifications() {
  const CPF = '12345678901';
  
  try {
    console.log('--- Testando Global Notification ---');
    // 1. Create a dummy product
    const productData = {
      name: 'Produto Teste Notificacao',
      description: 'Descricao teste',
      originalPrice: 100,
      promotionalPrice: 80,
      limitPerCpf: 1,
      redeemWindowHours: 24,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      userId: 1
    };
    
    await axios.post('http://localhost:9999/api/admin/activation-products', productData);
    console.log('Produto criado!');
    
    // 2. Fetch notifications for a user
    const res = await axios.get(`http://localhost:9999/api/notifications/${CPF}`);
    const globalNotif = res.data.find((n: any) => n.userCpf === '__GLOBAL__');
    
    if (globalNotif) {
      console.log('SUCESSO: Notificação Global encontrada:', globalNotif.title);
    } else {
      console.log('FALHA: Notificação Global NÃO encontrada');
    }
    
    console.log('\n--- Testando Clear Notifications ---');
    // 3. Create a specific notification for the user
    // (We don't have a direct POST for single notif other than webhooks, but we can simulate a webhook)
    await axios.post('http://localhost:9999/api/webhooks/fidelimax', {
      cpf: CPF,
      pontuacao: 10,
      saldo: 50
    });
    
    const res2 = await axios.get(`http://localhost:9999/api/notifications/${CPF}`);
    console.log('Notificações antes do clear:', res2.data.length);
    
    // 4. Clear
    await axios.delete(`http://localhost:9999/api/notifications/${CPF}`);
    console.log('Clear realizado!');
    
    const res3 = await axios.get(`http://localhost:9999/api/notifications/${CPF}`);
    const userNotifs = res3.data.filter((n: any) => n.userCpf === CPF);
    const globalRemain = res3.data.filter((n: any) => n.userCpf === '__GLOBAL__');
    
    console.log('Notificações do usuário após clear:', userNotifs.length);
    console.log('Notificações globais restantes:', globalRemain.length);
    
    if (userNotifs.length === 0 && globalRemain.length > 0) {
      console.log('SUCESSO: Clear funcionou corretamente (apenas usuário apagado)');
    } else {
      console.log('FALHA: Comportamento inesperado do clear');
    }
    
  } catch (e: any) {
    console.error('Erro no teste:', e.message);
  }
}

testNotifications();
