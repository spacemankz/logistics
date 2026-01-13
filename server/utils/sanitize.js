const validator = require('validator');

/**
 * Санитизация строки - удаление опасных символов
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  // Удаляем HTML теги
  let sanitized = validator.escape(str);
  
  // Удаляем потенциально опасные символы для SQL (хотя Sequelize защищает, но на всякий случай)
  sanitized = sanitized.replace(/['";\\]/g, '');
  
  // Обрезаем до разумной длины
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }
  
  return sanitized.trim();
};

/**
 * Санитизация объекта рекурсивно
 */
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Санитизируем ключ
        const sanitizedKey = sanitizeString(key);
        sanitized[sanitizedKey] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
};

/**
 * Валидация и санитизация email
 */
const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') return null;
  
  const normalized = email.toLowerCase().trim();
  
  if (!validator.isEmail(normalized)) {
    return null;
  }
  
  // Ограничиваем длину email
  if (normalized.length > 254) {
    return null;
  }
  
  return normalized;
};

/**
 * Валидация и санитизация номера телефона
 */
const sanitizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return null;
  
  // Удаляем все кроме цифр и +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Проверяем формат E.164
  if (!/^\+?[1-9]\d{1,14}$/.test(cleaned)) {
    return null;
  }
  
  return cleaned;
};

/**
 * Санитизация JSON строки
 */
const sanitizeJSON = (jsonString) => {
  if (!jsonString || typeof jsonString !== 'string') return null;
  
  try {
    const parsed = JSON.parse(jsonString);
    return sanitizeObject(parsed);
  } catch (e) {
    return null;
  }
};

module.exports = {
  sanitizeString,
  sanitizeObject,
  sanitizeEmail,
  sanitizePhone,
  sanitizeJSON
};
