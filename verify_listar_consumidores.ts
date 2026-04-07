
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function verifyListarConsumidores() {
  const setting = await prisma.setting.findUnique({ where: { key: 'fidelimax_api_key' } });
  const apiKey = setting?.value;

  if (!apiKey) {
    console.log('API Key não encontrada.');
    return;
  }

  try {
    console.log('Testando: /Integracao/ListarConsumidores');
    const response = await axios.post('https://api.fidelimax.com.br/api/Integracao/ListarConsumidores', {
      novos: true,
      skip: 0,
      take: 1
    }, {
      headers: { 'AuthToken': apiKey, 'Content-Type': 'application/json' }
    });
    console.log('Resposta Recebida!');
    console.log('Status:', response.status);
    console.log('Total de Consumidores:', response.data.total);
    console.log('Corpo da Resposta (parcial):', JSON.stringify(response.data).substring(0, 500));
  } catch (e: any) {
    console.log('Falha:', e.response?.status, e.response?.data);
  }
  
  await prisma.$disconnect();
}

verifyListarConsumidores();
