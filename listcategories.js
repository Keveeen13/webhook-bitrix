const axios = require('axios');
const BITRIX_WEBHOOK_URL = 'https://onacrm.bitrix24.com.br/rest/40/3xxs5dmvbo782ttd/';

async function fetchCategoriesAndStages() {
  try {
    // Lista os funis
    const categories = await axios.get(`${BITRIX_WEBHOOK_URL}crm.dealcategory.list`);
    console.log('Funis disponíveis:', categories.data.result);

    // Lista as etapas de um funil específico
    const stages = await axios.get(`${BITRIX_WEBHOOK_URL}crm.stage.list`, {
      params: {
        filter: { ENTITY_ID: `DEAL_STAGE_${CATEGORY_ID}` } // Substitua por um `CATEGORY_ID` conhecido
      }
    });
    console.log('Etapas disponíveis:', stages.data.result);
  } catch (error) {
    console.error('Erro ao buscar funis ou etapas:', error);
  }
}

fetchCategoriesAndStages();