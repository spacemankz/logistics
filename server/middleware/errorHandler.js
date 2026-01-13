/**
 * Обработчик ошибок без утечки информации
 */
const errorHandler = (err, req, res, next) => {
  // Логируем полную ошибку на сервере
  console.error('Ошибка:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Определяем статус код
  const statusCode = err.statusCode || err.status || 500;

  // Формируем безопасный ответ (не раскрываем детали в продакшене)
  const response = {
    message: statusCode === 500 
      ? 'Внутренняя ошибка сервера' 
      : err.message || 'Произошла ошибка',
    ...(process.env.NODE_ENV === 'development' && {
      error: err.message,
      stack: err.stack
    })
  };

  // Специальная обработка для известных типов ошибок
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Ошибка валидации данных',
      errors: err.errors || []
    });
  }

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      message: 'Ошибка валидации данных',
      errors: err.errors ? err.errors.map(e => ({
        field: e.path,
        message: e.message
      })) : []
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      message: 'Запись с такими данными уже существует'
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Недействительный токен'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Токен истек'
    });
  }

  res.status(statusCode).json(response);
};

/**
 * Обработчик 404 ошибок
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    message: 'Ресурс не найден'
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
