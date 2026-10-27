function errorHandler(err, req, res, next) {
  console.error('[ERREUR]', err.message);
  const statut = err.statutCode || 500;
  res.status(statut).json({
    message: err.message || 'Erreur interne du serveur.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
