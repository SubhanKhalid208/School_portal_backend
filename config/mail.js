import { Resend } from 'resend';

// Resend ko API Key ke sath initialize karein
export const resend = new Resend(process.env.RESEND_API_KEY);

console.log('🚀 Lahore Portal: Resend Email System Initialized.');