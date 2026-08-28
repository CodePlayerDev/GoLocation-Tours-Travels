# GoLocation Tours & Travels — Hotel Booking MVP

This is a local hotel booking application for an India-only travel agency, with a browser frontend, SQLite database, and admin console.

## Included
- Responsive homepage
- Destination search
- Hotel cards and filtering
- Booking form with server-side persistence and booking code
- Admin hotel CRUD, image replacement/removal, room-category CRUD, and website content settings
- WhatsApp enquiry flow
- Trust/benefits section
- Contact/footer sections
- Generated homepage reference image in `assets/`

## Run locally
1. Install Node.js 18+.
2. Run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:3000/`.
5. Open `http://localhost:3000/admin.html` for the admin console.

Guests select **View Rooms & Book** on any hotel to open its room-category page. Room tariffs, capacity, availability, and amenities are managed from the admin console.

### Google hotel search

To enrich any city search with Google Places hotel listings, set `GOOGLE_PLACES_API_KEY` in the environment before running `npm start`. Enable Places API (New) and billing in Google Cloud. Google listings link to Maps for their current tariff; only hotels added through the admin panel have local room categories and booking inventory.

### Default admin login

- Username: `admin`
- Password: `admin123`

Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables before launch to change them.

## Production next steps
1. Buy/connect the final domain and business email.
2. Replace sample hotels with your actual contracted/partner inventory.
3. Connect and verify a real payment gateway and webhook flow.
4. Add transactional email/SMS/WhatsApp confirmations.
5. Add legal business details, GST/invoice setup, terms, privacy and cancellation/refund policies.
6. Add hotel inventory/API integration only after validating demand and partner contracts.
