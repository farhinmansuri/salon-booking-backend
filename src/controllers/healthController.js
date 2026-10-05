function getHealth(_req, res) {
  res.status(200).json({
    status: 'ok',
    message: 'Salon booking API is running',
  });
}

module.exports = { getHealth };
