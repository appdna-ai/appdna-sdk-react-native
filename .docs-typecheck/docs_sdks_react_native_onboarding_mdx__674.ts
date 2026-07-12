
app.post('/chat', async (req, res) => {
  const { conversation } = req.body;
  const userMessage = conversation.user_message;

  const replyText = await myLLM.complete(userMessage);

  res.json({
    action: 'reply',
    messages: [{ content: replyText }],
  });
});

export {};
