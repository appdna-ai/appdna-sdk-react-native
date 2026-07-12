
case 'reset_password': {
  const email = ((responses[fromStepId] as Record<string, unknown>)?.email as string) ?? '';
  try {
    await myAuthBackend.sendPasswordReset({ to: email });
    return { type: 'stay', message: `Reset email sent to ${email}` };
  } catch {
    return { type: 'block', message: "Couldn't send reset email. Please try again." };
  }
}

export {};
