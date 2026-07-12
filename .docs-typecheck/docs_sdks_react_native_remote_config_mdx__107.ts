
const welcome = await TypedRemoteConfig.getString('welcome_message', 'Hello!');
const retries = await TypedRemoteConfig.getInt('max_retries', 3);

export {};
