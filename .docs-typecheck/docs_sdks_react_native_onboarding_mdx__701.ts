
app.post('/chat', async (req, res) => {
  const { conversation, context } = req.body;

  // Resume if we have a threadId; create a fresh one otherwise
  let threadId = context?.threadId;
  if (!threadId) {
    threadId = await aiService.createThread();
  }

  let replyText;
  try {
    replyText = await aiService.sendMessage(threadId, conversation.user_message);
  } catch (err) {
    // Thread expired or invalid — start fresh and retry once
    if (err.code === 'thread_expired') {
      threadId = await aiService.createThread();
      replyText = await aiService.sendMessage(threadId, conversation.user_message);
    } else {
      throw err;
    }
  }

  res.json({
    action: 'reply',
    messages: [{ content: replyText }],
    data: { threadId },   // round-tripped to every subsequent call
  });
});

export {};
