const axios = require('axios');
const BITRIX_WEBHOOK_URL = 'https://onacrm.bitrix24.com.br/rest/40/3xxs5dmvbo782ttd/';
const CATEGORY_ID = '18'; // Insira o ID correto do funil

async function fetchStages() {
  try {
    const stages = await axios.get(`${BITRIX_WEBHOOK_URL}crm.dealcategory.stage.list`, {
      params: { id: CATEGORY_ID }
    });
    console.log('Etapas do funil:', stages.data.result);
  } catch (error) {
    console.error('Erro ao buscar etapas:', error.message);
  }
}

fetchStages();