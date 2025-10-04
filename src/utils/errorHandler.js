// Centralized error handling

module.exports = (err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).send('Internal Server Error');
};