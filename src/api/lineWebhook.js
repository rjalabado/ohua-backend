// Handles incoming LINE webhook events

module.exports = (req, res) => {
    // Parse incoming LINE message
    const lineMessage = req.body;

    // Log the message
    console.log('Received LINE message:', lineMessage);

    // TODO: Add translation and forwarding logic to WeChat

    res.status(200).send('Message received');
};