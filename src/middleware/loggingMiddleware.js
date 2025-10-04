// Middleware for logging requests and responses

module.exports = (req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    next();
};