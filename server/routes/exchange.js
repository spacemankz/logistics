const express = require('express');
const router = express.Router();
const https = require('https');

// Получение курсов валют от Национального банка РК
router.get('/rates', async (req, res) => {
  try {
    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    
    // Запрос к НБ РК через сервер (обход CORS)
    const url = `https://nationalbank.kz/rss/get_rates.cfm?fdate=${dateStr}`;
    
    const rates = await new Promise((resolve, reject) => {
      https.get(url, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            // Простой парсинг XML через регулярные выражения
            const rates = {};
            
            // Ищем все элементы <item>
            const itemRegex = /<item>([\s\S]*?)<\/item>/g;
            let match;
            
            while ((match = itemRegex.exec(data)) !== null) {
              const itemContent = match[1];
              
              // Извлекаем title и description
              const titleMatch = itemContent.match(/<title>(.*?)<\/title>/);
              const descMatch = itemContent.match(/<description>(.*?)<\/description>/);
              
              if (titleMatch && descMatch) {
                const title = titleMatch[1];
                const description = descMatch[1];
                
                // Парсим курс
                const rateValue = parseFloat(description.replace(/[^\d.,]/g, '').replace(',', '.'));
                
                if (title.includes('USD') && !rates.USD) {
                  rates.USD = rateValue;
                } else if (title.includes('EUR') && !rates.EUR) {
                  rates.EUR = rateValue;
                } else if (title.includes('RUB') && !rates.RUB) {
                  rates.RUB = rateValue;
                } else if ((title.includes('CNY') || title.includes('RMB')) && !rates.CNY) {
                  rates.CNY = rateValue;
                }
              }
            }
            
            resolve(rates);
          } catch (parseError) {
            reject(parseError);
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
    
    // Проверяем, что получили хотя бы один курс
    if (Object.keys(rates).length === 0) {
      throw new Error('Не удалось получить курсы валют');
    }
    
    res.json({
      success: true,
      rates: rates,
      date: dateStr,
      source: 'NBK'
    });
    
  } catch (error) {
    console.error('Ошибка получения курсов с НБ РК:', error);
    
    // Fallback: используем альтернативный источник
    try {
      // Используем https модуль для запроса к альтернативному API
      const altData = await new Promise((resolve, reject) => {
        https.get('https://api.exchangerate-api.com/v4/latest/KZT', (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        }).on('error', reject);
      });
      
      // Инвертируем курсы (из KZT в другие валюты)
      const rates = {
        USD: parseFloat((1 / altData.rates.USD).toFixed(2)),
        EUR: parseFloat((1 / altData.rates.EUR).toFixed(2)),
        RUB: parseFloat((1 / altData.rates.RUB).toFixed(2)),
        CNY: parseFloat((1 / altData.rates.CNY).toFixed(2))
      };
      
      res.json({
        success: true,
        rates: rates,
        date: new Date().toISOString().split('T')[0],
        source: 'exchangerate-api'
      });
    } catch (fallbackError) {
      console.error('Ошибка получения курсов с альтернативного источника:', fallbackError);
      res.status(500).json({
        success: false,
        message: 'Не удалось получить курсы валют'
      });
    }
  }
});

module.exports = router;
