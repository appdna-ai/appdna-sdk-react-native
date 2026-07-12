
onOnboardingCompleted(flowId: string, responses: Record<string, unknown>) {
  const formData = responses['location_step'] as Record<string, unknown> | undefined;
  const location = formData?.user_location as Record<string, unknown> | undefined;
  if (location) {
    console.log('City:', location.city);                  // "New York"
    console.log('Country:', location.country_code);       // "US"
    console.log('Timezone:', location.timezone);          // "America/New_York"
    console.log('Coords:', location.latitude, location.longitude);
  }
}

export {};
