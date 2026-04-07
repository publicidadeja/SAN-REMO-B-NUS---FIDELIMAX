
import axios from 'axios';

async function testUpdateProduct() {
  try {
    // 1. Get current products
    const res = await axios.get('http://localhost:9999/api/activation-products');
    const products = res.data;
    if (products.length === 0) {
      console.log('Nenhum produto para testar update.');
      return;
    }
    
    const targetId = products[0].id;
    console.log(`Testando update no produto ID: ${targetId}`);
    
    // 2. Perform PUT
    const updateData = {
      name: products[0].name + ' (Updated)',
      description: 'Descricao atualizada pelo teste'
    };
    
    const putRes = await axios.put(`http://localhost:9999/api/admin/activation-products/${targetId}`, updateData);
    
    if (putRes.data.name.includes('(Updated)')) {
      console.log('SUCESSO: Produto atualizado corretamente!');
      console.log('Novo nome:', putRes.data.name);
    } else {
      console.log('FALHA: O produto não foi atualizado como esperado.');
    }
  } catch (e: any) {
    console.error('Erro no teste de update:', e.message);
    if (e.response) {
      console.error('Detalhes:', e.response.status, e.response.data);
    }
  }
}

testUpdateProduct();
