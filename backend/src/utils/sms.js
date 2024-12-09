const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

const sendSMS = async (to, text) => {
  if (!TWILIO_ACCOUNT_SID) {
    console.log(`Twilio account not set. Skip send SMS '${text}' to ${to}`);
    return {success: true, message: 'Skip SMS because Twilio account not set'};
  }
  try {
    const message = await client.messages.create({
      body: text,
      from: TWILIO_PHONE_NUMBER,
      to: `+${to}`,
    });
    console.log(`SMS sent to ${to}:`, message);
    return {success: true, message: 'SMS sent'};
  } catch (error) {
    console.error(error);
    return {success: false, message: 'Failed to send SMS', error};
  }
};

module.exports = { sendSMS };
