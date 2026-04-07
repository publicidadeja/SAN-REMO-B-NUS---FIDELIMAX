
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function testEndpoints() {
  const setting = await prisma.setting.findUnique({ where: { key: 'fidelimax_api_key' } });
  const apiKey = setting?.value;

  if (!apiKey) {
    console.log('API Key não encontrada no banco de dados.');
    return;
  }

  console.log('Testando endpoints Fidelimax com API Key:', apiKey.substring(0, 5) + '...');

  const endpoints = [
    '/Integracao/RelatorioConsumidores',
    '/Integracao/RelatorioGeral',
    '/Integracao/DadosEmpresa',
    '/Integracao/ListaConsumidores',
    '/Integracao/TotalConsumidores',
    '/Integracao/InformacoesEmpresa'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\nTestando: ${endpoint}`);
      const response = await axios.post(`https://api.fidelimax.com.br/api${endpoint}`, {}, {
        headers: { 'AuthToken': apiKey, 'Content-Type': 'application/json' }
      });
      console.log(`Sucesso! Status: ${response.status}`);
      console.log('Amostra de Dados:', JSON.stringify(response.data).substring(0, 200));
    } catch (e: any) {
      console.log(`Erro em ${endpoint}: ${e.response?.status} - ${e.response?.data?.MensagemErro || e.message}`);
    }
  }
  
  await prisma.$disconnect();
}

testEndpoints();
