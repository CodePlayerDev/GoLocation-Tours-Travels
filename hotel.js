const root = document.querySelector("#hotelDetails");
const hotelId = new URLSearchParams(location.search).get("id");
let hotel;

function money(value) { return "₹" + Number(value || 0).toLocaleString("en-IN"); }
function render() {
  const rooms = hotel.rooms || [];
  root.innerHTML = `<section class="hotel-hero"><div class="hotel-photo" style="${hotel.image ? `background-image:url('${hotel.image}')` : ""}"></div><div class="hotel-copy"><p class="eyebrow">${hotel.city} · ${hotel.area || "India"}</p><h1>${hotel.name}</h1><p>${hotel.amenities || "Comfortable stay with modern amenities."}</p><p>Choose your preferred room category and occupancy below.</p></div></section><section class="room-section"><h2>Room categories</h2><div class="room-grid">${rooms.length ? rooms.map(room => `<article class="room-card" data-room="${room.id}"><h3>${room.name}</h3><p>${room.description || "Comfortable room for your stay."}</p><div class="room-price" data-price>₹${roomTariff(room, 2).toLocaleString('en-IN')} <small>/ night</small></div><label>Occupancy<select class="occupancy" data-room-id="${room.id}"><option value="1">Single guest · ₹${roomTariff(room, 1).toLocaleString('en-IN')}</option><option value="2" selected>Double guest · ₹${roomTariff(room, 2).toLocaleString('en-IN')}</option><option value="3">Triple guest · ₹${roomTariff(room, 3).toLocaleString('en-IN')}</option></select></label><p>${room.amenities || "Standard amenities included"}<br><span class="muted">${room.inventory} rooms available</span></p><button type="button">Select this room</button></article>`).join("") : "<p>No room categories are currently available for this hotel.</p>"}</div><div id="bookingPanel" class="booking-panel"><h2>Complete your booking</h2><p id="selectedRoom"></p><form id="bookingForm"><input required name="customerName" placeholder="Full name"><input required name="phone" type="tel" placeholder="Mobile number"><input required name="email" type="email" placeholder="Email"><label>Check-in<input required name="checkin" type="date"></label><label>Check-out<input required name="checkout" type="date"></label><select name="guests"><option value="2">2 Adults, 1 Room</option><option value="1">1 Adult, 1 Room</option><option value="3">3 Adults, 1 Room</option></select><button class="book" type="submit">Confirm booking</button><p class="booking-message" id="bookingMessage"></p></form></div></section>`;
  document.querySelectorAll(".occupancy").forEach(select => select.addEventListener("change", () => updateRoomPrice(rooms.find(room => room.id === Number(select.dataset.roomId)), select)));
  document.querySelectorAll(".room-card").forEach(card => card.querySelector("button").addEventListener("click", () => selectRoom(rooms.find(room => room.id === Number(card.dataset.room)), card)));
  document.querySelector("#bookingForm")?.addEventListener("submit", submitBooking);
  document.querySelector("#bookingForm [name='guests']")?.addEventListener("change", event => {
    if (!hotel.selectedRoom) return;
    hotel.selectedOccupancy = Number(event.target.value);
    document.querySelector("#selectedRoom").textContent = `${hotel.selectedRoom.name} · ${hotel.selectedOccupancy === 1 ? "Single" : hotel.selectedOccupancy === 3 ? "Triple" : "Double"} occupancy · ${money(roomTariff(hotel.selectedRoom, hotel.selectedOccupancy))} per night`;
  });
}
function roomTariff(room, occupancy) { return Number(occupancy) === 1 ? (room.single_price || room.price) : Number(occupancy) === 3 ? (room.triple_price || room.price) : (room.double_price || room.price); }
function updateRoomPrice(room, select) {
  const occupancy = Number(select.value);
  select.closest(".room-card").querySelector("[data-price]").firstChild.textContent = `₹${roomTariff(room, occupancy).toLocaleString('en-IN')} `;
  if (hotel.selectedRoom?.id === room.id) {
    hotel.selectedOccupancy = occupancy;
    document.querySelector("#bookingForm [name='guests']").value = String(occupancy);
    document.querySelector("#selectedRoom").textContent = `${room.name} · ${occupancy === 1 ? "Single" : occupancy === 3 ? "Triple" : "Double"} occupancy · ${money(roomTariff(room, occupancy))} per night`;
  }
}
function selectRoom(room, card) {
  hotel.selectedRoom = room;
  hotel.selectedOccupancy = Number(card.querySelector(".occupancy").value);
  document.querySelectorAll(".room-card").forEach(item => item.classList.remove("selected"));
  card.classList.add("selected");
  document.querySelector("#bookingPanel").classList.add("visible");
  document.querySelector("#bookingForm [name='guests']").value = String(hotel.selectedOccupancy);
  document.querySelector("#selectedRoom").textContent = `${room.name} · ${hotel.selectedOccupancy === 1 ? "Single" : hotel.selectedOccupancy === 3 ? "Triple" : "Double"} occupancy · ${money(roomTariff(room, hotel.selectedOccupancy))} per night`;
  document.querySelector("#bookingPanel").scrollIntoView({behavior:"smooth", block:"center"});
}
async function submitBooking(event) {
  event.preventDefault();
  if (!hotel.selectedRoom) return;
  const form = event.target, message = document.querySelector("#bookingMessage"), occupancy = Number(form.guests.value), tariff = roomTariff(hotel.selectedRoom, occupancy);
  if (new Date(form.checkout.value) <= new Date(form.checkin.value)) { message.textContent = "Check-out must be after check-in."; return; }
  const nights = Math.ceil((new Date(form.checkout.value) - new Date(form.checkin.value)) / 86400000);
  message.textContent = "Saving your booking...";
  const response = await fetch("/api/bookings", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({hotelId:hotel.id, hotelName:hotel.name, roomId:hotel.selectedRoom.id, roomName:hotel.selectedRoom.name, occupancy, customerName:form.customerName.value, phone:form.phone.value, email:form.email.value, checkin:form.checkin.value, checkout:form.checkout.value, guests:`${occupancy} Adults, 1 Room`, amount:tariff*nights, hotelCost:tariff*nights})});
  const result = await response.json();
  if (!response.ok) { message.textContent = result.error || "Unable to create booking."; return; }
  document.querySelector("#bookingPanel").innerHTML = `<h2>Booking received</h2><p>Your booking code is <strong>${result.bookingCode}</strong>.</p><p>Room: ${hotel.selectedRoom.name}</p>`;
}
if (!hotelId) root.innerHTML = "<p>Hotel not found.</p>";
else fetch(`/api/hotels/${hotelId}`).then(response => { if (!response.ok) throw new Error("Hotel not found"); return response.json(); }).then(data => { hotel = data; document.title = `${hotel.name} | GoLocation`; render(); }).catch(() => { root.innerHTML = "<p>Hotel not found or no longer available.</p>"; });
