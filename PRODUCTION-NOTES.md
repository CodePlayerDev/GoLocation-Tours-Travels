# GoLocation — V2 production roadmap

This version adds a real server/database foundation.

## Run
1. Install Node.js 18+.
2. In this folder run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:3000/`.
5. Admin: `http://localhost:3000/admin.html`.

## Important before public launch
- Add admin authentication and role-based access.
- Put secrets in environment variables.
- Connect a production payment gateway and verify webhooks server-side.
- Add real hotel contracts/inventory or a legitimate hotel inventory provider.
- Implement room availability, taxes, cancellation/refund rules and booking expiry.
- Add email/SMS/WhatsApp transactional confirmations.
- Add HTTPS, rate limiting, logging, backups and monitoring.
- Replace demo contact information and sample hotel data.
- Add legal business details, privacy policy, terms, cancellation/refund policy and applicable tax/invoice information.
- Do not accept customer payments until the booking supply, refund process and payment/webhook flow are tested end-to-end.
