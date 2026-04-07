
import axios from 'axios';

async function testSystemStats() {
  try {
    console.log('Testando: /api/admin/system-stats');
    const response = await axios.get('http://localhost:9999/api/admin/system-stats');
    console.log('Resposta Recebida!');
    console.log('Dados:', JSON.stringify(response.data, null, 2));
  } catch (e: any) {
    console.log('Falha:', e.response?.status, e.response?.data || e.message);
  }
}

testSystemStats();
