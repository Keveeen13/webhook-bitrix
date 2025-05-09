const axios = require('axios');
const { google } = require('googleapis');
const sheets = google.sheets('v4');
const fs = require('fs');
const express = require('express');
const app = express();

require('dotenv').config();
console.log('GOOGLE_KEY_FILE:', process.env.GOOGLE_KEY_FILE);
console.log('GOOGLE_CLIENT_EMAIL:', process.env.GOOGLE_CLIENT_EMAIL);
console.log('GOOGLE_SCOPES:', process.env.GOOGLE_SCOPES);
console.log('Caminho do arquivo JSON:', process.env.GOOGLE_KEY_FILE);

app.use(express.json());

// Configurações Bitrix24
const BITRIX_WEBHOOK_URL = process.env.BITRIX_WEBHOOK_URL; // URL de webhook

// ID do Funil e da Etapa
const CATEGORY_ID = 18; // ID do funil específico
const STAGE_ID = 'C18:NEW'; // ID da etapa específica no funil

// Configurações Google Sheets
const SPREADSHEET_ID = process.env.SPREADSHEET_ID; // ID da planilha
const GOOGLE_SHEET_RANGE = 'Sheets1!A2'; // Nome da sua aba e intervalo desejado

// Autenticação do Google Sheets
async function authenticateGoogle() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_KEY_FILE.replace(/\\n/g, '\n'), // Caminho do arquivo de credenciais JSON
    scopes: [process.env.GOOGLE_SCOPES], // Auth da Google
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
  });
  return await auth.getClient();
}

// Função para buscar o nome da etapa do funil no Bitrix24
async function fetchStagesFromBitrix() {
  try {
    const response = await axios.get(`${BITRIX_WEBHOOK_URL}crm.dealcategory.stage.list`, {
      params: {
        id: CATEGORY_ID, // Filtra pelo funil específico
      },
    });
    return response.data.result;
  } catch (error) {
    console.error('Erro ao buscar etapas do Bitrix24:', error);
    return [];
  }
}

// Função para buscar os dados dos negócios no Bitrix24
async function fetchDealsFromBitrix() {
  let allDeals = [];
  let start = 0;

  try {
    while (true) {
      const response = await axios.get(`${BITRIX_WEBHOOK_URL}crm.deal.list`, {
        params: {
          filter: {
            CATEGORY_ID: CATEGORY_ID, // Filtra pelo funil específico
            STAGE_ID: STAGE_ID, // Filtra pela etapa específica no funil
          }, // Filtra pelo funil específico
          start,
        },
      });

      const deals = response.data.result;
      allDeals = allDeals.concat(deals);

      if (!response.data.next) break; // Verifica se há mais páginas
      start = response.data.next;
    }

    return allDeals;
  } catch (error) {
    console.error('Erro ao buscar dados do Bitrix24:', error);
    return [];
  }
}

// Função para buscar os nomes dos funis no Bitrix24
async function fetchFunnelsFromBitrix() {
  try {
    const response = await axios.get(`${BITRIX_WEBHOOK_URL}crm.dealcategory.list`);
    return response.data.result;
  } catch (error) {
    console.error('Erro ao buscar os funis do Bitrix24:', error);
    return [];
  }
}

// Função para buscar detalhes do contato a partir do ID
async function fetchContactDetails(contactId) {
  if (!contactId) return {};
  try {
    const response = await axios.get(`${BITRIX_WEBHOOK_URL}crm.contact.get`, {
      params: { id: contactId },
    });
    const contact = response.data.result;
    return {
      name: contact.NAME || '',
      phone: contact.PHONE?.[0]?.VALUE || '',
      email: contact.EMAIL?.[0]?.VALUE || '',
      customField1: contact['UF_CRM_CONTACT_1726407298243'] || '', // Código do campo personalizado
      customField2: contact['UF_CRM_CONTACT_1726407282252'] || '', // Código do campo personalizado
    };
  } catch (error) {
    console.error(`Erro ao buscar contato ${contactId}:`, error);
    return {};
  }
}

// Função para atualizar o Google Sheets com dados dos negócios
async function updateGoogleSheet(auth, deals, stages, funnels) {
  const stageMap = stages.reduce((map, stage) => {
    map[stage.STATUS_ID] = stage.NAME;
    return map;
  }, {});
  
  const funnelMap = funnels.reduce((map, funnel) => {
    map[funnel.ID] = funnel.NAME;
    return map;
  }, {});

  // Ordenar os negócios pelo ID em ordem crescente
  deals.sort((a, b) => parseInt(a.ID) - parseInt(b.ID));

  const values = [];

  for (const deal of deals) {
    const contactDetails = await fetchContactDetails(deal.CONTACT_ID);
    values.push([
      deal.ID || 'Sem ID',
      contactDetails.name || 'Sem Nome',
      contactDetails.phone || 'Sem Telefone',
      contactDetails.email || 'Sem E-mail',
      contactDetails.customField1 || 'Campo vazio',
      contactDetails.customField2 || 'Campo vazio',
      deal.TITLE || 'Sem Título',
      stageMap[deal.STAGE_ID] || 'Sem Etapa',
      funnelMap[deal.CATEGORY_ID] || 'Sem Funil',
      deal.OPPORTUNITY || '0',
    ]);
  }

  const request = {
    spreadsheetId: SPREADSHEET_ID,
    range: GOOGLE_SHEET_RANGE,
    valueInputOption: 'RAW',
    resource: { values },
    auth,
  };

  try {
    await sheets.spreadsheets.values.update(request);
    console.log('Dados enviados para o Google Sheets com sucesso.');
  } catch (error) {
    console.error('Erro ao atualizar o Google Sheets:', error);
  }
}

// Função principal para executar o webhook
async function main() {
  const auth = await authenticateGoogle();
  const deals = await fetchDealsFromBitrix();
  const stages = await fetchStagesFromBitrix();
  const funnels = await fetchFunnelsFromBitrix();

  if (deals.length) {
    await updateGoogleSheet(auth, deals, stages, funnels);
  } else {
    console.log('Nenhum negócio encontrado no Bitrix24.');
  }
}

// Endpoint para receber as notificações do Bitrix24
app.post('/webhook', async (req, res) => {
  try {
    console.log('Notificação recebida do Bitrix24:', req.body);

    // Reexecuta a função para atualizar o Google Sheets
    await main();
    res.status(200).send('Google Sheets atualizado com sucesso.');
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).send('Erro ao atualizar o Google Sheets');
  }
});

// Inicia o servidor na porta 3000
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});