const fallbackHotels=[
{name:"Taj Holiday Village Resort",city:"Goa",area:"Calangute Beach",price:5499,rating:4.7,amen:"WiFi • Pool • Restaurant • AC"},
{name:"The Himalayan Heights",city:"Manali",area:"Near Mall Road",price:4199,rating:4.5,amen:"WiFi • Parking • Restaurant • Bonfire"},
{name:"Hotel Royal Heritage",city:"Jaipur",area:"City Palace Road",price:3799,rating:4.6,amen:"WiFi • Pool • Restaurant • AC"},
{name:"Kerala Green Palace",city:"Kerala",area:"Alleppey • Backwaters",price:3499,rating:4.4,amen:"WiFi • AC • Restaurant • Spa"},
{name:"Lake View Hotel",city:"Udaipur",area:"Lake Pichola",price:6499,rating:4.8,amen:"WiFi • Pool • Restaurant • AC"},
{name:"Snow Valley Retreat",city:"Shimla",area:"Mall Road",price:3299,rating:4.5,amen:"WiFi • Parking • Restaurant • Heater"}
];

let hotels = [];
const grid=document.querySelector("#hotelGrid"), count=document.querySelector("#resultCount");
function render(list=hotels, searched=false){
 count.textContent=searched ? `${list.length} stays` : "Choose a destination to search";
 if (!list.length) { grid.innerHTML=`<div class="empty-results"><strong>${searched ? "Hotels are coming soon in this destination." : "Find stays in your destination"}</strong><p>${searched ? "We are currently adding verified stays for this city. Please try another destination or contact our travel team for personalized options." : "Enter an Indian city above and search to see available hotels and room categories."}</p>${searched ? '<a href="tel:+917440580498">Contact travel support</a>' : ''}</div>`; return; }
 grid.innerHTML=list.map((h,i)=>`<article class="hotel">
 <div class="hotel-img" style="${h.image ? `background-image:url('${h.image}');background-size:cover;background-position:center` : `background:linear-gradient(135deg,${['#32a7dc,#164b79','#87b8dc,#31516f','#e5a35b,#8b352f','#52bda1,#19646b','#6f9bd3,#4f4d6a','#a6cae6,#4c607b'][i%7]})`} "><span class="rating">★ ${h.rating}</span></div>
 <div class="hotel-body"><h3>${h.source === 'google' ? h.name : `<a class="hotel-link" href="hotel.html?id=${h.id}">${h.name}</a>`}</h3><div class="meta">📍 ${h.city} | ${h.area}</div><div class="amen">${h.category ? h.category + ' · ' : ''}${h.amenities || h.amen}</div><div class="price">${h.source === 'google' || !h.price ? 'Tariff on request' : `₹ ${h.price.toLocaleString('en-IN')} <small>/ night</small>`}</div>
 <div class="actions">${h.source === 'google' ? `<a class="book" href="${h.mapsUrl}" target="_blank" rel="noopener">Open in Google Maps</a>` : `<a class="book" href="hotel.html?id=${h.id}">View Rooms & Book</a>`}<button class="enquire" onclick="openEnquiry('${h.name.replace(/'/g, "\\'")}')">WhatsApp</button></div></div></article>`).join("");
}
render([], false);
fetch("/api/featured-hotels").then(response => response.ok ? response.json() : []).then(data => {
 if (data.length) { hotels = data; render(data, true); count.textContent = "Featured stays from major cities"; }
}).catch(() => {});
fetch("/api/cities").then(response => response.ok ? response.json() : []).then(cities => {
 document.querySelector("#cityOptions").innerHTML = cities.map(city => `<option value="${city}"></option>`).join("");
}).catch(() => {});
fetch("/api/settings").then(response => response.ok ? response.json() : {}).then(settings => {
 if (settings.site_name) { document.querySelectorAll(".brand span:nth-child(2)").forEach(item => { item.firstChild.textContent = settings.site_name; }); document.title = settings.site_name; }
 if (settings.hero_title) document.querySelector(".hero h1").innerHTML = settings.hero_title.replace("Across India", "Across <span>India</span>");
 if (settings.hero_copy) document.querySelector(".hero-copy").textContent = settings.hero_copy;
 if (settings.phone) document.querySelectorAll('a[href^="tel:"]').forEach(item => { item.textContent = "☎ " + settings.phone; item.href = "tel:" + settings.phone.replace(/\s/g, ""); });
 if (settings.email) document.querySelectorAll("footer p").forEach(item => { if (item.textContent.includes("info@golocation.in")) item.textContent = "✉ " + settings.email; });
}).catch(() => {});

document.querySelector("#searchForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const d=document.querySelector("#destination").value.trim().toLowerCase();
 const checkin=document.querySelector("#checkin").value, checkout=document.querySelector("#checkout").value;
 if (checkin && checkout && new Date(checkout) <= new Date(checkin)) { alert("Check-out must be after check-in."); return; }
 if (!d) { render([], false); document.querySelector("#hotels").scrollIntoView({behavior:"smooth"}); return; }
 const results=await fetch(`/api/hotels?q=${encodeURIComponent(d)}`).then(response => response.ok ? response.json() : []).catch(() => []);
 hotels=results; render(results, true); document.querySelector("#hotels").scrollIntoView({behavior:"smooth"});
});
document.querySelectorAll(".dest").forEach(b=>b.addEventListener("click",()=>{
 document.querySelector("#destination").value=b.dataset.dest; document.querySelector("#searchForm").dispatchEvent(new Event("submit"));
}));

const modal=document.querySelector("#modal"), content=document.querySelector("#modalContent");
document.querySelector("#closeModal").onclick=()=>modal.classList.add("hidden");
modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.add("hidden")});

window.openBooking=(hotel)=>{
 const name=hotel.name, price=hotel.price;
 content.innerHTML=`<h2>Book ${name}</h2><p>₹ ${price.toLocaleString('en-IN')} / night</p>
 <form class="form" id="bookingForm"><input required name="customerName" placeholder="Full name"><input required name="phone" type="tel" placeholder="Mobile number"><input required name="email" type="email" placeholder="Email"><input required name="checkin" type="date"><input required name="checkout" type="date"><select name="guests"><option>2 Adults, 1 Room</option><option>1 Adult, 1 Room</option><option>4 Adults, 2 Rooms</option></select><textarea name="request" placeholder="Special request (optional)"></textarea><button>Confirm Booking</button><p class="form-message" id="bookingMessage"></p></form>`;
 modal.classList.remove("hidden");
 document.querySelector("#bookingForm").onsubmit=async e=>{
  e.preventDefault();
  const form=e.target, message=document.querySelector("#bookingMessage"), checkin=form.checkin.value, checkout=form.checkout.value;
  if (new Date(checkout) <= new Date(checkin)) { message.textContent="Check-out must be after check-in."; return; }
  const nights=Math.ceil((new Date(checkout)-new Date(checkin))/86400000);
  message.textContent="Saving your booking...";
  try {
   const response=await fetch("/api/bookings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({hotelId:hotel.id,hotelName:name,customerName:form.customerName.value,phone:form.phone.value,email:form.email.value,checkin,checkout,guests:form.guests.value,amount:price*nights,hotelCost:price*nights})});
   const result=await response.json();
   if (!response.ok) throw new Error(result.error || "Unable to create booking.");
   content.innerHTML=`<h2>Booking received</h2><p>Your booking code is <strong>${result.bookingCode}</strong>.</p><p>Our team will confirm availability and payment details with you shortly.</p><button class="book" onclick="modal.classList.add('hidden')">Done</button>`;
  } catch (error) { message.textContent=error.message; }
 };
};
window.openEnquiry=(name)=>{
 content.innerHTML=`<h2>Enquire about ${name}</h2><p>Send your dates and details. GoLocation will confirm availability.</p>
 <form class="form" id="enquiryForm"><input required placeholder="Full name"><input required type="tel" placeholder="WhatsApp number"><input required type="date"><input required type="date"><input placeholder="Number of guests"><textarea placeholder="Your enquiry"></textarea><button>Send Enquiry on WhatsApp</button></form>`;
 modal.classList.remove("hidden");
 document.querySelector("#enquiryForm").onsubmit=e=>{e.preventDefault(); const phone="917440580498"; const text=encodeURIComponent(`Hotel enquiry: ${name}\nName: ${e.target[0].value}\nWhatsApp: ${e.target[1].value}\nDates: ${e.target[2].value} to ${e.target[3].value}`); window.open(`https://wa.me/${phone}?text=${text}`,"_blank");};
};
