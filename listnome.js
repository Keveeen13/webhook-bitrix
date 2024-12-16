const axios = require('axios');
const BITRIX_WEBHOOK_URL = 'https://onacrm.bitrix24.com.br/rest/40/3xxs5dmvbo782ttd/';
const CATEGORY_ID = '18'; // Substitua pelo ID do seu funil específico
const STAGE_ID = 'C18:NEW'; // Substitua pelo ID da etapa específica que você quer buscar

// Função para buscar negócios com base em um funil e uma etapa
async function fetchDeals() {
  try {
    // 1. Buscar negócios filtrando pelo CATEGORY_ID e STAGE_ID
    const dealsResponse = await axios.get(`${BITRIX_WEBHOOK_URL}crm.deal.list`, {
      params: {
        filter: {
          CATEGORY_ID: CATEGORY_ID,
          STAGE_ID: STAGE_ID,
        }
      }
    });
    const deals = dealsResponse.data.result;

    if (deals.length === 0) {
      console.log("Nenhum negócio encontrado para a etapa especificada.");
      return;
    }

    // 2. Buscar todas as etapas do funil específico para associar nome à etapa
    const stagesResponse = await axios.get(`${BITRIX_WEBHOOK_URL}crm.dealcategory.stage.list`, {
      params: {
        id: CATEGORY_ID
      }
    });
    const stages = stagesResponse.data.result;

    // 3. Encontrar o nome da etapa correspondente ao STAGE_ID
    const stageInfo = stages.find(stage => stage.STATUS_ID === STAGE_ID);
    const stageName = stageInfo ? stageInfo.NAME : 'Nome da etapa não encontrado';

    // 4. Exibir os negócios e o nome da etapa
    deals.forEach(deal => {
      console.log(`Negócio: ${deal.TITLE}`);
      console.log(`Etapa: ${stageName}`);
      console.log('---');
    });

  } catch (error) {
    console.error("Erro ao buscar negócios ou etapas:", error.message);
  }
}

fetchDeals();